const requestsService = require('../service/requestsService');
const logger = require('../utils/logger');

exports.getRecentRequests = async (req, res) => {
    try {
        const { limit } = req.query;
        const data = await requestsService.getRecentRequests({ limit });
        res.status(200).json({ status: 200, data, totalCount: data.length });
    } catch (error) {
        logger.error(`[getRecentRequests] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '신청 현황을 불러오지 못했습니다.' });
    }
};
