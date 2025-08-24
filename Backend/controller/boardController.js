const boardService = require('../service/boardService');
const logger = require('../utils/logger'); // 로거 파일이 필요할 경우 추가

exports.getBoards = async (req, res, next) => {
    try {
        const univIdx = req.query.univIdx;

        if (!univIdx) {
            return res.status(400).json({ error: 'univIdx is required' });
        }

        const boards = await boardService.getBoards(univIdx);
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

        const detailBoard = await boardService.getBoardDetail(boardIdx);
        res.status(200).json(detailBoard);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.insertBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await boardService.insertBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.correctBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await boardService.correctBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await boardService.deleteBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 게시판 좋아요 토글
exports.toggleBoardLike = async (req, res, next) => {
    try {
        const { boardIdx, userId } = req.body;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const result = await boardService.toggleBoardLike(boardIdx, userId);
        res.status(200).json({ success: true, message: result });
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

        const likeCount = await boardService.getBoardLike(boardId);
        res.status(200).json({ likeCount });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
