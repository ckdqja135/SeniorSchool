// Backend/service/churchService.js의 Prisma 포팅.
// church.router.js에서 실제 라우팅되는 함수만 포팅한다
// (createChurch/autoComplete/getChurchInfoByName/getTopViewedChurches는 미라우팅 → 제외).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class ChurchService {
    constructor(private readonly prisma: PrismaService) {}

    // 교회 목록 조회
    async getChurches(searchParams: { name?: string; type?: string; location?: string } = {}) {
        try {
            const whereClause: Record<string, any> = { churchStatus: 1 }; // 활성화된 교회만

            const { name, type, location } = searchParams;

            if (name && name.trim() !== '') {
                whereClause.churchName = { contains: name.trim() };
                logger.info(`[getChurches] Name search applied: "${name.trim()}"`);
            }

            if (type && type.trim() !== '') {
                whereClause.churchType = type.trim();
                logger.info(`[getChurches] Type search applied: "${type.trim()}"`);
            }

            if (location && location.trim() !== '') {
                whereClause.churchLocation = { contains: location.trim() };
                logger.info(`[getChurches] Location search applied: "${location.trim()}"`);
            }

            const churches = await this.prisma.churchInfo.findMany({
                where: whereClause,
                orderBy: { churchName: 'asc' } // 교회명 순 정렬
            });

            logger.info(`[getChurches] Found ${churches.length} churches`);
            return churches;
        } catch (error) {
            logger.error(`[getChurches] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 상세 조회
    async getChurchDetail(churchIdx: any, churchName?: string, churchAddr?: string) {
        try {
            const whereClause: Record<string, any> = { churchStatus: 1 };

            // 검색 조건 구성
            if (churchIdx) {
                whereClause.churchIdx = Number(churchIdx);
            } else if (churchName) {
                whereClause.churchName = churchName;
            } else if (churchAddr) {
                whereClause.churchAddr = churchAddr;
            }

            const church = await this.prisma.churchInfo.findFirst({
                where: whereClause
            });

            if (!church) {
                throw new Error('Church not found');
            }

            // 조회수 증가 — 원본은 updated_at = updated_at으로 수정일 자동 갱신을 막았으므로 동일 SQL 유지
            await this.prisma.$executeRawUnsafe(
                'UPDATE tb_church_info SET churchViewCount = churchViewCount + 1, updated_at = updated_at WHERE churchIdx = ?',
                church.churchIdx
            );

            logger.info(`[getChurchDetail] Church detail retrieved. ChurchIdx: ${church.churchIdx}, ChurchName: ${church.churchName}`);
            return church;
        } catch (error) {
            logger.error(`[getChurchDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 수정
    async updateChurch(churchIdx: string, churchData: any) {
        try {
            await this.prisma.$transaction(async (tx) => {
                // 교회 존재 여부 확인
                const existingChurch = await tx.churchInfo.findFirst({
                    where: { churchIdx: Number(churchIdx) }
                });

                if (!existingChurch) {
                    throw new Error('Church not found');
                }

                // 교회 정보 업데이트
                const { count: affectedCount } = await tx.churchInfo.updateMany({
                    where: { churchIdx: Number(churchIdx) },
                    data: {
                        churchName: churchData.churchName || existingChurch.churchName,
                        churchLocation: churchData.churchLocation || existingChurch.churchLocation,
                        churchType: churchData.churchType || existingChurch.churchType,
                        churchEstablished: churchData.churchEstablished || existingChurch.churchEstablished,
                        churchPastor: churchData.churchPastor || existingChurch.churchPastor,
                        churchLatX: churchData.churchLatX !== undefined ? Number(churchData.churchLatX) : existingChurch.churchLatX,
                        churchLatY: churchData.churchLatY !== undefined ? Number(churchData.churchLatY) : existingChurch.churchLatY,
                        churchURL: churchData.churchURL || existingChurch.churchURL,
                        churchLotAddr: churchData.churchLotAddr || existingChurch.churchLotAddr,
                        churchAddr: churchData.churchAddr || existingChurch.churchAddr,
                        churchMapIMG: churchData.churchMapIMG !== undefined ? churchData.churchMapIMG : existingChurch.churchMapIMG,
                        churchStatus: churchData.churchStatus !== undefined ? Number(churchData.churchStatus) : existingChurch.churchStatus
                    }
                });

                if (affectedCount === 0) {
                    throw new Error('No church was updated');
                }
            });

            logger.info(`[updateChurch] Church updated successfully. ChurchIdx: ${churchIdx}`);

            // 업데이트된 교회 정보 반환
            return await this.prisma.churchInfo.findFirst({ where: { churchIdx: Number(churchIdx) } });
        } catch (error) {
            logger.error(`[updateChurch] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    // 교회 삭제 (소프트 삭제)
    async deleteChurch(churchIdx: string) {
        try {
            await this.prisma.$transaction(async (tx) => {
                // 교회 존재 여부 확인
                const existingChurch = await tx.churchInfo.findFirst({
                    where: { churchIdx: Number(churchIdx) }
                });

                if (!existingChurch) {
                    throw new Error('Church not found');
                }

                // 교회 상태를 비활성화로 변경 (소프트 삭제)
                const { count: affectedCount } = await tx.churchInfo.updateMany({
                    where: { churchIdx: Number(churchIdx) },
                    data: { churchStatus: 0 }
                });

                if (affectedCount === 0) {
                    throw new Error('No church was deleted');
                }
            });

            logger.info(`[deleteChurch] Church deleted successfully. ChurchIdx: ${churchIdx}`);
            return true;
        } catch (error) {
            logger.error(`[deleteChurch] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    /**
     * 교회 추가 요청 생성
     */
    async createChurchRequest(requestData: any) {
        try {
            const { churchName, churchPastor, churchType, churchAddr } = requestData;

            // 필수값 체크 (교회 이름만 필수)
            if (!churchName || churchName.trim() === '') {
                throw new Error('교회 이름은 필수입니다.');
            }

            // 교회 이름 중복 체크 (이미 요청된 교회인지)
            const existingRequest = await this.prisma.churchRequest.findFirst({
                where: { churchName: churchName.trim() }
            });

            if (existingRequest) {
                return {
                    success: false,
                    message: '이미 요청된 교회입니다.',
                    existingRequest
                };
            }

            // 요청 데이터 생성
            const newRequest = await this.prisma.churchRequest.create({
                data: {
                    churchName: churchName.trim(),
                    churchPastor: churchPastor ? churchPastor.trim() : null,
                    churchType: churchType ? churchType.trim() : null,
                    churchAddr: churchAddr ? churchAddr.trim() : null,
                    requestStatus: 'pending',
                    requestDate: new Date()
                }
            });

            logger.info(`[createChurchRequest] 교회 요청 생성 완료: ${newRequest.requestIdx} - ${newRequest.churchName}`);

            return {
                success: true,
                message: '교회 요청이 성공적으로 등록되었습니다.',
                data: newRequest
            };
        } catch (error) {
            logger.error(`[createChurchRequest] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 후기 목록 조회
    async getChurchBoards(churchIdx: string, searchParams: { id?: string; title?: string; content?: string } = {}) {
        try {
            const whereClause: Record<string, any> = { churchIdx: Number(churchIdx) };

            // 검색 조건이 있는 경우 추가
            const { id, title, content } = searchParams;
            let hasSearchCondition = false;

            if (id && id.trim() !== '') {
                // boardID: 정확한 일치 검색
                whereClause.boardID = id.trim();
                hasSearchCondition = true;
                logger.info(`[getChurchBoards] ID search applied: "${id.trim()}" for churchIdx: ${churchIdx}`);
            }

            if (title && title.trim() !== '') {
                // boardTitle: LIKE 검색
                whereClause.boardTitle = { contains: title.trim() };
                hasSearchCondition = true;
                logger.info(`[getChurchBoards] Title search applied: "${title.trim()}" for churchIdx: ${churchIdx}`);
            }

            if (content && content.trim() !== '') {
                // boardContent: LIKE 검색
                whereClause.boardContent = { contains: content.trim() };
                hasSearchCondition = true;
                logger.info(`[getChurchBoards] Content search applied: "${content.trim()}" for churchIdx: ${churchIdx}`);
            }

            if (!hasSearchCondition) {
                logger.info(`[getChurchBoards] No search condition, returning all boards for churchIdx: ${churchIdx}`);
            }

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

    // 교회 후기 상세보기
    async getChurchBoardDetail(boardIdx: string) {
        try {
            // 원본의 include(as: 'church') → 게시글 조회 후 교회 정보를 합성 (LEFT JOIN과 동일한 결과 형태)
            const board = await this.prisma.churchBoard.findFirst({
                where: { boardIdx: Number(boardIdx) }
            });

            if (!board) {
                throw new Error('Board not found');
            }

            const churchInfo = board.churchIdx != null
                ? await this.prisma.churchInfo.findFirst({
                    where: { churchIdx: Number(board.churchIdx) },
                    select: { churchName: true, churchLocation: true, churchType: true, churchPastor: true }
                })
                : null;

            const detailBoard = { ...board, church: churchInfo };

            // 조회수 증가
            await this.prisma.churchBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardHits: { increment: 1 } }
            });

            return detailBoard;
        } catch (error) {
            logger.error(`[getChurchBoardDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 후기 등록
    async insertChurchBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // ChurchBoard 테이블에 모든 데이터 저장
                const pw = boardData.writerPw || boardData.boardPw;
                const board = await tx.churchBoard.create({
                    data: {
                        churchIdx: boardData.churchIdx != null ? Number(boardData.churchIdx) : null,
                        boardTitle: boardData.boardTitle,
                        boardContent: boardData.boardContent,
                        // boardRegDate는 VARCHAR 컬럼 — 원본의 new Date() 폴백은 드라이버가 'YYYY-MM-DD HH:mm:ss.SSS'로 문자열화
                        boardRegDate: boardData.boardReg || formatDateForVarchar(new Date()),
                        boardLike: Number(boardData.boardLike) || 0,
                        boardHits: Number(boardData.boardHits) || 0,
                        boardID: boardData.boardId,
                        boardPW: pw && pw.trim() !== '' ? hashPassword(pw.trim()) : (null as any),
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

    // 교회 후기 수정
    async correctChurchBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const { boardIdx, boardTitle, boardContent, boardPw, writerPw } = boardData;

                if (!boardIdx) {
                    throw new Error('boardIdx is required');
                }

                // 기존 게시글 확인
                const existingBoard = await tx.churchBoard.findFirst({
                    where: { boardIdx: Number(boardIdx) }
                });

                if (!existingBoard) {
                    throw new Error('Board not found');
                }

                // 비밀번호 확인 (비밀번호가 있는 경우)
                const password = writerPw || boardPw;
                if (password && typeof password === 'string' && password.trim() !== '') {
                    const hashedPassword = hashPassword(password.trim());
                    if (existingBoard.boardPW !== hashedPassword) {
                        throw new Error('Invalid password');
                    }
                }

                // 게시글 수정
                await tx.churchBoard.updateMany({
                    where: { boardIdx: Number(boardIdx) },
                    data: {
                        boardTitle: boardTitle || existingBoard.boardTitle,
                        boardContent: boardContent || existingBoard.boardContent,
                    }
                });

                logger.info(`[correctChurchBoard] Board updated successfully. BoardIdx: ${boardIdx}`);
                return 'Church board updated successfully';
            });
        } catch (error) {
            logger.error(`[correctChurchBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    // 교회 후기 삭제
    async deleteChurchBoard(boardData: any) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const { boardIdx, boardPw, writerPw } = boardData;

                if (!boardIdx) {
                    throw new Error('boardIdx is required');
                }

                // 기존 게시글 확인
                const existingBoard = await tx.churchBoard.findFirst({
                    where: { boardIdx: Number(boardIdx) }
                });

                if (!existingBoard) {
                    throw new Error('Board not found');
                }

                // 비밀번호 확인
                const password = writerPw || boardPw;
                if (password && typeof password === 'string' && password.trim() !== '') {
                    const hashedPassword = hashPassword(password.trim());
                    if (existingBoard.boardPW !== hashedPassword) {
                        throw new Error('Invalid password');
                    }
                }

                // 게시글 삭제
                await tx.churchBoard.deleteMany({
                    where: { boardIdx: Number(boardIdx) }
                });

                logger.info(`[deleteChurchBoard] Board deleted successfully. BoardIdx: ${boardIdx}`);
                return 'Church board deleted successfully';
            });
        } catch (error) {
            logger.error(`[deleteChurchBoard] Error: ${error.message}. Transaction rollback.`);
            throw error;
        }
    }

    // 교회 후기 좋아요 토글
    async toggleChurchBoardLike(boardIdx: any, isLiked: boolean) {
        try {
            const board = await this.prisma.churchBoard.findFirst({
                where: { boardIdx: Number(boardIdx) }
            });

            if (!board) {
                throw new Error('Board not found');
            }

            // 현재 좋아요 수를 숫자로 변환 (문자열 연결 방지)
            const currentLikes = Number(board.boardLike) || 0;
            const newLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);

            await this.prisma.churchBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardLike: newLikes }
            });

            logger.info(`[toggleChurchBoardLike] Board like toggled. BoardIdx: ${boardIdx}, isLiked: ${isLiked}, Current: ${currentLikes}, New: ${newLikes}`);

            return {
                boardIdx: boardIdx,
                isLiked: isLiked,
                likeCount: newLikes
            };
        } catch (error) {
            logger.error(`[toggleChurchBoardLike] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 후기 좋아요 조회
    async getChurchBoardLike(boardId: string) {
        try {
            const board = await this.prisma.churchBoard.findFirst({
                where: { boardIdx: Number(boardId) }
            });

            if (!board) {
                throw new Error('Board not found');
            }

            // 구 스택은 BIGINT를 문자열로 반환("0" 등, truthy) → BigInt 그대로 반환해 replacer가 문자열화하도록 유지
            return board.boardLike ?? 0;
        } catch (error) {
            logger.error(`[getChurchBoardLike] Error: ${error.message}`);
            throw error;
        }
    }

    // 최근순으로 게시된 교회 후기 목록 조회 (교회 정보 포함)
    async getRecentChurchBoardsWithInfo() {
        try {
            const recentBoards = await this.prisma.churchBoard.findMany({
                orderBy: { boardRegDate: 'desc' },
                take: 5 // 최근 5개
            });

            // 원본의 include(as: 'church', LEFT JOIN) 형태를 합성
            const churchInfos = await this.prisma.churchInfo.findMany({
                where: { churchIdx: { in: recentBoards.filter(b => b.churchIdx != null).map(b => Number(b.churchIdx)) } },
                select: { churchIdx: true, churchName: true, churchLocation: true, churchType: true, churchPastor: true }
            });
            const churchMap = new Map(churchInfos.map(c => [String(c.churchIdx), c]));

            const data = recentBoards.map(b => {
                const c = b.churchIdx != null ? churchMap.get(String(b.churchIdx)) : undefined;
                return {
                    ...b,
                    church: c ? {
                        churchName: c.churchName,
                        churchLocation: c.churchLocation,
                        churchType: c.churchType,
                        churchPastor: c.churchPastor,
                    } : null,
                };
            });

            logger.info(`[getRecentChurchBoardsWithInfo] 최근 교회 후기 조회 완료: ${data.length}개`);

            return {
                status: 200,
                data,
                totalCount: data.length
            };
        } catch (error) {
            logger.error(`[getRecentChurchBoardsWithInfo] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회별로 후기 조회수 기준 인기 후기 TOP10 조회
    async getTopViewedChurchBoardsByChurch() {
        try {
            const topBoards = await this.prisma.churchBoard.findMany({
                orderBy: { boardHits: 'desc' },
                take: 10 // 상위 10개
            });

            // 원본의 include(as: 'church', LEFT JOIN) 형태를 합성
            const churchInfos = await this.prisma.churchInfo.findMany({
                where: { churchIdx: { in: topBoards.filter(b => b.churchIdx != null).map(b => Number(b.churchIdx)) } },
                select: { churchIdx: true, churchName: true, churchLocation: true, churchType: true, churchPastor: true }
            });
            const churchMap = new Map(churchInfos.map(c => [String(c.churchIdx), c]));

            const data = topBoards.map(b => {
                const c = b.churchIdx != null ? churchMap.get(String(b.churchIdx)) : undefined;
                return {
                    ...b,
                    church: c ? {
                        churchName: c.churchName,
                        churchLocation: c.churchLocation,
                        churchType: c.churchType,
                        churchPastor: c.churchPastor,
                    } : null,
                };
            });

            logger.info(`[getTopViewedChurchBoardsByChurch] 교회별 인기 후기 조회 완료: ${data.length}개`);

            return {
                status: 200,
                data,
                totalCount: data.length
            };
        } catch (error) {
            logger.error(`[getTopViewedChurchBoardsByChurch] Error: ${error.message}`);
            throw error;
        }
    }
}

// 구 스택(mariadb 드라이버)이 VARCHAR 컬럼에 Date를 바인딩할 때의 문자열 형식(로컬 타임존)
function formatDateForVarchar(d: Date): string {
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
