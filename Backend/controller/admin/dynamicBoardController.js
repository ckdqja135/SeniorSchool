const boardService = require('../../service/dynamic/dynamicBoardService');
const logger = require('../../utils/logger');

exports.listBoards = async (req, res) => {
    try {
        const result = await boardService.listBoards(req.dynamicTables, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicBoard.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.deleteBoard = async (req, res) => {
    try {
        const result = await boardService.deleteBoard(req.dynamicTables, req.params.id);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicBoard.delete] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
