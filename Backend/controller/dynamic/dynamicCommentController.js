const commentService = require('../../service/dynamic/dynamicCommentService');
const logger = require('../../utils/logger');

exports.listComments = async (req, res) => {
    try {
        const result = await commentService.listComments(req.dynamicTables, req.params.boardId);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.comment.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.createComment = async (req, res) => {
    try {
        const result = await commentService.createComment(req.dynamicTables, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.comment.create] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const result = await commentService.deleteComment(req.dynamicTables, req.params.id, req.body.password);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.comment.delete] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
