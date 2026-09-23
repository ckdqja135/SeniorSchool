// Backend/service/outsourceCommentService.js의 Prisma 포팅
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class OutsourceCommentService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * 외주 댓글 조회
     */
    async getOutsourceComments(boardIdx: string) {
        return await this.prisma.outsourceComment.findMany({
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
     * 외주 댓글 작성
     */
    async insertOutsourceComment(commentData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const now = new Date();
                // 댓글 생성 (프론트엔드 필드명에 맞춰 수정)
                const comment = await tx.outsourceComment.create({
                    data: {
                        boardIdx: Number(commentData.boardIdx),
                        commentDepth: Number(commentData.commentDepth) || 0,
                        writerId: commentData.writerId,
                        writerPw: hashPassword(commentData.writerPw), // SHA256 암호화 적용
                        commentParent: Number(commentData.commentPerent) || 0, // 원본의 'commentPerent' 필드명 유지
                        commentContent: commentData.commentContent,
                        commentLike: 0,
                        regDate: now,
                        modDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
                    }
                });

                logger.info(`[insertOutsourceComment] Comment created successfully. CommentIdx: ${comment.commentIdx}, BoardIdx: ${commentData.boardIdx}`);
                return '외주 댓글이 성공적으로 작성되었습니다.';
            });
        } catch (error) {
            logger.error(`[insertOutsourceComment] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 외주 댓글 수정
     */
    async modifyOutsourceComment(commentData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const { commentIdx, commentWriter, commentPw, commentContent } = commentData;

                // 필수 필드 검증
                if (!commentIdx || !commentWriter || !commentPw) {
                    throw new Error('필수 입력값이 누락되었습니다.');
                }

                // 기존 댓글 조회 및 작성자 확인
                const existingComment = await tx.outsourceComment.findFirst({
                    where: {
                        commentIdx: Number(commentIdx),
                        writerId: commentWriter,
                        writerPw: hashPassword(commentPw) // SHA256 암호화된 비밀번호로 비교
                    }
                });

                if (!existingComment) {
                    throw new Error('댓글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                // 댓글 수정
                const updateData: Record<string, any> = {
                    modDate: new Date() // 수정일 업데이트
                };
                if (commentContent) {
                    updateData.commentContent = commentContent;
                }

                await tx.outsourceComment.updateMany({
                    where: { commentIdx: Number(commentIdx) },
                    data: updateData
                });

                logger.info(`[modifyOutsourceComment] Comment modified successfully. CommentIdx: ${commentIdx}`);
                return '외주 댓글이 성공적으로 수정되었습니다.';
            });
        } catch (error) {
            logger.error(`[modifyOutsourceComment] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 외주 댓글 삭제
     */
    async deleteOutsourceComment(commentData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const { commentIdx, commentWriter, commentPw } = commentData;

                // 필수 필드 검증 - commentWriter 필수 조건 제거
                if (!commentIdx || !commentPw) {
                    throw new Error('필수 입력값이 누락되었습니다.');
                }

                // commentWriter가 없으면 commentIdx와 비밀번호만으로 삭제
                const whereCondition: Record<string, any> = {
                    commentIdx: Number(commentIdx),
                    writerPw: hashPassword(commentPw) // SHA256 암호화된 비밀번호로 비교
                };

                if (commentWriter) {
                    whereCondition.writerId = commentWriter;
                }

                // 작성자 확인 후 삭제
                const deleteResult = await tx.outsourceComment.deleteMany({
                    where: whereCondition
                });

                if (deleteResult.count === 0) {
                    throw new Error('댓글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                logger.info(`[deleteOutsourceComment] Comment deleted successfully. CommentIdx: ${commentIdx}`);
                return '외주 댓글이 성공적으로 삭제되었습니다.';
            });
        } catch (error) {
            logger.error(`[deleteOutsourceComment] Error: ${error.message}`);
            throw error;
        }
    }
}
