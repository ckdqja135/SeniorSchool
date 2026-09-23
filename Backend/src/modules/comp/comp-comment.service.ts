// Backend/service/compCommentService.js의 Prisma 포팅
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class CompCommentService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * 회사 댓글 조회
     */
    async getComments(boardIdx: string) {
        return await this.prisma.compComment.findMany({
            where: { boardIdx: Number(boardIdx) },
            select: {
                commentIdx: true,
                boardIdx: true,
                commentLike: true,
                commentDepth: true,
                writerId: true,
                commentParent: true,
                commentContent: true,
                regDate: true,
                modDate: true,
            }
        });
    }

    /**
     * 회사 댓글 작성
     */
    async insertComment(commentData: any) {
        try {
            const now = new Date();
            // 댓글 생성
            const comment = await this.prisma.compComment.create({
                data: {
                    boardIdx: commentData.boardIdx,
                    commentDepth: commentData.depth,
                    writerId: commentData.commentWriter,
                    writerPw: hashPassword(commentData.commentPw), // SHA256 암호화 적용
                    commentParent: commentData.parentIdx,
                    commentContent: commentData.commentContent,
                    commentLike: commentData.commentLike,
                    regDate: now,
                    modDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
                }
            });

            logger.info(`[insertComment] Transaction committed. Comment inserted successfully. CommentId: ${comment.commentIdx}`);
            return 'Comment inserted successfully';
        } catch (error) {
            logger.error(`[insertComment] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 회사 댓글 수정
     */
    async modifyComment(commentData: { commentPw: string; commentIdx: number; commentContent: string }) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 비밀번호 검증
                const comment = await tx.compComment.findFirst({
                    where: { commentIdx: Number(commentData.commentIdx) }
                });

                if (!comment) {
                    logger.warn(`[modifyComment] Comment not found: ${commentData.commentIdx}`);
                    return false;
                }

                // 입력된 비밀번호와 저장된 비밀번호 비교
                const hashedInputPassword = hashPassword(commentData.commentPw);
                if (comment.writerPw !== hashedInputPassword) {
                    logger.warn(`[modifyComment] Password mismatch for comment: ${commentData.commentIdx}`);
                    return false;
                }

                // 댓글 수정
                const now = new Date();
                await tx.compComment.updateMany({
                    where: { commentIdx: Number(commentData.commentIdx) },
                    data: {
                        commentContent: commentData.commentContent,
                        modDate: now
                    }
                });

                logger.info(`[modifyComment] Comment updated successfully. CommentId: ${commentData.commentIdx}`);
                return true;
            });
        } catch (error) {
            logger.error(`[modifyComment] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 회사 댓글 삭제
     */
    async deleteComment(commentData: { commentPw: string; commentIdx: number }) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 비밀번호 검증
                const comment = await tx.compComment.findFirst({
                    where: { commentIdx: Number(commentData.commentIdx) }
                });

                if (!comment) {
                    logger.warn(`[deleteComment] Comment not found: ${commentData.commentIdx}`);
                    return false;
                }

                // 입력된 비밀번호와 저장된 비밀번호 비교
                const hashedInputPassword = hashPassword(commentData.commentPw);
                if (comment.writerPw !== hashedInputPassword) {
                    logger.warn(`[deleteComment] Password mismatch for comment: ${commentData.commentIdx}`);
                    return false;
                }

                // 댓글 삭제
                await tx.compComment.deleteMany({
                    where: { commentIdx: Number(commentData.commentIdx) }
                });

                logger.info(`[deleteComment] Comment deleted successfully. CommentId: ${commentData.commentIdx}`);
                return true;
            });
        } catch (error) {
            logger.error(`[deleteComment] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }
}
