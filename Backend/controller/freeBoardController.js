const freeBoardService = require('../service/freeBoardService');
const logger = require('../utils/logger');

class FreeBoardController {
    // 자유게시판 목록 조회
    async getFreeBoardList(req, res) {
        try {
            const result = await freeBoardService.getFreeBoardList(req.query);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 목록 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 상세 조회
    async getFreeBoardDetail(req, res) {
        try {
            const { id } = req.params;
            const result = await freeBoardService.getFreeBoardDetail(id);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 상세 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 게시글 작성
    async createFreeBoard(req, res) {
        try {
            const { boardTitle, boardContent, category, tags } = req.body;
            const { boardID, boardPW, boardPassword } = req.body;
            const password = typeof boardPW === 'string' && boardPW.length > 0 ? boardPW : boardPassword;

            // 필수 필드 검증
            if (!boardTitle || !boardContent || !category || !boardID || !password) {
                return res.status(400).json({
                    status: 400,
                    message: '필수 필드가 누락되었습니다.'
                });
            }

            const result = await freeBoardService.createFreeBoard({
                boardTitle,
                boardContent,
                category,
                tags,
                boardID,
                boardPW: password
            });

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 게시글 작성 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 게시글 수정
    async updateFreeBoard(req, res) {
        try {
            const { id } = req.params;
            const { boardTitle, boardContent, category, tags, boardID, boardPW, boardPassword } = req.body;
            const password = typeof boardPW === 'string' && boardPW.length > 0 ? boardPW : boardPassword;

            // 필수 필드 검증
            if (!boardTitle || !boardContent || !category || !boardID || !password) {
                return res.status(400).json({
                    status: 400,
                    message: '필수 필드가 누락되었습니다.'
                });
            }

            const result = await freeBoardService.updateFreeBoard(id, {
                boardTitle,
                boardContent,
                category,
                tags
            }, boardID, password);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 게시글 수정 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 게시글 삭제
    async deleteFreeBoard(req, res) {
        try {
            const { id } = req.params;
            const { boardID, boardPW, boardPassword } = req.body;
            const password = typeof boardPW === 'string' && boardPW.length > 0 ? boardPW : boardPassword;

            // 필수 필드 검증
            if (!boardID || !password) {
                return res.status(400).json({
                    status: 400,
                    message: '작성자 ID와 비밀번호가 필요합니다.'
                });
            }

            const result = await freeBoardService.deleteFreeBoard(id, boardID, password);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 게시글 삭제 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 작성
    async createComment(req, res) {
        try {
            const { id } = req.params;
            const { commentContent, commentParent, commentPassword, commentWriter } = req.body;

            // 필수 필드 검증
            if (!commentContent) {
                return res.status(400).json({
                    status: 400,
                    message: '댓글 내용이 필요합니다.'
                });
            }

            // writerId가 없으면 commentWriter 사용, 둘 다 없으면 기본값
            const userId = commentWriter;
            const password = commentPassword;

            const result = await freeBoardService.createComment(id, {
                commentContent,
                commentParent,
                writerId: userId,
                writerPw: password
            });

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 작성 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 수정
    async updateComment(req, res) {
        try {
            const { commentId } = req.params;
            const { commentContent, writerId, writerPw } = req.body;

            // 필수 필드 검증
            if (!commentContent || !writerId || !writerPw) {
                return res.status(400).json({
                    status: 400,
                    message: '필수 필드가 누락되었습니다.'
                });
            }

            const result = await freeBoardService.updateComment(commentId, {
                commentContent
            }, writerId, writerPw);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 수정 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 삭제
    async deleteComment(req, res) {
        try {
            const { commentId } = req.params;
            const { writerId, writerPw } = req.body;

            // 필수 필드 검증
            if (!writerId || !writerPw) {
                return res.status(400).json({
                    status: 400,
                    message: '작성자 ID와 비밀번호가 필요합니다.'
                });
            }

            const result = await freeBoardService.deleteComment(commentId, writerId, writerPw);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 삭제 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 게시글 좋아요
    async toggleBoardLike(req, res) {
        try {
            const { id } = req.params;
            const { isLiked } = req.body;
            const desiredLike = typeof isLiked === 'boolean' ? isLiked : true; // 기본값: 증가

            const result = await freeBoardService.toggleBoardLike(id, desiredLike);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`게시글 좋아요 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 좋아요
    async toggleCommentLike(req, res) {
        try {
            const { commentId } = req.params;
            const { isLiked } = req.body;
            const desiredLike = typeof isLiked === 'boolean' ? isLiked : true; // 기본값: 증가

            const result = await freeBoardService.toggleCommentLike(commentId, desiredLike);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 좋아요 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 조회수 증가
    async incrementHits(req, res) {
        try {
            const { id } = req.params;
            const result = await freeBoardService.incrementHits(id);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`조회수 증가 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 최근 게시물 조회
    async getRecentFreeBoards(req, res) {
        try {
            const result = await freeBoardService.getRecentFreeBoards();
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`최근 게시물 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 통계 조회
    async getStats(req, res) {
        try {
            const result = await freeBoardService.getStats();
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`통계 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }
}

module.exports = new FreeBoardController();
