const entityService = require('../../service/dynamic/dynamicEntityService');
const logger = require('../../utils/logger');

exports.searchEntities = async (req, res) => {
    try {
        const result = await entityService.listEntities(req.dynamicTables, req.fieldConfigs, req.serviceConfig, req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicEntity.search] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.createEntity = async (req, res) => {
    try {
        const result = await entityService.createEntity(req.dynamicTables, req.fieldConfigs, req.serviceConfig, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicEntity.create] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.updateEntity = async (req, res) => {
    try {
        const result = await entityService.updateEntity(req.dynamicTables, req.fieldConfigs, req.serviceConfig, req.params.id, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicEntity.update] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.deleteEntity = async (req, res) => {
    try {
        const result = await entityService.deleteEntity(req.dynamicTables, req.params.id);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.dynamicEntity.delete] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
