const userService = require('../../service/admin/userService');
const logger = require('../../utils/logger');

exports.signIn = async (req, res, next) => {
    try {
        const result = await userService.signIn(req.body);
        return res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

exports.signUp = async (req, res, next) => {
    try {
        const result = await userService.signUp(req.body);
        return res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};