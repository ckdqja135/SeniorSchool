const boardService = require('../service/boardService');
const logger = require('../utils/logger'); // 로거 파일이 필요할 경우 추가

exports.getBoards = async (req, res, next) => {
    try {
        const univNo = req.query.UnivNo;
        const boards = await boardService.getBoards(univNo);
        res.status(200).json(boards);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getBoardDetail = async (req, res, next) => {
    try {
        const boardNo = req.query.boardNo;
        const detailBoard = await boardService.getBoardDetail(boardNo);
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
