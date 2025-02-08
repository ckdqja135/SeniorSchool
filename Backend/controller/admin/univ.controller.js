const univService = require('../../service/admin/univ.service');
const logger = require('../../utils/logger');

exports.createUniv = async (req, res, next) => {
    try {
        const result = await univService.createUniv(req.body);
        return res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

exports.putUnivStatus = async (req, res, next) => {
    try {
        const { univIdx, status } = req.body;
        logger.info( `hihi : ${univIdx}, ${status}`);

        const result = await univService.puteUnivStatus(univIdx, status);

        // 상태 코드와 메시지 반환
        return res.status(result.status).json({ message: result.message });
    } catch (error) {
        next(error);
    }
};
