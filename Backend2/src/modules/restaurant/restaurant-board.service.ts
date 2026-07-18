// Backend/service/restaurantBoardService.js의 Prisma 포팅.
// - 목록/상세는 전체 컬럼 반환(원본 findAll에 attributes 제한 없음 → boardPW 포함).
// - boardRating(DECIMAL) → mapBoard의 formatRating으로 "4.5" 형태 문자열.
// - Sequelize include(JOIN)는 Prisma에 restaurant relation이 없어 별도 조회 + 병합으로 재현
//   (중첩 키 이름은 원본 별칭 'restaurant', 'RestaurantComments' 유지).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardLikeHelperService } from '../../common/services/board-like-helper.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { buildBoardSearchConditions } from '../../common/utils/search-helper.util';
import { logger } from '../../logger/winston.logger';
import { mapBoard, mapRestaurant } from './restaurant.util';

@Injectable()
export class RestaurantBoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardLikeHelper: BoardLikeHelperService,
    ) {}

    async getRestaurantBoards(restaurantIdx: string, searchParams: { id?: string; title?: string; content?: string } = {}) {
        try {
            let whereClause: Record<string, any> = { restaurantIdx: Number(restaurantIdx) };

            // 검색 조건 적용
            const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);

            // 검색 조건 로깅
            if (hasSearchCondition) {
                const { id, title, content } = searchParams;
                if (id && id.trim() !== '') {
                    logger.info(`[getRestaurantBoards] ID search applied: "${id.trim()}" for restaurantIdx: ${restaurantIdx}`);
                }
                if (title && title.trim() !== '') {
                    logger.info(`[getRestaurantBoards] Title search applied: "${title.trim()}" for restaurantIdx: ${restaurantIdx}`);
                }
                if (content && content.trim() !== '') {
                    logger.info(`[getRestaurantBoards] Content search applied: "${content.trim()}" for restaurantIdx: ${restaurantIdx}`);
                }
            } else {
                logger.info(`[getRestaurantBoards] No search condition, returning all boards for restaurantIdx: ${restaurantIdx}`);
            }

            whereClause = updatedWhereClause;

            const boards = await this.prisma.restaurantBoard.findMany({
                where: whereClause,
                orderBy: { boardRegDate: 'desc' }, // 최신순 정렬
            });

            logger.info(`[getRestaurantBoards] Found ${boards.length} boards for restaurantIdx: ${restaurantIdx}`);
            return boards.map(mapBoard);
        } catch (error) {
            logger.error(`[getRestaurantBoards] Error: ${error.message}`);
            throw error;
        }
    }

    async getRestaurantBoardDetail(boardIdx: string) {
        try {
            // 게시글 상세 조회 (식당 정보와 댓글 포함)
            const board = await this.prisma.restaurantBoard.findFirst({
                where: { boardIdx: Number(boardIdx) },
            });

            if (!board) {
                throw new Error('게시글을 찾을 수 없습니다.');
            }

            // belongsTo 'restaurant' include 재현 (attributes: restaurantName, restaurantAddr, restaurantLocation, restaurantType)
            const info = board.restaurantIdx != null
                ? await this.prisma.restaurantInfo.findFirst({
                    where: { restaurantIdx: board.restaurantIdx },
                    select: { restaurantName: true, restaurantAddr: true, restaurantLocation: true, restaurantType: true },
                })
                : null;

            // hasMany RestaurantComment include(separate: true) 재현 — 키 이름 'RestaurantComments'
            const comments = await this.prisma.restaurantComment.findMany({
                where: { boardIdx: Number(boardIdx) },
                select: { commentIdx: true, commentContent: true, writerId: true, regDate: true, commentLike: true },
                orderBy: { regDate: 'asc' },
            });

            // 조회수 증가
            await this.prisma.restaurantBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardHits: { increment: 1 } },
            });

            logger.info(`[getRestaurantBoardDetail] Board detail retrieved with restaurant info and view count updated. BoardIdx: ${boardIdx}`);
            return {
                ...mapBoard(board),
                restaurant: info
                    ? {
                        restaurantName: info.restaurantName,
                        restaurantAddr: info.restaurantAddr,
                        restaurantLocation: info.restaurantLocation,
                        restaurantType: info.restaurantType,
                    }
                    : null,
                RestaurantComments: comments.map((c) => ({
                    commentIdx: c.commentIdx,
                    commentContent: c.commentContent,
                    writerId: c.writerId,
                    regDate: c.regDate,
                    commentLike: c.commentLike,
                })),
            };
        } catch (error) {
            logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
            throw error;
        }
    }

    async insertRestaurantBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 필수 필드 검증
                const { boardTitle, boardContent, restaurantIdx, boardID, boardPW, boardPw } = boardData;

                // boardPW 또는 boardPw 둘 다 지원
                const password = boardPW || boardPw;

                logger.info(`[insertRestaurantBoard] Received data: ${JSON.stringify(boardData)}`);
                logger.info(`[insertRestaurantBoard] Parsed fields - boardTitle: ${boardTitle}, boardContent: ${boardContent}, restaurantIdx: ${restaurantIdx}, boardID: ${boardID}, password: ${password}`);

                if (!boardTitle || !boardContent || !restaurantIdx || !boardID || !password) {
                    logger.error(`[insertRestaurantBoard] Missing fields - boardTitle: ${!!boardTitle}, boardContent: ${!!boardContent}, restaurantIdx: ${!!restaurantIdx}, boardID: ${!!boardID}, password: ${!!password}`);
                    throw new Error('필수 입력값이 누락되었습니다.');
                }

                // boardRegDate 처리: 프론트엔드에서 보낸 값을 사용, 없으면 현재 시간 사용
                let boardRegDate = boardData.boardRegDate;
                if (!boardRegDate) {
                    boardRegDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
                }

                // 평점 검증 (0.5 ~ 5.0, 0.5 단위)
                let boardRating: number | null = null;
                if (boardData.boardRating !== undefined && boardData.boardRating !== null) {
                    const rating = parseFloat(boardData.boardRating);
                    if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
                        throw new Error('평점은 0.5 ~ 5.0 사이의 값이어야 합니다.');
                    }
                    boardRating = Math.round(rating * 2) / 2;
                }

                // 게시글 생성
                const newBoard = await tx.restaurantBoard.create({
                    data: {
                        boardTitle: boardTitle,
                        boardContent: boardContent,
                        restaurantIdx: Number(restaurantIdx),
                        boardRegDate: boardRegDate,
                        boardLike: 0,
                        boardHits: 0,
                        boardRating: boardRating,
                        boardID: boardID,
                        boardPW: hashPassword(password), // SHA256 암호화 적용
                    },
                });

                logger.info(`[insertRestaurantBoard] New board created successfully. BoardIdx: ${newBoard.boardIdx}, RestaurantIdx: ${restaurantIdx}`);
                return '식당 후기가 성공적으로 등록되었습니다.';
            });
        } catch (error) {
            logger.error(`[insertRestaurantBoard] Error: ${error.message}`);
            throw error;
        }
    }

    async correctRestaurantBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const { boardIdx, boardTitle, boardContent, boardID, boardPW, boardPw, writerPw } = boardData;

                // 필수 필드 검증 - 프론트엔드 데이터 형식에 맞춰 수정
                const password = boardPW || boardPw || writerPw;

                if (!boardIdx || !password) {
                    throw new Error('필수 입력값이 누락되었습니다.');
                }

                // boardID가 없으면 boardIdx로만 조회 (프론트엔드에서 boardID를 보내지 않는 경우)
                const whereCondition: Record<string, any> = { boardIdx: Number(boardIdx) };
                if (boardID) {
                    whereCondition.boardID = boardID;
                }
                whereCondition.boardPW = hashPassword(password);

                const existingBoard = await tx.restaurantBoard.findFirst({ where: whereCondition });

                if (!existingBoard) {
                    throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                // 게시글 수정
                const updateData: Record<string, any> = {};
                if (boardTitle) updateData.boardTitle = boardTitle;
                if (boardContent) updateData.boardContent = boardContent;

                // 평점 검증 및 처리 (0.5 ~ 5.0, 0.5 단위)
                if (boardData.boardRating !== undefined && boardData.boardRating !== null) {
                    const rating = parseFloat(boardData.boardRating);
                    if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
                        throw new Error('평점은 0.5 ~ 5.0 사이의 값이어야 합니다.');
                    }
                    updateData.boardRating = Math.round(rating * 2) / 2;
                }

                if (Object.keys(updateData).length > 0) {
                    await tx.restaurantBoard.updateMany({
                        where: { boardIdx: Number(boardIdx) },
                        data: updateData,
                    });
                }

                logger.info(`[correctRestaurantBoard] Board updated successfully. BoardIdx: ${boardIdx}`);
                return '식당 후기가 성공적으로 수정되었습니다.';
            });
        } catch (error) {
            logger.error(`[correctRestaurantBoard] Error: ${error.message}`);
            throw error;
        }
    }

    async deleteRestaurantBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const { boardIdx, boardID, boardPW, boardPw, writerPw } = boardData;

                // 필수 필드 검증 - 프론트엔드 데이터 형식에 맞춰 수정
                const password = boardPW || boardPw || writerPw;

                if (!boardIdx || !password) {
                    throw new Error('필수 입력값이 누락되었습니다.');
                }

                // boardID가 없으면 boardIdx로만 조회 (프론트엔드에서 boardID를 보내지 않는 경우)
                const whereCondition: Record<string, any> = { boardIdx: Number(boardIdx) };
                if (boardID) {
                    whereCondition.boardID = boardID;
                }
                whereCondition.boardPW = hashPassword(password);

                // 작성자 확인 후 삭제 (원본은 bulk destroy로 댓글 cascade 없음)
                const deleteResult = await tx.restaurantBoard.deleteMany({ where: whereCondition });

                if (deleteResult.count === 0) {
                    throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                logger.info(`[deleteRestaurantBoard] Board deleted successfully. BoardIdx: ${boardIdx}`);
                return '식당 후기가 성공적으로 삭제되었습니다.';
            });
        } catch (error) {
            logger.error(`[deleteRestaurantBoard] Error: ${error.message}`);
            throw error;
        }
    }

    async toggleRestaurantBoardLike(boardIdx: any, isLiked: boolean) {
        // 원본은 헬퍼에 트랜잭션을 넘기지 않아 헬퍼가 자체 트랜잭션 생성
        const result = await this.boardLikeHelper.toggleBoardLike('restaurantBoard', Number(boardIdx), isLiked);
        return {
            message: result.message,
            likeCount: result.currentLikes,
        };
    }

    async getRestaurantBoardLike(boardId: string) {
        return await this.boardLikeHelper.getBoardLike('restaurantBoard', Number(boardId), {
            throwOnNotFound: true,
        });
    }

    async getRecentRestaurantBoardsWithRestaurantInfo() {
        try {
            // include(as: 'restaurant', where: { restaurantStatus: 1 }, required: true) → INNER JOIN 재현
            const activeRestaurants = await this.prisma.restaurantInfo.findMany({
                where: { restaurantStatus: 1 }, // 활성 상태인 식당만
            });
            const restaurantMap = new Map(activeRestaurants.map((r) => [String(r.restaurantIdx), r]));

            const boards = await this.prisma.restaurantBoard.findMany({
                where: { restaurantIdx: { in: activeRestaurants.map((r) => r.restaurantIdx) } },
                orderBy: { boardRegDate: 'desc' },
                take: 5, // 최신 5개
            });

            const result = boards.map((b) => ({
                ...mapBoard(b),
                restaurant: mapRestaurant(restaurantMap.get(String(b.restaurantIdx))),
            }));

            logger.info(`[getRecentRestaurantBoardsWithRestaurantInfo] Found ${result.length} recent boards with restaurant info`);
            return result;
        } catch (error) {
            logger.error(`[getRecentRestaurantBoardsWithRestaurantInfo] Error: ${error.message}`);
            throw error;
        }
    }
}
