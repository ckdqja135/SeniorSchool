const boardService = require('../../service/dynamic/dynamicBoardService');
const logger = require('../../utils/logger');

exports.listBoards = async (req, res) => {
    try {
        const result = await boardService.listBoards(req.dynamicTables, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.board.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.getBoardDetail = async (req, res) => {
    try {
        const result = await boardService.getBoardDetail(req.dynamicTables, req.params.id);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.board.detail] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.getRecentBoards = async (req, res) => {
    try {
        const result = await boardService.getRecentBoards(req.dynamicTables, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.board.recent] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.getTopViewedBoards = async (req, res) => {
    try {
        const result = await boardService.getTopViewedBoards(req.dynamicTables, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.board.topViewed] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.insertBoard = async (req, res) => {
    try {
        const result = await boardService.insertBoard(req.dynamicTables, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.board.insert] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.toggleBoardLike = async (req, res) => {
    try {
        const result = await boardService.toggleBoardLike(req.dynamicTables, req.params.id);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.board.like] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
