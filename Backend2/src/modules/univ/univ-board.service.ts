// Backend/service/univBoardService.js의 Prisma 포팅.
// 원본에서 도달 불가(항상 500)였던 경로의 처리 방침은 SeniorSchool/docs/DEVIATIONS.md 참조.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardLikeHelperService } from '../../common/services/board-like-helper.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { buildBoardSearchConditions } from '../../common/utils/search-helper.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class UnivBoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardLikeHelper: BoardLikeHelperService,
    ) {}

    async getBoards(univIdx: string, searchParams: { id?: string; title?: string; content?: string } = {}) {
        try {
            let whereClause: Record<string, any> = { univIdx: Number(univIdx) };

            // 검색 조건 적용
            const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);

            // 검색 조건 로깅
            if (hasSearchCondition) {
                const { id, title, content } = searchParams;
                if (id && id.trim() !== '') {
                    logger.info(`[getBoards] ID search applied: "${id.trim()}" for univIdx: ${univIdx}`);
                }
                if (title && title.trim() !== '') {
                    logger.info(`[getBoards] Title search applied: "${title.trim()}" for univIdx: ${univIdx}`);
                }
                if (content && content.trim() !== '') {
                    logger.info(`[getBoards] Content search applied: "${content.trim()}" for univIdx: ${univIdx}`);
                }
            } else {
                logger.info(`[getBoards] No search condition, returning all boards for univIdx: ${univIdx}`);
            }

            whereClause = updatedWhereClause;

            const boards = await this.prisma.univBoard.findMany({
                where: whereClause,
                orderBy: { boardRegDate: 'desc' } // 최신순 정렬
            });

            logger.info(`[getBoards] Found ${boards.length} boards for univIdx: ${univIdx}`);
            return boards;

        } catch (error) {
            logger.error(`[getBoards] Error: ${error.message}`);
            throw error;
        }
    }

    async getBoardDetail(boardIdx: string) {
        try {
            // 원본의 조회수 증가 UPDATE는 존재하지 않는 boardHit 속성을 사용해
            // Sequelize가 조용히 무시하던 no-op이었다 — 관측 동작(증가 없음)을 그대로 유지한다.
            const board = await this.prisma.univBoard.findFirst({
                where: { boardIdx: Number(boardIdx) }
            });

            if (!board) {
                logger.warn(`[getBoardDetail] Board not found for boardIdx: ${boardIdx}`);
                return null;
            }

            logger.info(`[getBoardDetail] Board detail retrieved for boardIdx: ${boardIdx}`);
            return board;

        } catch (error) {
            logger.error(`[getBoardDetail] Error: ${error.message}`);
            throw error;
        }
    }

    async insertBoard(boardData: any) {
        try {
            // 원본은 boardPw/boardHit/boardModDate 속성 불일치로 항상 실패하던 경로 (DEVIATIONS.md 참조)
            // — 의도된 스펙(게시글 등록)대로 구현. boardRegDate는 VARCHAR 컬럼이므로 문자열로 저장.
            const now = new Date();
            const board = await this.prisma.univBoard.create({
                data: {
                    univIdx: boardData.univIdx != null ? Number(boardData.univIdx) : null,
                    boardTitle: boardData.boardTitle,
                    boardContent: boardData.boardContent,
                    boardID: boardData.boardID,
                    boardPW: hashPassword(boardData.boardPw), // SHA256 암호화 적용
                    boardLike: 0, // 초기 좋아요는 0
                    boardHits: 0, // 초기 조회수는 0
                    boardRegDate: now.toISOString(),
                }
            });

            logger.info(`[insertBoard] Board inserted successfully. BoardId: ${board.boardIdx}`);
            return 'Board inserted successfully';
        } catch (error) {
            logger.error(`[insertBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    async correctBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 비밀번호 검증 (원본 의도: boardPW 비교 — 원본은 속성 오타로 항상 실패, DEVIATIONS.md 참조)
                const board = await tx.univBoard.findFirst({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                if (!board) {
                    throw new Error('Board not found');
                }

                const hashedInputPassword = hashPassword(boardData.boardPw);
                if (board.boardPW !== hashedInputPassword) {
                    throw new Error('Incorrect password');
                }

                // 게시글 수정
                await tx.univBoard.updateMany({
                    where: { boardIdx: Number(boardData.boardIdx) },
                    data: {
                        boardTitle: boardData.boardTitle,
                        boardContent: boardData.boardContent,
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
                const board = await tx.univBoard.findFirst({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                if (!board) {
                    throw new Error('Board not found');
                }

                const hashedInputPassword = hashPassword(boardData.boardPw);
                if (board.boardPW !== hashedInputPassword) {
                    throw new Error('Incorrect password');
                }

                // 관련 댓글들도 함께 삭제
                await tx.univComment.deleteMany({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                // 게시글 삭제
                await tx.univBoard.deleteMany({
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
            return this.boardLikeHelper.toggleBoardLike('univBoard', Number(boardIdx), isLiked, tx);
        });
        return {
            message: `Board like ${result.action} successfully`,
            currentLikes: result.currentLikes
        };
    }

    // 게시판 좋아요 수 조회
    async getBoardLike(boardId: string) {
        return await this.boardLikeHelper.getBoardLike('univBoard', Number(boardId), {
            throwOnNotFound: false
        });
    }

    /**
     * 최근순으로 게시된 게시글 목록 조회 (대학교 정보 포함)
     * 원본은 association 별칭 불일치('University' vs 'university')로 항상 500이던 경로 (DEVIATIONS.md 참조)
     * — 의도된 스펙(대학 정보 포함 최근 20개)대로 구현.
     */
    async getRecentBoardsWithUnivInfo() {
        try {
            const recentBoards = await this.prisma.univBoard.findMany({
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardID: true,
                    boardHits: true,
                    boardLike: true,
                    boardRegDate: true,
                    univIdx: true,
                },
                orderBy: { boardRegDate: 'desc' },
                take: 20 // 최근 20개만 조회
            });

            const univInfos = await this.prisma.universityInfo.findMany({
                where: { univIdx: { in: recentBoards.filter(b => b.univIdx != null).map(b => Number(b.univIdx)) } },
                select: { univIdx: true, univName: true, univLocate: true }
            });
            const univMap = new Map(univInfos.map(u => [String(u.univIdx), u]));

            const data = recentBoards.map(b => ({
                ...b,
                University: b.univIdx != null ? {
                    univName: univMap.get(String(b.univIdx))?.univName ?? null,
                    univLocate: univMap.get(String(b.univIdx))?.univLocate ?? null,
                } : null,
            }));

            logger.info(`[getRecentBoardsWithUnivInfo] 최근 게시글 조회 성공: ${data.length}개`);

            return {
                status: 200,
                data,
                totalCount: data.length
            };
        } catch (error) {
            logger.error(`[getRecentBoardsWithUnivInfo] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 전체 대학교의 게시판 조회수 기준 인기 후기 TOP10 조회
     * 원본은 association 별칭 불일치로 항상 500이던 경로 (DEVIATIONS.md 참조)
     */
    async getTopViewedBoardsByUniversity() {
        try {
            const topViewedBoards = await this.prisma.univBoard.findMany({
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardID: true,
                    boardHits: true,
                    boardLike: true,
                    boardRegDate: true,
                    univIdx: true,
                },
                orderBy: [
                    { boardHits: 'desc' },   // 조회수 기준 내림차순
                    { boardRegDate: 'desc' } // 동일 조회수일 경우 최신순
                ],
                take: 10 // TOP 10만 조회
            });

            const univInfos = await this.prisma.universityInfo.findMany({
                where: { univIdx: { in: topViewedBoards.filter(b => b.univIdx != null).map(b => Number(b.univIdx)) } },
                select: { univIdx: true, univName: true, univLocate: true }
            });
            const univMap = new Map(univInfos.map(u => [String(u.univIdx), u]));

            const data = topViewedBoards.map(b => ({
                ...b,
                University: b.univIdx != null ? {
                    univName: univMap.get(String(b.univIdx))?.univName ?? null,
                    univLocate: univMap.get(String(b.univIdx))?.univLocate ?? null,
                } : null,
            }));

            logger.info(`[getTopViewedBoardsByUniversity] 인기 후기 TOP10 조회 성공: ${data.length}개`);

            return {
                status: 200,
                data,
                totalCount: data.length,
                message: '전체 대학교의 인기 후기 TOP10 조회 성공'
            };
        } catch (error) {
            logger.error(`[getTopViewedBoardsByUniversity] Error: ${error.message}`);
            throw error;
        }
    }
}
