const restaurantBoardService = require('../../service/admin/restaurantBoardService');
const logger = require('../../utils/logger');

exports.getPosts = async (req, res) => {
    try {
        const result = await restaurantBoardService.listPosts(req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.restaurantboard.controller.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.createPost = async (req, res) => {
    try {
        const result = await restaurantBoardService.createPost(req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.restaurantboard.controller.create] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.updatePost = async (req, res) => {
    try {
        const { boardIdx } = req.params;
        const result = await restaurantBoardService.updatePost(boardIdx, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.restaurantboard.controller.update] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { boardIdx } = req.params;
        const result = await restaurantBoardService.deletePost(boardIdx);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.restaurantboard.controller.delete] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
