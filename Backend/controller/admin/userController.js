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

/**
 * 토큰 유효성 검사 컨트롤러
 * 클라이언트가 토큰(Authorization 헤더, 쿼리 파라미터 또는 쿠키에 포함)을 보내면 이를 검증하고,
 * 유효한 토큰일 경우 쿠키에 토큰을 설정하여 클라이언트에 반환합니다.
 */
exports.verifyToken = async (req, res, next) => {
    try {
        // Authorization 헤더, 쿼리 파라미터, 쿠키에서 토큰 획득
        const authHeader = req.headers.authorization;
        const tokenFromHeader = authHeader && authHeader.split(' ')[1];
        const tokenFromQuery = req.query.token;
        const tokenFromCookie = req.cookies && req.cookies.accessToken;
        const token = tokenFromHeader || tokenFromQuery || tokenFromCookie;

        if (!token) {
            return res.status(400).json({ error: 'Token is required.' });
        }

        const decoded = await userService.verifyToken(token);

        // 토큰이 유효한 경우, 쿠키에 토큰 설정 (httpOnly 옵션 사용 권장)
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        return res.status(200).json({ valid: true});
    } catch (error) {
        next(error);
    }
};