// Backend/service/churchBoardService.js의 Prisma 포팅.
// 원본에서 도달 불가(항상 500)였던 경로의 처리 방침은 SeniorSchool/docs/DEVIATIONS.md 참조.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardLikeHelperService } from '../../common/services/board-like-helper.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { buildBoardSearchConditions } from '../../common/utils/search-helper.util';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class ChurchBoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardLikeHelper: BoardLikeHelperService,
    ) {}

    async getChurchBoards(churchIdx: string, searchParams: { id?: string; title?: string; content?: string } = {}) {
        try {
            let whereClause: Record<string, any> = { churchIdx: Number(churchIdx) };

            // 검색 조건 적용
            const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);

            // 검색 조건 로깅
            if (hasSearchCondition) {
                const { id, title, content } = searchParams;
                if (id && id.trim() !== '') {
                    logger.info(`[getChurchBoards] ID search applied: "${id.trim()}" for churchIdx: ${churchIdx}`);
                }
                if (title && title.trim() !== '') {
                    logger.info(`[getChurchBoards] Title search applied: "${title.trim()}" for churchIdx: ${churchIdx}`);
                }
                if (content && content.trim() !== '') {
                    logger.info(`[getChurchBoards] Content search applied: "${content.trim()}" for churchIdx: ${churchIdx}`);
                }
            } else {
                logger.info(`[getChurchBoards] No search condition, returning all boards for churchIdx: ${churchIdx}`);
            }

            whereClause = updatedWhereClause;

            const boards = await this.prisma.churchBoard.findMany({
                where: whereClause,
                orderBy: { boardRegDate: 'desc' } // 최신순 정렬
            });

            return boards;
        } catch (error) {
            logger.error(`[getChurchBoards] Error: ${error.message}`);
            throw error;
        }
    }

    async getChurchBoardDetail(boardIdx: string) {
        // 원본은 include attributes에 존재하지 않는 churchCampus 컬럼을 사용해 항상 500이던 경로
        // (DEVIATIONS.md 참조) — 의도된 스펙(상세 + 교회 정보 + 조회수 증가)대로 구현.
        // churchCampus는 tb_church_info에 실제 컬럼이 없어 제외한다.
        const board = await this.prisma.churchBoard.findFirst({
            where: { boardIdx: Number(boardIdx) }
        });

        const churchInfo = board && board.churchIdx != null
            ? await this.prisma.churchInfo.findFirst({
                where: { churchIdx: Number(board.churchIdx) },
                select: { churchName: true, churchLocation: true, churchType: true }
            })
            : null;

        const detailBoard = board ? { ...board, church: churchInfo } : null;

        // 조회수 증가
        await this.prisma.churchBoard.updateMany({
            where: { boardIdx: Number(boardIdx) },
            data: { boardHits: { increment: 1 } }
        });

        return detailBoard;
    }

    /**
     * 교회 게시글 생성
     */
    async insertChurchBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // ChurchBoard 테이블에 모든 데이터 저장
                const board = await tx.churchBoard.create({
                    data: {
                        churchIdx: boardData.churchIdx != null ? Number(boardData.churchIdx) : null,
                        boardTitle: boardData.boardTitle,
                        boardContent: boardData.boardContent,
                        boardRegDate: boardData.boardReg,
                        boardLike: Number(boardData.boardLike) || 0,
                        boardHits: Number(boardData.boardHits) || 0,
                        boardID: boardData.boardId,
                        boardPW: hashPassword(boardData.boardPw), // SHA256 암호화 적용
                    }
                });
                logger.debug(`[insertChurchBoard] ChurchBoard created. BoardIdx: ${board.boardIdx}`);

                logger.info(`[insertChurchBoard] Transaction committed. Board inserted successfully. BoardIdx: ${board.boardIdx}`);
                return 'Church board inserted successfully';
            });
        } catch (error) {
            logger.error(`[insertChurchBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 교회 게시글 수정
     */
    async correctChurchBoard(boardData: any) {
        // 입력된 비밀번호 암호화 (원본과 동일하게 트랜잭션 밖에서 수행 — writerPw 부재 시 여기서 throw)
        const hashedPassword = hashPassword(boardData.writerPw);

        try {
            return await this.prisma.$transaction(async (tx) => {
                // 먼저 게시글 존재 여부와 비밀번호 확인
                const existingBoard = await tx.churchBoard.findFirst({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });

                if (!existingBoard) {
                    logger.warn(`[correctChurchBoard] Board not found. BoardIdx: ${boardData.boardIdx}`);
                    throw new Error('Board not found');
                }

                // ChurchBoard 업데이트
                const { count: affectedCount } = await tx.churchBoard.updateMany({
                    where: {
                        boardIdx: Number(boardData.boardIdx),
                        boardPW: hashedPassword, // SHA256 암호화 적용
                    },
                    data: {
                        boardContent: boardData.boardContent,
                        boardTitle: boardData.boardTitle
                    }
                });

                // 해당하는 레코드가 없으면 롤백 처리
                if (affectedCount === 0) {
                    logger.warn('[correctChurchBoard] No matching board found. Rolling back transaction.');
                    throw new Error('No matching board found');
                }

                logger.info(`[correctChurchBoard] Transaction committed. Board updated successfully. BoardIdx: ${boardData.boardIdx}`);
                return 'Church board updated successfully';
            });
        } catch (error) {
            logger.error(`[correctChurchBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 교회 게시글 삭제
     */
    async deleteChurchBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 삭제할 대상이 존재하는지 조회
                const boardResult = await tx.churchBoard.findFirst({
                    where: {
                        boardIdx: Number(boardData.boardIdx),
                        boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
                    }
                });

                // 대상이 없으면 롤백
                if (!boardResult) {
                    logger.warn('[deleteChurchBoard] No matching record found for boardIdx and writerPw. Rolling back.');
                    throw new Error('No matching record found for boardIdx and writerPw');
                }

                // ChurchBoard 삭제
                await tx.churchBoard.deleteMany({
                    where: {
                        boardIdx: Number(boardData.boardIdx),
                        boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
                    }
                });
                logger.debug(`[deleteChurchBoard] ChurchBoard deleted. BoardIdx: ${boardData.boardIdx}`);

                // ChurchComment 삭제
                await tx.churchComment.deleteMany({
                    where: { boardIdx: Number(boardData.boardIdx) }
                });
                logger.debug(`[deleteChurchBoard] ChurchComment deleted. BoardIdx: ${boardData.boardIdx}`);

                logger.info(`[deleteChurchBoard] Transaction committed. Board deleted successfully. BoardIdx: ${boardData.boardIdx}`);
                return 'Church board deleted successfully';
            });
        } catch (error) {
            logger.error(`[deleteChurchBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    // 교회 게시판 좋아요 토글 (원본은 헬퍼에 트랜잭션을 넘기지 않아 헬퍼가 자체 트랜잭션 생성)
    async toggleChurchBoardLike(boardIdx: any, isLiked: boolean) {
        const result = await this.boardLikeHelper.toggleBoardLike('churchBoard', Number(boardIdx), isLiked);
        return {
            message: result.message,
            likeCount: result.currentLikes
        };
    }

    // 교회 게시판 좋아요 수 조회
    async getChurchBoardLike(boardId: string) {
        return await this.boardLikeHelper.getBoardLike('churchBoard', Number(boardId), {
            throwOnNotFound: true
        });
    }

    /**
     * 최근순으로 게시된 교회 게시글 목록 조회 (교회 정보 포함)
     * @returns 게시글 목록과 페이징 정보
     */
    async getRecentChurchBoardsWithChurchInfo(): Promise<any> {
        try {
            const limit = 5; // 고정된 제한 수

            // Raw Query로 ChurchBoard와 ChurchInfo 테이블 조인하여 최근순으로 조회
            const query = `
                SELECT
                    cb.boardIdx,
                    cb.boardTitle,
                    cb.boardContent,
                    cb.churchIdx,
                    cb.boardRegDate,
                    cb.boardLike,
                    cb.boardHits,
                    cb.boardID,
                    ci.churchName,
                    ci.churchLocation,
                    ci.churchType
                FROM tb_church_board cb
                INNER JOIN tb_church_info ci ON cb.churchIdx = ci.churchIdx
                WHERE ci.churchStatus = 1
                ORDER BY cb.boardRegDate DESC
                LIMIT ?
            `;

            const results = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(query, limit));

            // 전체 개수 조회를 위한 별도 쿼리
            const countQuery = `
                SELECT COUNT(*) as totalCount
                FROM tb_church_board cb
                INNER JOIN tb_church_info ci ON cb.churchIdx = ci.churchIdx
                WHERE ci.churchStatus = 1
            `;

            const countResult = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(countQuery));

            const totalCount = countResult[0]?.totalCount || 0;

            logger.info(`[getRecentChurchBoardsWithChurchInfo] Retrieved ${results.length} boards`);

            return {
                status: 200,
                data: results,
                totalCount: totalCount,
                currentCount: results.length
            };
        } catch (error) {
            logger.error(`[getRecentChurchBoardsWithChurchInfo] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 전체 교회의 게시판 조회수 기준 인기 후기 TOP10 조회
     * @returns 인기 후기 목록과 정보
     */
    async getTopViewedChurchBoardsByChurch(): Promise<any> {
        try {
            // Raw Query로 조회수 기준 인기 후기 TOP10 조회
            const query = `
                SELECT
                    cb.boardIdx,
                    cb.boardTitle,
                    cb.boardContent,
                    cb.boardRegDate,
                    cb.boardLike,
                    cb.boardHits,
                    cb.boardID,
                    ci.churchName,
                    ci.churchLocation,
                    ci.churchType
                FROM tb_church_board cb
                INNER JOIN tb_church_info ci ON cb.churchIdx = ci.churchIdx
                WHERE ci.churchStatus = 1
                ORDER BY cb.boardHits DESC
                LIMIT ?
            `;

            const results = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(query, 10));

            logger.info(`[getTopViewedChurchBoardsByChurch] 전체 교회의 인기 후기 TOP10 조회 완료: ${results.length}개`);

            return {
                status: 200,
                data: results
            };
        } catch (error) {
            logger.error(`[getTopViewedChurchBoardsByChurch] Error: ${error.message}`);
            throw error;
        }
    }
}
