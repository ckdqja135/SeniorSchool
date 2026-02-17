const entityService = require('../../service/dynamic/dynamicEntityService');
const logger = require('../../utils/logger');

exports.listEntities = async (req, res) => {
    try {
        const result = await entityService.listEntities(req.dynamicTables, req.fieldConfigs, req.serviceConfig, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.entity.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.getEntityDetail = async (req, res) => {
    try {
        const result = await entityService.getEntityDetail(req.dynamicTables, req.params.id);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.entity.detail] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.getTopViewed = async (req, res) => {
    try {
        const result = await entityService.getTopViewed(req.dynamicTables, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.entity.topViewed] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.autoSearch = async (req, res) => {
    try {
        const result = await entityService.autoSearch(req.dynamicTables, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[dynamic.entity.autoSearch] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
