// Backend/service/commentService.js의 Prisma 포팅 (레거시 호환 /comment).
// univCommentService와 동일한 tb_univcomment 테이블/동작 — 응답 형태 동일.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class CommentService {
    constructor(private readonly prisma: PrismaService) {}

    // 댓글 조회 (attributes 순서 = 원본 select 순서)
    async getComments(boardIdx: string) {
        return await this.prisma.univComment.findMany({
            where: { boardIdx: Number(boardIdx) },
            select: {
                commentIdx: true,
                boardIdx: true,
                commentLike: true,
                commentDepth: true,
                writerId: true,
                commentPerent: true,
                commentContent: true,
                regDate: true,
                modDate: true,
            }
        });
    }

    // 댓글 작성
    async insertComment(commentData: any) {
        try {
            const now = new Date();
            const comment = await this.prisma.univComment.create({
                data: {
                    boardIdx: commentData.boardIdx,
                    commentDepth: commentData.depth,
                    writerId: commentData.commentWriter,
                    writerPw: hashPassword(commentData.commentPw), // SHA256 암호화 적용
                    commentPerent: commentData.parentIdx,
                    commentContent: commentData.commentContent,
                    commentLike: commentData.commentLike,
                    regDate: now,
                    modDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
                }
            });

            logger.info(`[insertComment] Comment inserted successfully. CommentId: ${comment.commentIdx}`);
            return 'Comment inserted successfully';
        } catch (error) {
            logger.error(`[insertComment] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    // 댓글 수정 — writerPw 해시 일치 시에만 수정
    async modifyComment(commentData: { commentPw: string; commentIdx: number; commentContent: string }) {
        try {
            const result = await this.prisma.univComment.updateMany({
                where: {
                    commentIdx: Number(commentData.commentIdx),
                    writerPw: hashPassword(commentData.commentPw), // SHA256 암호화 적용
                },
                data: {
                    commentContent: commentData.commentContent,
                    modDate: new Date() // 수정일 업데이트
                }
            });

            if (result.count > 0) {
                logger.info(`[modifyComment] Comment updated successfully. CommentIdx: ${commentData.commentIdx}`);
                return true;
            } else {
                logger.warn(`[modifyComment] No matching comment found. CommentIdx: ${commentData.commentIdx}`);
                return false;
            }
        } catch (error) {
            logger.error(`[modifyComment] Error: ${error.message}`);
            throw error;
        }
    }

    // 댓글 삭제 — writerPw 해시 일치 행 완전 삭제
    async deleteComment(commentData: { commentPw: string; commentIdx: number }) {
        try {
            const result = await this.prisma.univComment.deleteMany({
                where: {
                    commentIdx: Number(commentData.commentIdx),
                    writerPw: hashPassword(commentData.commentPw), // SHA256 암호화 적용
                }
            });

            if (result.count > 0) {
                logger.info(`[deleteComment] Comment deleted successfully. CommentId: ${commentData.commentIdx}`);
                return true;
            } else {
                logger.warn(`[deleteComment] No matching comment found. CommentId: ${commentData.commentIdx}`);
                return false;
            }
        } catch (error) {
            logger.error(`[deleteComment] Error: ${error.message}`);
            throw error;
        }
    }
}
