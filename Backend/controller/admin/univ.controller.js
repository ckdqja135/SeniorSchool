const univService = require('../../service/admin/univ.service');

exports.createUniv = async (req, res, next) => {
    try {
        const result = await univService.createUniv(req.body);
        return res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

exports.puteUnivStatus = async (req, res, next) => {
    try {
        const { univId } = req.params;
        const { status } = req.body;
        const result = await univService.puteUnivStatus(univId, status);
        return res.status(200).json(result);
    } catch (e) {
        next(e);
    }
};