// Backend/service/freeBoardService.js의 Prisma 포팅.
// 자유게시판(글/댓글/좋아요/통계)을 단일 서비스로 처리한다 (원본도 단일 서비스/라우터).
//
// 포팅 시 주의한 랜드마인:
//  - tags: 원본 Sequelize 모델은 tags를 JSON 타입으로 선언 → 읽을 때 자동 파싱(배열/객체) 반환.
//    Prisma 스키마는 tags를 String?(@db.LongText)로 introspect → 원문 문자열 반환.
//    따라서 원본 출력과 동일하게 하려면 서비스에서 JSON.parse 해야 한다.
//  - isDeleted: 원본 BOOLEAN(false) 필터 → Prisma는 Int(tinyint)이므로 0으로 필터.
//    (isDeleted는 어떤 응답에서도 select되지 않으므로 출력 형태에는 영향 없음)
//  - BigInt(boardIdx/boardLike/boardHits/commentIdx 등) → main.ts의 json replacer가 문자열로 직렬화.
//  - getStats의 카테고리 COUNT는 구 스택에서 BIGINT → 문자열이므로 raw SQL + serializeRows로 재현.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class FreeBoardService {
    constructor(private readonly prisma: PrismaService) {}

    // 원본 Sequelize.JSON 어트리뷰트의 읽기 동작 재현: 문자열 → 파싱, null → null.
    private parseTags(tags: string | null): any {
        if (tags == null) return null;
        try {
            return JSON.parse(tags);
        } catch {
            return tags;
        }
    }

    // 자유게시판 목록 조회
    async getFreeBoardList(query: any) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                category = '',
                sort = 'latest'
            } = query;

            const offset = (page - 1) * limit;
            const whereClause: any = {
                isDeleted: 0
            };

            // 검색 조건
            if (search) {
                whereClause.OR = [
                    { boardTitle: { contains: `${search}` } },
                    { boardContent: { contains: `${search}` } },
                    { category: { contains: `${search}` } },
                    { tags: { contains: `${search}` } }
                ];
            }

            // 카테고리 필터
            if (category) {
                whereClause.category = category;
            }

            // 정렬 조건
            let orderClause: any;
            switch (sort) {
                case 'popular':
                    orderClause = [{ boardLike: 'desc' }, { boardHits: 'desc' }, { boardRegDate: 'desc' }];
                    break;
                case 'oldest':
                    orderClause = [{ boardRegDate: 'asc' }];
                    break;
                case 'latest':
                default:
                    orderClause = [{ boardRegDate: 'desc' }];
                    break;
            }

            const totalCount = await this.prisma.freeBoard.count({ where: whereClause });
            const boards = await this.prisma.freeBoard.findMany({
                where: whereClause,
                orderBy: orderClause,
                take: parseInt(limit),
                skip: offset,
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardRegDate: true,
                    boardLike: true,
                    boardHits: true,
                    boardID: true,
                    category: true,
                    tags: true
                }
            });

            const totalPages = Math.ceil(totalCount / limit);
            const data = boards.map(b => ({ ...b, tags: this.parseTags(b.tags) }));

            return {
                status: 200,
                data,
                totalCount,
                currentCount: boards.length,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error(`자유게시판 목록 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 자유게시판 상세 조회
    async getFreeBoardDetail(boardIdx: string) {
        try {
            const board = await this.prisma.freeBoard.findFirst({
                where: { boardIdx: Number(boardIdx), isDeleted: 0 },
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardRegDate: true,
                    boardLike: true,
                    boardHits: true,
                    boardID: true,
                    category: true,
                    tags: true
                }
            });

            if (!board) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            // 조회수 증가 (boardModDate 보존 — increment만 수행하므로 다른 컬럼은 변경되지 않음)
            await this.prisma.freeBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardHits: { increment: 1 } }
            });

            // 댓글 조회 (계층 구조)
            const comments = await this.getCommentsByBoardId(boardIdx);

            const post = { ...board, tags: this.parseTags(board.tags) };

            return {
                status: 200,
                data: {
                    post,
                    comments
                }
            };
        } catch (error) {
            logger.error(`자유게시판 상세 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 댓글 조회 (계층 구조)
    async getCommentsByBoardId(boardIdx: string) {
        try {
            const comments = await this.prisma.freeBoardComment.findMany({
                where: { boardIdx: Number(boardIdx), isDeleted: 0 },
                orderBy: [{ commentParent: 'asc' }, { commentRegDate: 'asc' }],
                select: {
                    commentIdx: true,
                    boardIdx: true,
                    commentLike: true,
                    commentDepth: true,
                    writerId: true,
                    commentParent: true,
                    commentContent: true,
                    commentRegDate: true
                }
            });

            // 계층 구조로 변환
            // 원본의 root 판정은 `commentParent === null || commentParent === 0`이나
            // 구 스택에서 commentParent는 문자열/BigInt라 `=== 0`(number)는 죽은 분기다.
            // 실제 root는 항상 null(작성 시 `commentParent || null`)이므로 null만 판정한다.
            // (commentParent가 0인 데이터가 있어도 부모 0을 못 찾아 드롭되는 원본 동작과 동일)
            const commentMap = new Map<any, any>();
            const rootComments: any[] = [];

            comments.forEach(comment => {
                const node: any = { ...comment, replies: [] };
                commentMap.set(comment.commentIdx, node);

                if (comment.commentParent === null) {
                    rootComments.push(node);
                } else {
                    const parent = commentMap.get(comment.commentParent);
                    if (parent) {
                        parent.replies.push(node);
                    }
                }
            });

            return rootComments;
        } catch (error) {
            logger.error(`댓글 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 자유게시판 게시글 작성 (원본에서 라우팅되진 않으나 서비스 API로 보존)
    async createFreeBoard(boardData: any) {
        try {
            const { boardTitle, boardContent, category, tags, boardID, boardPW } = boardData;

            const board = await this.prisma.freeBoard.create({
                data: {
                    boardTitle,
                    boardContent,
                    category,
                    tags: JSON.stringify(tags || []),
                    boardID,
                    boardPW: hashPassword(boardPW) // SHA256 암호화 적용
                }
            });

            // 통계 업데이트
            await this.updateStats(category, tags);

            return {
                status: 201,
                data: {
                    boardIdx: board.boardIdx,
                    message: '게시글이 성공적으로 작성되었습니다.'
                }
            };
        } catch (error) {
            logger.error(`자유게시판 게시글 작성 오류: ${error.message}`);
            throw error;
        }
    }

    // 자유게시판 게시글 수정
    async updateFreeBoard(boardIdx: string, boardData: any, boardID: string, boardPW: string) {
        try {
            const board = await this.prisma.freeBoard.findFirst({
                where: { boardIdx: Number(boardIdx), isDeleted: 0 }
            });

            if (!board) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (board.boardID !== boardID || board.boardPW !== hashPassword(boardPW)) {
                return { status: 403, message: '수정 권한이 없습니다.' };
            }

            const { boardTitle, boardContent, category, tags } = boardData;

            await this.prisma.freeBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: {
                    boardTitle,
                    boardContent,
                    category,
                    tags: JSON.stringify(tags || []),
                    boardModDate: new Date()
                }
            });

            return {
                status: 200,
                data: {
                    message: '게시글이 성공적으로 수정되었습니다.'
                }
            };
        } catch (error) {
            logger.error(`자유게시판 게시글 수정 오류: ${error.message}`);
            throw error;
        }
    }

    // 자유게시판 게시글 삭제
    async deleteFreeBoard(boardIdx: string, boardID: string, boardPW: string) {
        try {
            const board = await this.prisma.freeBoard.findFirst({
                where: { boardIdx: Number(boardIdx), isDeleted: 0 }
            });

            if (!board) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (board.boardID !== boardID || board.boardPW !== hashPassword(boardPW)) {
                return { status: 403, message: '삭제 권한이 없습니다.' };
            }

            await this.prisma.freeBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { isDeleted: 1 }
            });

            return {
                status: 200,
                data: {
                    message: '게시글이 성공적으로 삭제되었습니다.'
                }
            };
        } catch (error) {
            logger.error(`자유게시판 게시글 삭제 오류: ${error.message}`);
            throw error;
        }
    }

    // 댓글 작성
    async createComment(boardIdx: string, commentData: any) {
        try {
            const { commentContent, commentParent, writerId, writerPw } = commentData;

            const comment = await this.prisma.freeBoardComment.create({
                data: {
                    boardIdx: Number(boardIdx),
                    commentContent,
                    commentParent: commentParent != null ? Number(commentParent) : null,
                    commentDepth: commentParent ? 1 : 0,
                    writerId,
                    writerPw: hashPassword(writerPw) // SHA256 암호화 적용
                }
            });

            return {
                status: 201,
                data: {
                    commentIdx: comment.commentIdx,
                    message: '댓글이 성공적으로 작성되었습니다.'
                }
            };
        } catch (error) {
            logger.error(`댓글 작성 오류: ${error.message}`);
            throw error;
        }
    }

    // 댓글 수정
    async updateComment(commentIdx: string, commentData: any, writerId: string, writerPw: string) {
        try {
            const comment = await this.prisma.freeBoardComment.findFirst({
                where: { commentIdx: Number(commentIdx), isDeleted: 0 }
            });

            if (!comment) {
                return { status: 404, message: '댓글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (comment.writerId !== writerId || comment.writerPw !== hashPassword(writerPw)) {
                return { status: 403, message: '수정 권한이 없습니다.' };
            }

            const { commentContent } = commentData;

            await this.prisma.freeBoardComment.updateMany({
                where: { commentIdx: Number(commentIdx) },
                data: {
                    commentContent,
                    commentModDate: new Date()
                }
            });

            return {
                status: 200,
                data: {
                    message: '댓글이 성공적으로 수정되었습니다.'
                }
            };
        } catch (error) {
            logger.error(`댓글 수정 오류: ${error.message}`);
            throw error;
        }
    }

    // 댓글 삭제
    async deleteComment(commentIdx: string, writerId: string, writerPw: string) {
        try {
            const comment = await this.prisma.freeBoardComment.findFirst({
                where: { commentIdx: Number(commentIdx), isDeleted: 0 }
            });

            if (!comment) {
                return { status: 404, message: '댓글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (comment.writerId !== writerId || comment.writerPw !== hashPassword(writerPw)) {
                return { status: 403, message: '삭제 권한이 없습니다.' };
            }

            await this.prisma.freeBoardComment.updateMany({
                where: { commentIdx: Number(commentIdx) },
                data: { isDeleted: 1 }
            });

            return {
                status: 200,
                data: {
                    message: '댓글이 성공적으로 삭제되었습니다.'
                }
            };
        } catch (error) {
            logger.error(`댓글 삭제 오류: ${error.message}`);
            throw error;
        }
    }

    // 게시글 좋아요 토글
    async toggleBoardLike(boardIdx: string, isLiked: boolean) {
        try {
            const board = await this.prisma.freeBoard.findFirst({
                where: { boardIdx: Number(boardIdx) },
                select: { boardIdx: true, boardLike: true }
            });

            if (!board) {
                return { status: 404, data: { message: '게시글을 찾을 수 없습니다.' } };
            }

            // 현재 좋아요 수를 숫자로 변환 (문자열 연결 방지)
            const currentLikes = Number(board.boardLike) || 0;
            const delta = isLiked ? 1 : -1;
            const nextLikes = Math.max(0, currentLikes + delta);

            await this.prisma.freeBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardLike: nextLikes }
            });

            const action = isLiked ? 'increased' : 'decreased';
            logger.info(`게시글 좋아요 ${action} - boardIdx: ${boardIdx}, Current: ${currentLikes}, New: ${nextLikes}`);

            return {
                status: 200,
                data: {
                    message: `게시글 좋아요가 ${action}되었습니다.`,
                    currentLikes: nextLikes,
                    liked: isLiked
                }
            };
        } catch (error) {
            logger.error(`게시글 좋아요 토글 오류: ${error.message}`);
            throw error;
        }
    }

    // 댓글 좋아요 토글
    async toggleCommentLike(commentIdx: string, isLiked: boolean) {
        try {
            const comment = await this.prisma.freeBoardComment.findFirst({
                where: { commentIdx: Number(commentIdx) },
                select: { commentIdx: true, commentLike: true }
            });

            if (!comment) {
                return { status: 404, data: { message: '댓글을 찾을 수 없습니다.' } };
            }

            const delta = isLiked ? 1 : -1;
            const nextLikes = Math.max(0, Number(comment.commentLike || 0) + delta);
            await this.prisma.freeBoardComment.updateMany({
                where: { commentIdx: Number(commentIdx) },
                data: { commentLike: nextLikes }
            });

            const action = isLiked ? 'increased' : 'decreased';
            logger.info(`댓글 좋아요 ${action} - commentIdx: ${commentIdx}, 현재 좋아요: ${nextLikes}`);

            return {
                status: 200,
                data: {
                    message: `댓글 좋아요가 ${action}되었습니다.`,
                    currentLikes: nextLikes,
                    liked: isLiked
                }
            };
        } catch (error) {
            logger.error(`댓글 좋아요 토글 오류: ${error.message}`);
            throw error;
        }
    }

    // 조회수 증가
    async incrementHits(boardIdx: string) {
        try {
            await this.prisma.freeBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardHits: { increment: 1 } }
            });
            return { status: 200, data: { message: '조회수가 증가되었습니다.' } };
        } catch (error) {
            logger.error(`조회수 증가 오류: ${error.message}`);
            throw error;
        }
    }

    // 통계 조회
    async getStats() {
        try {
            // 카테고리 통계 (실제 데이터베이스에서 집계)
            // 구 스택은 COUNT를 BIGINT → 문자열로 반환하므로 raw SQL + serializeRows로 동일하게 맞춘다.
            const categoryStats = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(
                `SELECT category, COUNT(boardIdx) AS count
                 FROM tb_freeboard
                 WHERE isDeleted = 0
                 GROUP BY category
                 ORDER BY COUNT(boardIdx) DESC
                 LIMIT 10`
            ));

            // 태그 통계 (JSON 배열에서 추출하여 집계)
            const allBoards = await this.prisma.freeBoard.findMany({
                where: {
                    isDeleted: 0,
                    tags: { not: null }
                },
                select: { tags: true }
            });

            // 태그 카운트 집계
            const tagCounts: Record<string, number> = {};
            allBoards.forEach(board => {
                const parsed = this.parseTags(board.tags);
                if (parsed && Array.isArray(parsed)) {
                    parsed.forEach((tag: any) => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            });

            // 태그를 카운트 순으로 정렬
            const topTags = Object.entries(tagCounts)
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                status: 200,
                data: {
                    topCategories: categoryStats,
                    topTags: topTags
                }
            };
        } catch (error) {
            logger.error(`통계 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 최근 게시물 조회 (5개)
    async getRecentFreeBoards() {
        try {
            const boards = await this.prisma.freeBoard.findMany({
                where: { isDeleted: 0 },
                orderBy: { boardRegDate: 'desc' },
                take: 5,
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardRegDate: true,
                    boardLike: true,
                    boardHits: true,
                    boardID: true,
                    category: true,
                    tags: true
                }
            });

            const data = boards.map(b => ({ ...b, tags: this.parseTags(b.tags) }));

            return {
                status: 200,
                data
            };
        } catch (error) {
            logger.error(`최근 게시물 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 일괄 게시글 등록
    async bulkCreateFreeBoards(boardsData: any[]) {
        try {
            const results: any[] = [];
            const errors: any[] = [];

            for (let i = 0; i < boardsData.length; i++) {
                try {
                    const boardData = boardsData[i];
                    const {
                        boardTitle,
                        boardContent,
                        category,
                        tags,
                        boardID,
                        boardPW
                    } = boardData;

                    // 필수 필드 검증
                    if (!boardTitle || !boardContent || !category || !boardID || !boardPW) {
                        errors.push({
                            index: i,
                            error: '필수 필드가 누락되었습니다.',
                            data: boardData
                        });
                        continue;
                    }

                    const board = await this.prisma.freeBoard.create({
                        data: {
                            boardTitle,
                            boardContent,
                            category,
                            tags: JSON.stringify(tags || []),
                            boardID,
                            boardPW: hashPassword(boardPW) // SHA256 암호화 적용
                        }
                    });

                    results.push({
                        index: i,
                        boardIdx: board.boardIdx,
                        boardTitle: board.boardTitle,
                        status: 'success'
                    });

                    // 통계 업데이트
                    await this.updateStats(category, tags);
                } catch (error) {
                    errors.push({
                        index: i,
                        error: error.message,
                        data: boardsData[i]
                    });
                }
            }

            return {
                status: 200,
                data: {
                    message: `${results.length}개 작성완료`,
                    totalProcessed: boardsData.length,
                    successCount: results.length,
                    errorCount: errors.length,
                    results: results,
                    errors: errors
                }
            };
        } catch (error) {
            logger.error(`일괄 게시글 등록 오류: ${error.message}`);
            throw error;
        }
    }

    // 통계 업데이트 (원본과 동일하게 내부 오류는 삼키고 throw하지 않음)
    async updateStats(category: string, tags: any) {
        try {
            // 카테고리 통계 업데이트 (findOrCreate + increment 재현)
            const categoryStat = await this.prisma.freeBoardStats.findFirst({
                where: { category, tag: null }
            });
            if (!categoryStat) {
                await this.prisma.freeBoardStats.create({ data: { category, tag: null, count: 1 } });
            } else {
                await this.prisma.freeBoardStats.update({
                    where: { statIdx: categoryStat.statIdx },
                    data: { count: { increment: 1 } }
                });
            }

            // 태그 통계 업데이트
            if (tags && Array.isArray(tags)) {
                for (const tag of tags) {
                    const tagStat = await this.prisma.freeBoardStats.findFirst({
                        where: { category, tag }
                    });
                    if (!tagStat) {
                        await this.prisma.freeBoardStats.create({ data: { category, tag, count: 1 } });
                    } else {
                        await this.prisma.freeBoardStats.update({
                            where: { statIdx: tagStat.statIdx },
                            data: { count: { increment: 1 } }
                        });
                    }
                }
            }
        } catch (error) {
            logger.error(`통계 업데이트 오류: ${error.message}`);
        }
    }
}
