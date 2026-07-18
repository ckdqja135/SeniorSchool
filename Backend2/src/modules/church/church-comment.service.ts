// Backend/service/churchCommentService.js의 Prisma 포팅
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class ChurchCommentService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * 교회 댓글 조회
     */
    async getChurchComments(boardIdx: string) {
        return await this.prisma.churchComment.findMany({
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
     * 교회 댓글 작성
     */
    async insertChurchComment(commentData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const now = new Date();
                // 댓글 생성
                const comment = await tx.churchComment.create({
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

                logger.debug(`[insertChurchComment] ChurchComment created. CommentId: ${comment.commentIdx}`);

                logger.info(`[insertChurchComment] Transaction committed. Comment inserted successfully. CommentId: ${comment.commentIdx}`);
                return 'Comment inserted successfully';
            });
        } catch (error) {
            logger.error(`[insertChurchComment] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 교회 댓글 수정
     */
    async modifyChurchComment({ commentPw, commentIdx, commentContent }: { commentPw: string; commentIdx: number; commentContent: string }) {
        try {
            // 댓글 내용 업데이트 (단일 쿼리이므로 트랜잭션 optional)
            const { count: updateCount } = await this.prisma.churchComment.updateMany({
                where: {
                    commentIdx: Number(commentIdx),
                    writerPw: hashPassword(commentPw), // SHA256 암호화 적용
                },
                data: {
                    commentContent: commentContent,
                    modDate: new Date() // 수정일 업데이트
                }
            });

            if (updateCount > 0) {
                logger.info(`[modifyChurchComment] Comment updated successfully. CommentIdx: ${commentIdx}`);
                return true;
            } else {
                logger.warn(`[modifyChurchComment] No matching comment found. CommentIdx: ${commentIdx}`);
                return false;
            }
        } catch (error) {
            logger.error(`[modifyChurchComment] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 교회 댓글 삭제
     */
    async deleteChurchComment({ commentPw, commentIdx }: { commentPw: string; commentIdx: number }) {
        logger.info(`[deleteChurchComment] Start - commentIdx: ${commentIdx}, commentPw: ${commentPw}`);

        try {
            // 댓글을 데이터베이스에서 완전히 삭제
            const { count: deleteCount } = await this.prisma.churchComment.deleteMany({
                where: {
                    commentIdx: Number(commentIdx),
                    writerPw: hashPassword(commentPw), // SHA256 암호화 적용
                }
            });

            if (deleteCount > 0) {
                logger.info(`[deleteChurchComment] Comment deleted successfully. CommentId: ${commentIdx}`);
                return true;
            } else {
                logger.warn(`[deleteChurchComment] No matching comment found. CommentId: ${commentIdx}`);
                return false;
            }
        } catch (error) {
            logger.error(`[deleteChurchComment] Error: ${error.message}`);
            throw error;
        }
    }
}
