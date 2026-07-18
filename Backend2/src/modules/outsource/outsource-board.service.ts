// Backend/service/outsourceBoardService.js의 Prisma 포팅.
// Prisma 스키마에는 outsource 모델 간 relation이 없으므로 Sequelize include(JOIN)는
// 별도 조회 + 병합으로 재현한다. 중첩 키 이름은 원본 별칭('outsource', 'OutsourceComments')을 유지.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardLikeHelperService } from '../../common/services/board-like-helper.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { buildBoardSearchConditions } from '../../common/utils/search-helper.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class OutsourceBoardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly boardLikeHelper: BoardLikeHelperService,
    ) {}

    async getOutsourceBoards(outsourceIdx: string, searchParams: { id?: string; title?: string; content?: string } = {}) {
        try {
            let whereClause: Record<string, any> = { outsourceIdx: Number(outsourceIdx) };

            // 검색 조건 적용
            const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);

            // 검색 조건 로깅
            if (hasSearchCondition) {
                const { id, title, content } = searchParams;
                if (id && id.trim() !== '') {
                    logger.info(`[getOutsourceBoards] ID search applied: "${id.trim()}" for outsourceIdx: ${outsourceIdx}`);
                }
                if (title && title.trim() !== '') {
                    logger.info(`[getOutsourceBoards] Title search applied: "${title.trim()}" for outsourceIdx: ${outsourceIdx}`);
                }
                if (content && content.trim() !== '') {
                    logger.info(`[getOutsourceBoards] Content search applied: "${content.trim()}" for outsourceIdx: ${outsourceIdx}`);
                }
            } else {
                logger.info(`[getOutsourceBoards] No search condition, returning all boards for outsourceIdx: ${outsourceIdx}`);
            }

            whereClause = updatedWhereClause;

            const boards = await this.prisma.outsourceBoard.findMany({
                where: whereClause,
                orderBy: { boardRegDate: 'desc' } // 최신순 정렬
            });

            logger.info(`[getOutsourceBoards] Found ${boards.length} boards for outsourceIdx: ${outsourceIdx}`);
            return boards;
        } catch (error) {
            logger.error(`[getOutsourceBoards] Error: ${error.message}`);
            throw error;
        }
    }

    async getOutsourceBoardDetail(boardIdx: string) {
        try {
            // 게시글 상세 조회 (외주업체 정보와 댓글 포함)
            const board = await this.prisma.outsourceBoard.findFirst({
                where: { boardIdx: Number(boardIdx) }
            });

            if (!board) {
                throw new Error('게시글을 찾을 수 없습니다.');
            }

            // belongsTo 'outsource' include 재현 (LEFT JOIN — 없으면 null, outsourceStatus 필터 없음)
            const outsource = board.outsourceIdx != null
                ? await this.prisma.outsourceInfo.findFirst({
                    where: { outsourceIdx: board.outsourceIdx },
                    select: {
                        outsourceName: true,
                        outsourceAddr: true,
                        outsourceLocation: true,
                        outsourceType: true,
                        outsourceEstablished: true,
                        outsourceCEO: true,
                        outsourceURL: true,
                    }
                })
                : null;

            // hasMany OutsourceComment include(separate: true) 재현 — 키 이름 'OutsourceComments'
            const comments = await this.prisma.outsourceComment.findMany({
                where: { boardIdx: Number(boardIdx) },
                select: {
                    commentIdx: true,
                    commentContent: true,
                    writerId: true,
                    regDate: true,
                    commentLike: true,
                },
                orderBy: { regDate: 'asc' }
            });

            // 조회수 증가
            await this.prisma.outsourceBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardHits: { increment: 1 } }
            });

            logger.info(`[getOutsourceBoardDetail] Board detail retrieved with outsource info and view count updated. BoardIdx: ${boardIdx}`);
            return { ...board, outsource, OutsourceComments: comments }; // 조회수 증가 전 값 반환 (원본과 동일)
        } catch (error) {
            logger.error(`[getOutsourceBoardDetail] Error: ${error.message}`);
            throw error;
        }
    }

    async insertOutsourceBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // 필수 필드 검증
                const { boardTitle, boardContent, outsourceIdx, boardID, boardPW, boardPw } = boardData;

                // boardPW 또는 boardPw 둘 다 지원
                const password = boardPW || boardPw;

                // 디버깅을 위한 로그
                logger.info(`[insertOutsourceBoard] Received data: ${JSON.stringify(boardData)}`);
                logger.info(`[insertOutsourceBoard] Parsed fields - boardTitle: ${boardTitle}, boardContent: ${boardContent}, outsourceIdx: ${outsourceIdx}, boardID: ${boardID}, password: ${password}`);

                if (!boardTitle || !boardContent || !outsourceIdx || !boardID || !password) {
                    logger.error(`[insertOutsourceBoard] Missing fields - boardTitle: ${!!boardTitle}, boardContent: ${!!boardContent}, outsourceIdx: ${!!outsourceIdx}, boardID: ${!!boardID}, password: ${!!password}`);
                    throw new Error('필수 입력값이 누락되었습니다.');
                }

                // 현재 날짜/시간 생성
                const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

                // 게시글 생성
                const newBoard = await tx.outsourceBoard.create({
                    data: {
                        boardTitle: boardTitle,
                        boardContent: boardContent,
                        outsourceIdx: Number(outsourceIdx),
                        boardRegDate: currentDate,
                        boardLike: 0,
                        boardHits: 0,
                        boardID: boardID,
                        boardPW: hashPassword(password) // SHA256 암호화 적용
                    }
                });

                logger.info(`[insertOutsourceBoard] New board created successfully. BoardIdx: ${newBoard.boardIdx}, OutsourceIdx: ${outsourceIdx}`);
                return '외주 후기가 성공적으로 등록되었습니다.';
            });
        } catch (error) {
            logger.error(`[insertOutsourceBoard] Error: ${error.message}`);
            throw error;
        }
    }

    async correctOutsourceBoard(boardData: any) {
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

                const existingBoard = await tx.outsourceBoard.findFirst({
                    where: whereCondition
                });

                if (!existingBoard) {
                    throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                // 게시글 수정
                const updateData: Record<string, any> = {};
                if (boardTitle) updateData.boardTitle = boardTitle;
                if (boardContent) updateData.boardContent = boardContent;

                if (Object.keys(updateData).length > 0) {
                    await tx.outsourceBoard.updateMany({
                        where: { boardIdx: Number(boardIdx) },
                        data: updateData
                    });
                }

                logger.info(`[correctOutsourceBoard] Board updated successfully. BoardIdx: ${boardIdx}`);
                return '외주 후기가 성공적으로 수정되었습니다.';
            });
        } catch (error) {
            logger.error(`[correctOutsourceBoard] Error: ${error.message}`);
            throw error;
        }
    }

    async deleteOutsourceBoard(boardData: any) {
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

                // 작성자 확인 후 삭제
                const deleteResult = await tx.outsourceBoard.deleteMany({
                    where: whereCondition
                });

                if (deleteResult.count === 0) {
                    throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
                }

                logger.info(`[deleteOutsourceBoard] Board deleted successfully. BoardIdx: ${boardIdx}`);
                return '외주 후기가 성공적으로 삭제되었습니다.';
            });
        } catch (error) {
            logger.error(`[deleteOutsourceBoard] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 게시판 좋아요 토글
    async toggleOutsourceBoardLike(boardIdx: number, isLiked: boolean) {
        const result = await this.boardLikeHelper.toggleBoardLike('outsourceBoard', Number(boardIdx), isLiked);
        return {
            message: result.message,
            likeCount: result.currentLikes
        };
    }

    // 외주업체 게시판 좋아요 수 조회
    async getOutsourceBoardLike(boardId: string) {
        return await this.boardLikeHelper.getBoardLike('outsourceBoard', Number(boardId), {
            throwOnNotFound: true
        });
    }

    // 최근순으로 게시된 외주업체 게시글 목록 조회 (외주업체 정보 포함)
    async getRecentOutsourceBoardsWithOutsourceInfo() {
        try {
            // include(as: 'outsource', where: { outsourceStatus: 1 }, required: true) → INNER JOIN 재현
            const activeOutsources = await this.prisma.outsourceInfo.findMany({
                where: { outsourceStatus: 1 } // 활성 상태인 외주업체만
            });
            const outsourceMap = new Map(activeOutsources.map(o => [o.outsourceIdx.toString(), o]));

            const boards = await this.prisma.outsourceBoard.findMany({
                where: { outsourceIdx: { in: activeOutsources.map(o => o.outsourceIdx) } },
                orderBy: { boardRegDate: 'desc' },
                take: 20 // 최신 20개
            });

            const result = boards.map(b => ({
                ...b,
                outsource: outsourceMap.get(b.outsourceIdx!.toString())
            }));

            logger.info(`[getRecentOutsourceBoardsWithOutsourceInfo] Found ${result.length} recent boards with outsource info`);
            return result;
        } catch (error) {
            logger.error(`[getRecentOutsourceBoardsWithOutsourceInfo] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체별로 후기 조회수 기준 인기 후기 TOP10 조회
    async getTopViewedOutsourceBoardsByOutsource() {
        try {
            // include(as: 'outsource', where: { outsourceStatus: 1 }, required: true) → INNER JOIN 재현
            const activeOutsources = await this.prisma.outsourceInfo.findMany({
                where: { outsourceStatus: 1 } // 활성 상태인 외주업체만
            });
            const outsourceMap = new Map(activeOutsources.map(o => [o.outsourceIdx.toString(), o]));

            const boards = await this.prisma.outsourceBoard.findMany({
                where: { outsourceIdx: { in: activeOutsources.map(o => o.outsourceIdx) } },
                orderBy: { boardHits: 'desc' }, // 조회수 기준 내림차순
                take: 10 // TOP 10
            });

            const result = boards.map(b => ({
                ...b,
                outsource: outsourceMap.get(b.outsourceIdx!.toString())
            }));

            logger.info(`[getTopViewedOutsourceBoardsByOutsource] Found ${result.length} top viewed boards by outsource`);
            return result;
        } catch (error) {
            logger.error(`[getTopViewedOutsourceBoardsByOutsource] Error: ${error.message}`);
            throw error;
        }
    }
}
