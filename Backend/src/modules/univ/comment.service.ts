// Backend/service/commentService.js의 Prisma 포팅 (레거시 호환 /comment).
// univCommentService와 동일한 tb_univcomment 테이블/동작 — 응답 형태 동일.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashBoardPassword, verifyBoardPassword } from '../../common/utils/hash-password.util';
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
                    writerPw: await hashBoardPassword(commentData.commentPw), // bcrypt(sha256) 로 저장
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
            // 비밀번호는 bcrypt 라 조건으로 걸 수 없다 — 찾아서 확인한 뒤 고친다 (안 맞으면 0건과 같게 처리)
            const target = await this.prisma.univComment.findFirst({ where: { commentIdx: Number(commentData.commentIdx) } });
            const verified = !!target && (await verifyBoardPassword(commentData.commentPw, target.writerPw));
            const result = !verified ? { count: 0 } : await this.prisma.univComment.updateMany({
                where: {
                    commentIdx: Number(commentData.commentIdx),
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
            // 비밀번호는 bcrypt 라 조건으로 걸 수 없다 — 찾아서 확인한 뒤 지운다
            const target = await this.prisma.univComment.findFirst({ where: { commentIdx: Number(commentData.commentIdx) } });
            const verified = !!target && (await verifyBoardPassword(commentData.commentPw, target.writerPw));
            const result = !verified ? { count: 0 } : await this.prisma.univComment.deleteMany({
                where: {
                    commentIdx: Number(commentData.commentIdx),
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
