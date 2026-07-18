// Backend/service/compBoardService.js의 Prisma 포팅.
// 직렬화 주의: 구 스택(Sequelize+mariadb bigNumberStrings)은 BIGINT → 문자열(전역 replacer가 처리),
// DECIMAL(boardRating) → "2.0" 형태 문자열, BOOLEAN(isDeleted, tinyint) → true/false.
// Prisma는 boardRating을 Prisma.Decimal(toString 시 "2"), isDeleted를 0/1로 반환하므로 여기서 변환한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardLikeHelperService } from '../../common/services/board-like-helper.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { buildBoardSearchConditions } from '../../common/utils/search-helper.util';
import { logger } from '../../logger/winston.logger';

// 평점 검증 함수 — 원본 service/compBoardService.js의 normalizeBoardRating
const normalizeBoardRating = (rating: any) => {
    if (rating === undefined || rating === null) {
        return null;
    }
    const numericRating = parseFloat(rating);
    if (
        Number.isNaN(numericRating) ||
        numericRating < 0.5 ||
        numericRating > 5.0 ||
        !Number.isInteger(numericRating * 2)
    ) {
        throw new Error('Invalid board rating value');
    }
    return numericRating;
};

// 구 스택 JSON 형태로 행 변환 (boardRating: DECIMAL(2,1) → "2.0" 문자열, isDeleted → boolean)
const toLegacyBoardShape = (board: any) => ({
    ...board,
    boardRating: board.boardRating != null ? board.boardRating.toFixed(1) : null,
    isDeleted: Boolean(board.isDeleted),
});

@Injectable()
export class CompBoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardLikeHelper: BoardLikeHelperService,
    ) {}

    async getBoards(compIdx: string, searchParams: { id?: string; title?: string; content?: string } = {}) {
        try {
            let whereClause: Record<string, any> = { compIdx: Number(compIdx) };

            // 검색 조건 적용
            const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);

            // 검색 조건 로깅
            if (hasSearchCondition) {
                const { id, title, content } = searchParams;
                if (id && id.trim() !== '') {
                    logger.info(`[getBoards] ID search applied: "${id.trim()}" for compIdx: ${compIdx}`);
                }
                if (title && title.trim() !== '') {
                    logger.info(`[getBoards] Title search applied: "${title.trim()}" for compIdx: ${compIdx}`);
                }
                if (content && content.trim() !== '') {
                    logger.info(`[getBoards] Content search applied: "${content.trim()}" for compIdx: ${compIdx}`);
                }
            } else {
                logger.info(`[getBoards] No search condition, returning all boards for compIdx: ${compIdx}     `);
            }

            whereClause = updatedWhereClause;

            const boards = await this.prisma.compBoard.findMany({
                where: whereClause,
                orderBy: { boardRegDate: 'desc' } // 최신순 정렬
            });

            logger.info(`[getBoards] Found ${boards.length} boards for compIdx: ${compIdx}`);
            return boards.map(toLegacyBoardShape);

        } catch (error) {
            logger.error(`[getBoards] Error: ${error.message}`);
            throw error;
        }
    }

    async getBoardDetail(boardIdx: string) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 조회수 증가
                await tx.compBoard.updateMany({
                    where: { boardIdx: Number(boardIdx) },
                    data: { boardHits: { increment: 1 } }
                });

                // 게시글 상세 정보 조회
                const board = await tx.compBoard.findFirst({
                    where: { boardIdx: Number(boardIdx) }
                });

                if (!board) {
                    logger.warn(`[getBoardDetail] Board not found for boardIdx: ${boardIdx}`);
                    return null;
                }

                logger.info(`[getBoardDetail] Board detail retrieved for boardIdx: ${boardIdx}`);
                return toLegacyBoardShape(board);
            });
        } catch (error) {
            logger.error(`[getBoardDetail] Error: ${error.message}`);
            throw error;
        }
    }

    async insertBoard(boardData: any) {
        try {
            const now = new Date();
            // 게시글 생성
            const board = await this.prisma.compBoard.create({
                data: {
                    compIdx: boardData.compIdx != null ? Number(boardData.compIdx) : null,
                    boardTitle: boardData.boardTitle,
                    boardContent: boardData.boardContent,
                    boardID: boardData.boardID,
                    boardPW: hashPassword(boardData.boardPw), // SHA256 암호화 적용
                    boardHits: 0, // 초기 조회수는 0
                    boardLike: 0, // 초기 좋아요는 0
                    boardRegDate: now.toISOString().slice(0, 19).replace('T', ' '), // 문자열 형태로 저장
                    boardRating: normalizeBoardRating(boardData.boardRating),
                    isDeleted: 0
                }
            });

            logger.info(`[insertBoard] Transaction committed. Board inserted successfully. BoardId: ${board.boardIdx}`);
            return 'Board inserted successfully';
        } catch (error) {
            logger.error(`[insertBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    async correctBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 비밀번호 검증
                const board = await tx.compBoard.findFirst({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                if (!board) {
                    throw new Error('Board not found');
                }

                // 입력된 비밀번호와 저장된 비밀번호 비교
                const hashedInputPassword = hashPassword(boardData.boardPw);
                if (board.boardPW !== hashedInputPassword) {
                    throw new Error('Incorrect password');
                }

                // 게시글 수정
                const now = new Date();
                await tx.compBoard.updateMany({
                    where: { boardIdx: Number(boardData.boardIdx) },
                    data: {
                        boardTitle: boardData.boardTitle,
                        boardContent: boardData.boardContent,
                        boardRegDate: now.toISOString().slice(0, 19).replace('T', ' '),
                        boardRating: normalizeBoardRating(boardData.boardRating)
                    }
                });

                logger.info(`[correctBoard] Board updated successfully. BoardId: ${boardData.boardIdx}`);
                return 'Board updated successfully';
            });
        } catch (error) {
            logger.error(`[correctBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    async deleteBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 비밀번호 검증
                const board = await tx.compBoard.findFirst({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                if (!board) {
                    throw new Error('Board not found');
                }

                // 입력된 비밀번호와 저장된 비밀번호 비교
                const hashedInputPassword = hashPassword(boardData.boardPw);
                if (board.boardPW !== hashedInputPassword) {
                    throw new Error('Incorrect password');
                }

                // 관련 댓글들도 함께 삭제
                await tx.compComment.deleteMany({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                // 게시글 삭제
                await tx.compBoard.deleteMany({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                logger.info(`[deleteBoard] Board and related comments deleted successfully. BoardId: ${boardData.boardIdx}`);
                return 'Board deleted successfully';
            });
        } catch (error) {
            logger.error(`[deleteBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    // 게시판 좋아요 토글 (증가/감소)
    async toggleBoardLike(boardIdx: number, isLiked: boolean) {
        const result = await this.prisma.$transaction(async (tx) => {
            return this.boardLikeHelper.toggleBoardLike('compBoard', Number(boardIdx), isLiked, tx);
        });
        return {
            message: `Board like ${result.action} successfully`,
            currentLikes: result.currentLikes
        };
    }

    // 게시판 좋아요 수 조회
    async getBoardLike(boardId: string) {
        return await this.boardLikeHelper.getBoardLike('compBoard', Number(boardId), {
            throwOnNotFound: false
        });
    }

    /**
     * 최근순으로 게시된 게시글 목록 조회 (회사 정보 포함)
     * 원본의 include(as: 'company') → CompInfo 별도 조회 후 병합으로 재현.
     * JSON 키 순서(attributes 순서 + company 마지막)를 원본과 동일하게 명시적으로 구성한다.
     */
    async getRecentBoardsWithCompInfo() {
        try {
            const recentBoards = await this.prisma.compBoard.findMany({
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardID: true,
                    boardHits: true,
                    boardLike: true,
                    boardRegDate: true,
                    compIdx: true,
                },
                orderBy: { boardRegDate: 'desc' },
                take: 5 // 최근 5개 조회
            });

            const compInfos = await this.prisma.compInfo.findMany({
                where: { compIdx: { in: recentBoards.filter(b => b.compIdx != null).map(b => Number(b.compIdx)) } },
                select: { compIdx: true, compName: true, compLocate: true }
            });
            const compMap = new Map(compInfos.map(c => [String(c.compIdx), c]));

            const data = recentBoards.map(b => {
                const company = b.compIdx != null ? compMap.get(String(b.compIdx)) : undefined;
                return {
                    boardIdx: b.boardIdx,
                    boardTitle: b.boardTitle,
                    boardContent: b.boardContent,
                    boardID: b.boardID,
                    boardHits: b.boardHits,
                    boardLike: b.boardLike,
                    boardRegDate: b.boardRegDate,
                    compIdx: b.compIdx,
                    company: company ? {
                        compName: company.compName,
                        compLocate: company.compLocate,
                    } : null,
                };
            });

            logger.info(`[getRecentBoardsWithCompInfo] 최근 게시글 조회 성공: ${data.length}개`);

            return {
                status: 200,
                data,
                totalCount: data.length
            };
        } catch (error) {
            logger.error(`[getRecentBoardsWithCompInfo] Error: ${error.message}`);
            throw error;
        }
    }
}
