const { FreeBoard, FreeBoardComment, FreeBoardStats, sequelize } = require('../model');
const { Op } = require('sequelize');
const crypto = require('crypto');
const logger = require('../utils/logger');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

class FreeBoardService {
    // 자유게시판 목록 조회
    async getFreeBoardList(query) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                category = '',
                sort = 'latest'
            } = query;

            const offset = (page - 1) * limit;
            const whereClause = {
                isDeleted: false
            };

            // 검색 조건
            if (search) {
                whereClause[Op.or] = [
                    { boardTitle: { [Op.like]: `%${search}%` } },
                    { boardContent: { [Op.like]: `%${search}%` } },
                    { category: { [Op.like]: `%${search}%` } },
                    { tags: { [Op.like]: `%${search}%` } }
                ];
            }

            // 카테고리 필터
            if (category) {
                whereClause.category = category;
            }

            // 정렬 조건
            let orderClause;
            switch (sort) {
                case 'popular':
                    orderClause = [['boardLike', 'DESC'], ['boardHits', 'DESC'], ['boardRegDate', 'DESC']];
                    break;
                case 'oldest':
                    orderClause = [['boardRegDate', 'ASC']];
                    break;
                case 'latest':
                default:
                    orderClause = [['boardRegDate', 'DESC']];
                    break;
            }

            const { count: totalCount, rows: boards } = await FreeBoard.findAndCountAll({
                where: whereClause,
                order: orderClause,
                limit: parseInt(limit),
                offset: offset,
                attributes: [
                    'boardIdx', 'boardTitle', 'boardContent', 'boardRegDate',
                    'boardLike', 'boardHits', 'boardID', 'category', 'tags'
                ]
            });

            const totalPages = Math.ceil(totalCount / limit);

            return {
                status: 200,
                data: boards,
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
    async getFreeBoardDetail(boardIdx) {
        try {
            const board = await FreeBoard.findOne({
                where: { boardIdx, isDeleted: false },
                attributes: [
                    'boardIdx', 'boardTitle', 'boardContent', 'boardRegDate',
                    'boardLike', 'boardHits', 'boardID', 'category', 'tags'
                ]
            });

            if (!board) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            // 조회수 증가
            await board.increment('boardHits');

            // 댓글 조회 (계층 구조)
            const comments = await this.getCommentsByBoardId(boardIdx);

            return {
                status: 200,
                data: {
                    post: board,
                    comments: comments
                }
            };
        } catch (error) {
            logger.error(`자유게시판 상세 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 댓글 조회 (계층 구조)
    async getCommentsByBoardId(boardIdx) {
        try {
            const comments = await FreeBoardComment.findAll({
                where: { boardIdx, isDeleted: false },
                order: [['commentParent', 'ASC'], ['commentRegDate', 'ASC']],
                attributes: [
                    'commentIdx', 'boardIdx', 'commentLike', 'commentDepth',
                    'writerId', 'commentParent', 'commentContent', 'commentRegDate'
                ]
            });

            // 계층 구조로 변환
            const commentMap = new Map();
            const rootComments = [];

            comments.forEach(comment => {
                comment.dataValues.replies = [];
                commentMap.set(comment.commentIdx, comment);

                if (comment.commentParent === null || comment.commentParent === 0) {
                    rootComments.push(comment);
                } else {
                    const parent = commentMap.get(comment.commentParent);
                    if (parent) {
                        parent.dataValues.replies.push(comment);
                    }
                }
            });

            return rootComments;
        } catch (error) {
            logger.error(`댓글 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 자유게시판 게시글 작성
    async createFreeBoard(boardData) {
        try {
            const { boardTitle, boardContent, category, tags, boardID, boardPW } = boardData;

            const board = await FreeBoard.create({
                boardTitle,
                boardContent,
                category,
                tags: tags || [],
                boardID,
                boardPW: hashPassword(boardPW) // SHA256 암호화 적용
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
    async updateFreeBoard(boardIdx, boardData, boardID, boardPW) {
        try {
            const board = await FreeBoard.findOne({
                where: { boardIdx, isDeleted: false }
            });

            if (!board) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (board.boardID !== boardID || board.boardPW !== hashPassword(boardPW)) {
                return { status: 403, message: '수정 권한이 없습니다.' };
            }

            const { boardTitle, boardContent, category, tags } = boardData;

            await board.update({
                boardTitle,
                boardContent,
                category,
                tags: tags || [],
                boardModDate: new Date()
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
    async deleteFreeBoard(boardIdx, boardID, boardPW) {
        try {
            const board = await FreeBoard.findOne({
                where: { boardIdx, isDeleted: false }
            });

            if (!board) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (board.boardID !== boardID || board.boardPW !== hashPassword(boardPW)) {
                return { status: 403, message: '삭제 권한이 없습니다.' };
            }

            await board.update({ isDeleted: true });

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
    async createComment(boardIdx, commentData) {
        try {
            const { commentContent, commentParent, writerId, writerPw } = commentData;

            const comment = await FreeBoardComment.create({
                boardIdx,
                commentContent,
                commentParent: commentParent || null,
                commentDepth: commentParent ? 1 : 0,
                writerId,
                writerPw: hashPassword(writerPw) // SHA256 암호화 적용
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
    async updateComment(commentIdx, commentData, writerId, writerPw) {
        try {
            const comment = await FreeBoardComment.findOne({
                where: { commentIdx, isDeleted: false }
            });

            if (!comment) {
                return { status: 404, message: '댓글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (comment.writerId !== writerId || comment.writerPw !== hashPassword(writerPw)) {
                return { status: 403, message: '수정 권한이 없습니다.' };
            }

            const { commentContent } = commentData;

            await comment.update({
                commentContent,
                commentModDate: new Date()
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
    async deleteComment(commentIdx, writerId, writerPw) {
        try {
            const comment = await FreeBoardComment.findOne({
                where: { commentIdx, isDeleted: false }
            });

            if (!comment) {
                return { status: 404, message: '댓글을 찾을 수 없습니다.' };
            }

            // 작성자 확인
            if (comment.writerId !== writerId || comment.writerPw !== hashPassword(writerPw)) {
                return { status: 403, message: '삭제 권한이 없습니다.' };
            }

            await comment.update({ isDeleted: true });

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
    async toggleBoardLike(boardIdx, isLiked) {
        try {
            const board = await FreeBoard.findOne({
                where: { boardIdx },
                attributes: ['boardIdx', 'boardLike']
            });

            if (!board) {
                return { status: 404, data: { message: '게시글을 찾을 수 없습니다.' } };
            }

            const delta = isLiked ? 1 : -1;
            const nextLikes = Math.max(0, Number(board.boardLike || 0) + delta);
            await board.update({ boardLike: nextLikes });

            const action = isLiked ? 'increased' : 'decreased';
            logger.info(`게시글 좋아요 ${action} - boardIdx: ${boardIdx}, 현재 좋아요: ${nextLikes}`);

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
    async toggleCommentLike(commentIdx, isLiked) {
        try {
            const comment = await FreeBoardComment.findOne({
                where: { commentIdx },
                attributes: ['commentIdx', 'commentLike']
            });

            if (!comment) {
                return { status: 404, data: { message: '댓글을 찾을 수 없습니다.' } };
            }

            const delta = isLiked ? 1 : -1;
            const nextLikes = Math.max(0, Number(comment.commentLike || 0) + delta);
            await comment.update({ commentLike: nextLikes });

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
    async incrementHits(boardIdx) {
        try {
            await FreeBoard.increment('boardHits', { where: { boardIdx } });
            return { status: 200, data: { message: '조회수가 증가되었습니다.' } };
        } catch (error) {
            logger.error(`조회수 증가 오류: ${error.message}`);
            throw error;ㄹㄹ
        }
    }

    // 통계 조회
    async getStats() {
        try {
            // 카테고리 통계 (실제 데이터베이스에서 집계)
            const categoryStats = await FreeBoard.findAll({
                where: { isDeleted: false },
                attributes: [
                    'category',
                    [sequelize.fn('COUNT', sequelize.col('boardIdx')), 'count']
                ],
                group: ['category'],
                order: [[sequelize.fn('COUNT', sequelize.col('boardIdx')), 'DESC']],
                limit: 10,
                raw: true
            });

            // 태그 통계 (JSON 배열에서 추출하여 집계)
            const allBoards = await FreeBoard.findAll({
                where: { 
                    isDeleted: false,
                    tags: { [Op.ne]: null }
                },
                attributes: ['tags']
            });

            // 태그 카운트 집계
            const tagCounts = {};
            allBoards.forEach(board => {
                if (board.tags && Array.isArray(board.tags)) {
                    board.tags.forEach(tag => {
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
            const boards = await FreeBoard.findAll({
                where: { isDeleted: false },
                order: [['boardRegDate', 'DESC']],
                limit: 5,
                attributes: [
                    'boardIdx', 'boardTitle', 'boardContent', 'boardRegDate',
                    'boardLike', 'boardHits', 'boardID', 'category', 'tags'
                ]
            });

            return {
                status: 200,
                data: boards
            };
        } catch (error) {
            logger.error(`최근 게시물 조회 오류: ${error.message}`);
            throw error;
        }
    }

    // 일괄 게시글 등록
    async bulkCreateFreeBoards(boardsData) {
        try {
            const results = [];
            const errors = [];

            for (let i = 0; i < boardsData.length; i++) {
                try {
                    const boardData = boardsData[i];
                    const { 
                        boardTitle, 
                        boardContent, 
                        category, 
                        tags, 
                        boardID, 
                        boardPW,
                        // 기존 데이터에서 제외할 필드들 (DB에서 자동 생성)
                        boardRegDate,
                        boardModDate,
                        boardLike,
                        boardHits,
                        isDeleted,
                        boardIdx
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

                    const board = await FreeBoard.create({
                        boardTitle,
                        boardContent,
                        category,
                        tags: tags || [],
                        boardID,
                        boardPW: hashPassword(boardPW) // SHA256 암호화 적용
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

    // 통계 업데이트
    async updateStats(category, tags) {
        try {
            // 카테고리 통계 업데이트
            const [categoryStat, created] = await FreeBoardStats.findOrCreate({
                where: { category, tag: null },
                defaults: { count: 1 }
            });

            if (!created) {
                await categoryStat.increment('count');
            }

            // 태그 통계 업데이트
            if (tags && Array.isArray(tags)) {
                for (const tag of tags) {
                    const [tagStat, created] = await FreeBoardStats.findOrCreate({
                        where: { category, tag },
                        defaults: { count: 1 }
                    });

                    if (!created) {
                        await tagStat.increment('count');
                    }
                }
            }
        } catch (error) {
            logger.error(`통계 업데이트 오류: ${error.message}`);
        }
    }
}

module.exports = new FreeBoardService();
