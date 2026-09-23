// Backend/service/restaurantCommentService.js의 Prisma 포팅.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class RestaurantCommentService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * 식당 댓글 조회
     */
    async getRestaurantComments(boardIdx: string) {
        return await this.prisma.restaurantComment.findMany({
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
            },
        });
    }

    /**
     * 식당 댓글 작성
     */
    async insertRestaurantComment(commentData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const now = new Date();

                // commentParent 처리
                let commentParent = commentData.commentParent;

                // 일반 댓글인 경우 (commentParent가 없으면) 해당 게시글의 최근 댓글 인덱스 + 1 설정
                if (commentParent === null || commentParent === undefined) {
                    const latestComment = await tx.restaurantComment.findFirst({
                        where: { boardIdx: commentData.boardIdx },
                        orderBy: { commentIdx: 'desc' },
                        select: { commentIdx: true },
                    });

                    if (latestComment && latestComment.commentIdx) {
                        commentParent = Number(latestComment.commentIdx) + 1;
                    } else {
                        // 댓글이 하나도 없는 경우 1로 설정
                        commentParent = 1;
                    }
                }

                // 댓글 생성
                const comment = await tx.restaurantComment.create({
                    data: {
                        boardIdx: commentData.boardIdx,
                        commentDepth: commentData.commentDepth || 0,
                        writerId: commentData.writerId,
                        writerPw: hashPassword(commentData.writerPw), // SHA256 암호화 적용
                        commentParent: commentParent,
                        commentContent: commentData.commentContent,
                        commentLike: 0,
                        regDate: now,
                        modDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
                    },
                });

                logger.info(`[insertRestaurantComment] Comment created successfully. CommentIdx: ${comment.commentIdx}, BoardIdx: ${commentData.boardIdx}, CommentParent: ${commentParent}`);
                return '식당 댓글이 성공적으로 작성되었습니다.';
            });
        } catch (error) {
            logger.error(`[insertRestaurantComment] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 식당 댓글 수정
     */
    async modifyRestaurantComment(commentData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const { commentIdx, commentWriter, commentPw, commentContent } = commentData;

                // 필수 필드 검증
                if (!commentIdx || !commentWriter || !commentPw) {
                    throw new Error('필수 입력값이 누락되었습니다.');
                }

                // 기존 댓글 조회 및 작성자 확인
                const existingComment = await tx.restaurantComment.findFirst({
                    where: {
                        commentIdx: Number(commentIdx),
                        writerId: commentWriter,
                        writerPw: hashPassword(commentPw), // SHA256 암호화된 비밀번호로 비교
                    },
                });

                if (!existingComment) {
                    throw new Error('댓글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                // 댓글 수정
                const updateData: Record<string, any> = {
                    modDate: new Date(), // 수정일 업데이트
                };
                if (commentContent) {
                    updateData.commentContent = commentContent;
                }

                await tx.restaurantComment.updateMany({
                    where: { commentIdx: Number(commentIdx) },
                    data: updateData,
                });

                logger.info(`[modifyRestaurantComment] Comment modified successfully. CommentIdx: ${commentIdx}`);
                return '식당 댓글이 성공적으로 수정되었습니다.';
            });
        } catch (error) {
            logger.error(`[modifyRestaurantComment] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 식당 댓글 삭제
     */
    async deleteRestaurantComment(commentData: any) {
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
                    writerPw: hashPassword(commentPw), // SHA256 암호화된 비밀번호로 비교
                };

                if (commentWriter) {
                    whereCondition.writerId = commentWriter;
                }

                // 작성자 확인 후 삭제
                const deleteResult = await tx.restaurantComment.deleteMany({ where: whereCondition });

                if (deleteResult.count === 0) {
                    throw new Error('댓글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                logger.info(`[deleteRestaurantComment] Comment deleted successfully. CommentIdx: ${commentIdx}`);
                return '식당 댓글이 성공적으로 삭제되었습니다.';
            });
        } catch (error) {
            logger.error(`[deleteRestaurantComment] Error: ${error.message}`);
            throw error;
        }
    }
}
