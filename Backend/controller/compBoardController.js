const compBoardService = require('../service/compBoardService');
const logger = require('../utils/logger');

exports.getBoards = async (req, res, next) => {
    try {
        const compIdx = req.query.compIdx;
        const { id, title, content } = req.query;

        if (!compIdx) {
            return res.status(400).json({ error: 'compIdx is required' });
        }

        // 검색 매개변수 구성
        const searchParams = {};
        if (id) searchParams.id = id;
        if (title) searchParams.title = title;
        if (content) searchParams.content = content;

        const boards = await compBoardService.getBoards(compIdx, searchParams);
        res.status(200).json(boards);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getBoardDetail = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const detailBoard = await compBoardService.getBoardDetail(boardIdx);
        res.status(200).json(detailBoard);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.insertBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await compBoardService.insertBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.correctBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await compBoardService.correctBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await compBoardService.deleteBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 게시판 좋아요 토글
exports.toggleBoardLike = async (req, res, next) => {
    try {
        const { boardIdx, isLiked } = req.body;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        if (typeof isLiked !== 'boolean') {
            return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
        }

        const result = await compBoardService.toggleBoardLike(boardIdx, isLiked);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 게시판 좋아요 조회
exports.getBoardLike = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        
        if (!boardId) {
            return res.status(400).json({ error: 'boardId is required' });
        }

        const likeCount = await compBoardService.getBoardLike(boardId);
        res.status(200).json({ likeCount });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * 최근순으로 게시된 게시글 목록 조회 (회사 정보 포함)
 */
exports.getRecentBoardsWithCompInfo = async (req, res, next) => {
    try {
        const result = await compBoardService.getRecentBoardsWithCompInfo();
        res.status(200).json(result);
    } catch (error) {
        logger.error(`[getRecentBoardsWithCompInfo] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

