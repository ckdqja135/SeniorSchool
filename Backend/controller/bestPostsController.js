const bestPostsService = require('../service/bestPostsService');
const logger = require('../utils/logger');

class BestPostsController {
    // 베스트 후기 조회 (전체)
    async getTop10BestPosts(req, res) {
        try {
            const result = await bestPostsService.getTop10BestPosts();
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`베스트 후기 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

}

module.exports = new BestPostsController();

