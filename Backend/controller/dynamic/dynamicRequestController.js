const requestService = require('../../service/dynamic/dynamicRequestService');
const logger = require('../../utils/logger');

exports.createRequest = async (req, res) => {
    try {
        const result = await requestService.createRequest(req.dynamicTables, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.request.create] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
