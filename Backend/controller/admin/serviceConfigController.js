const service = require('../../service/admin/serviceConfigService');
const logger = require('../../utils/logger');

exports.listServices = async (req, res) => {
    try {
        const result = await service.listServices(req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.serviceConfig.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.getService = async (req, res) => {
    try {
        const result = await service.getServiceBySlug(req.params.slug);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.serviceConfig.get] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.createService = async (req, res) => {
    try {
        const result = await service.createService(req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.serviceConfig.create] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.updateService = async (req, res) => {
    try {
        const result = await service.updateService(req.params.slug, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.serviceConfig.update] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const result = await service.deleteService(req.params.slug);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.serviceConfig.delete] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
