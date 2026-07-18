// Backend/service/boardService.js의 Prisma 포팅 (레거시 호환용 /board 라우터).
// 주의: /board 와 /univ/board 는 같은 tb_univboard/tb_univcomment 테이블을 쓰지만
//       서로 다른 서비스 코드다. boardService(레거시)는 univBoardService와 달리
//       올바른 컬럼명/raw SQL을 써서 실제로 동작하는 경로가 많다 — 그대로 재현한다.
//   - getBoardDetail: university(소문자) 조인 + boardHits 실제 증가 (univ는 no-op였음)
//   - getRecentBoardsWithUnivInfo: raw SQL, LIMIT 5, 평면 필드 {status,data,totalCount,currentCount}
//   - getTopViewedBoardsByUniversity: raw SQL, LIMIT 10, {status,data} 만
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardLikeHelperService } from '../../common/services/board-like-helper.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { buildBoardSearchConditions } from '../../common/utils/search-helper.util';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class BoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardLikeHelper: BoardLikeHelperService,
    ) {}

    async getBoards(univIdx: string, searchParams: { id?: string; title?: string; content?: string } = {}) {
        try {
            let whereClause: Record<string, any> = { univIdx: Number(univIdx) };

            const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);

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

            return boards;
        } catch (error) {
            logger.error(`[getBoards] Error: ${error.message}`);
            throw error;
        }
    }

    async getBoardDetail(boardIdx: string) {
        // 원본은 findOne(전체 컬럼 + university 조인) 후 boardHits +1 UPDATE.
        // findOne이 먼저 실행되므로 반환값은 증가 이전 값이다 (증가 전 스냅샷 반환 재현).
        const board = await this.prisma.univBoard.findFirst({
            where: { boardIdx: Number(boardIdx) }
        });

        // 조회수 증가 (반환값에는 반영되지 않음)
        await this.prisma.univBoard.updateMany({
            where: { boardIdx: Number(boardIdx) },
            data: { boardHits: { increment: 1 } }
        });

        if (!board) {
            return null;
        }

        // university(소문자) 조인 재현 — 스키마에 관계가 없어 수동 조회 후 부착.
        // 원본 include attributes 순서: univName, univLocate, univType, univCampos
        let university: any = null;
        if (board.univIdx != null) {
            const u = await this.prisma.universityInfo.findFirst({
                where: { univIdx: Number(board.univIdx) },
                select: { univName: true, univLocate: true, univType: true, univCampos: true }
            });
            if (u) {
                university = {
                    univName: u.univName,
                    univLocate: u.univLocate,
                    univType: u.univType,
                    univCampos: u.univCampos,
                };
            }
        }

        return { ...board, university };
    }

    /**
     * 게시글 생성 — 원본 boardService.insertBoard 재현.
     * boardRegDate는 요청 바디의 boardReg 값을 그대로 저장(VARCHAR), boardID=boardId, boardPW=hash(boardPw).
     */
    async insertBoard(boardData: any) {
        try {
            const board = await this.prisma.univBoard.create({
                data: {
                    univIdx: boardData.univIdx != null ? Number(boardData.univIdx) : null,
                    boardTitle: boardData.boardTitle,
                    boardContent: boardData.boardContent,
                    boardRegDate: boardData.boardReg,
                    boardLike: boardData.boardLike != null ? Number(boardData.boardLike) : 0,
                    boardHits: boardData.boardHits != null ? Number(boardData.boardHits) : 0,
                    boardID: boardData.boardId,
                    boardPW: hashPassword(boardData.boardPw), // SHA256 암호화 적용
                }
            });
            logger.info(`[insertBoard] Board inserted successfully. BoardIdx: ${board.boardIdx}`);
            return 'Board inserted successfully';
        } catch (error) {
            logger.error(`[insertBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 게시글 수정 — writerPw 해시가 boardPW와 일치하는 행만 수정.
     */
    async correctBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingBoard = await tx.univBoard.findFirst({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                if (!existingBoard) {
                    logger.warn(`[correctBoard] Board not found. BoardIdx: ${boardData.boardIdx}`);
                    throw new Error('Board not found');
                }

                const result = await tx.univBoard.updateMany({
                    where: {
                        boardIdx: Number(boardData.boardIdx),
                        boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
                    },
                    data: {
                        boardContent: boardData.boardContent,
                        boardTitle: boardData.boardTitle,
                    }
                });

                if (result.count === 0) {
                    logger.warn('[correctBoard] No matching board found. Rolling back transaction.');
                    throw new Error('No matching board found');
                }

                logger.info(`[correctBoard] Board updated successfully. BoardIdx: ${boardData.boardIdx}`);
                return 'Board updated successfully';
            });
        } catch (error) {
            logger.error(`[correctBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 게시글 삭제 — writerPw 해시 일치 행 + 관련 댓글 삭제.
     */
    async deleteBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const boardResult = await tx.univBoard.findFirst({
                    where: {
                        boardIdx: Number(boardData.boardIdx),
                        boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
                    }
                });

                if (!boardResult) {
                    logger.warn('[deleteBoard] No matching record found for boardIdx and writerPw. Rolling back.');
                    throw new Error('No matching record found for boardIdx and writerPw');
                }

                await tx.univBoard.deleteMany({
                    where: {
                        boardIdx: Number(boardData.boardIdx),
                        boardPW: hashPassword(boardData.writerPw),
                    }
                });

                await tx.univComment.deleteMany({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                logger.info(`[deleteBoard] Board deleted successfully. BoardIdx: ${boardData.boardIdx}`);
                return 'Board deleted successfully';
            });
        } catch (error) {
            logger.error(`[deleteBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    // 게시판 좋아요 토글
    async toggleBoardLike(boardIdx: number, isLiked: boolean) {
        return await this.boardLikeHelper.toggleBoardLike('univBoard', Number(boardIdx), isLiked);
    }

    // 게시판 좋아요 수 조회
    async getBoardLike(boardId: string) {
        return await this.boardLikeHelper.getBoardLike('univBoard', Number(boardId), {
            throwOnNotFound: true
        });
    }

    /**
     * 최근순으로 게시된 게시글 목록 조회 (대학교 정보 포함) — raw SQL, LIMIT 5.
     */
    async getRecentBoardsWithUnivInfo() {
        try {
            const results = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(
                `SELECT
                    ub.boardIdx,
                    ub.boardTitle,
                    ub.boardContent,
                    ub.univIdx,
                    ub.boardRegDate,
                    ub.boardLike,
                    ub.boardHits,
                    ub.boardID,
                    u.univName,
                    u.univLocate,
                    u.univType,
                    u.univCampos
                FROM tb_univboard ub
                INNER JOIN tb_universityinfo u ON ub.univIdx = u.univIdx
                WHERE u.univStatus = 1
                ORDER BY ub.boardRegDate DESC
                LIMIT 5`
            ));

            const countRows = await this.prisma.$queryRawUnsafe<any[]>(
                `SELECT COUNT(*) as totalCount
                 FROM tb_univboard ub
                 INNER JOIN tb_universityinfo u ON ub.univIdx = u.univIdx
                 WHERE u.univStatus = 1`
            );
            const totalCount = countRows[0]?.totalCount != null ? String(countRows[0].totalCount) : 0;

            logger.info(`[getRecentBoardsWithUnivInfo] Retrieved ${results.length} boards`);

            return {
                status: 200,
                data: results,
                totalCount: totalCount,
                currentCount: results.length
            };
        } catch (error) {
            logger.error(`[getRecentBoardsWithUnivInfo] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 전체 대학교의 게시판 조회수 기준 인기 후기 TOP10 조회 — raw SQL, LIMIT 10.
     */
    async getTopViewedBoardsByUniversity() {
        try {
            const results = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(
                `SELECT
                    ub.boardIdx,
                    ub.boardTitle,
                    ub.boardContent,
                    ub.boardRegDate,
                    ub.boardLike,
                    ub.boardHits,
                    ub.boardID,
                    u.univName,
                    u.univLocate,
                    u.univType,
                    u.univCampos
                FROM tb_univboard ub
                INNER JOIN tb_universityinfo u ON ub.univIdx = u.univIdx
                WHERE u.univStatus = 1
                ORDER BY ub.boardHits DESC
                LIMIT 10`
            ));

            logger.info(`[getTopViewedBoardsByUniversity] 전체 대학교의 인기 후기 TOP10 조회 완료: ${results.length}개`);

            return {
                status: 200,
                data: results
            };
        } catch (error) {
            logger.error(`[getTopViewedBoardsByUniversity] Error: ${error.message}`);
            throw error;
        }
    }
}
