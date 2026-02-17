const requestService = require('../../service/dynamic/dynamicRequestService');
const logger = require('../../utils/logger');

exports.listRequests = async (req, res) => {
    try {
        const result = await requestService.listRequests(req.dynamicTables, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicRequest.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        const result = await requestService.updateRequestStatus(req.dynamicTables, req.params.id, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicRequest.updateStatus] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
