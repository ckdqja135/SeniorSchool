const userService = require('../../service/admin/userService');
const logger = require('../../utils/logger');

exports.signIn = async (req, res, next) => {
    try {
        const result = await userService.signIn(req.body);
        // JWT 토큰을 쿠키에 설정 (HttpOnly, secure, sameSite 옵션 적용)
        const cookieOptions = {
            httpOnly: true,
            secure: true, // HTTPS 환경이므로 항상 true로 설정
            sameSite: 'strict', // HTTPS 환경에서는 strict 사용 가능
        };
        res.cookie('accessToken', result.accessToken, cookieOptions);
        
        // 클라이언트의 로컬 스토리지에 저장할 수 있도록 응답에 토큰 포함
        const responseData = {
            ...result,
            accessToken: result.accessToken // 토큰을 응답 본문에 포함
        };
        
        return res.status(200).json(responseData);
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

        await userService.verifyToken(token);

        return res.status(200).json({ valid: true });
    } catch (error) {
        next(error);
    }
};

/**
 * 어드민 삭제 컨트롤러
 * req.body를 그대로 서비스단에 전달함.
 * 전달받은 데이터(어드민의 userIdx 배열)를 기반으로 어드민 데이터를 삭제하도록 개발하였음.
 */
exports.deleteAdmin = async (req, res, next) => {
    try {
        const result = await userService.deleteAdmin(req.body);
        return res.status(200).json(result);
    } catch (e) {
        next(e);
    }
};

/**
 * 어드민 추가 컨트롤러
 * req.body를 그대로 서비스단에 전달함.
 * 전달받은 데이터를 기반으로 어드민 데이터를 생성하도록 개발하였음.
 */
exports.createAdmin = async (req, res, next) => {
    try {
        const result = await userService.createAdmin(req.body);
        return res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

/**
 * 어드민 리스트 가져오기 컨트롤러
 * 별도의 인자 없이 서비스단에서 어드민 리스트를 조회하도록 개발하였음.
 */
exports.getAdminlist = async (req, res, next) => {
    try {
        const result = await userService.getAdminlist();
        return res.status(200).json(result);
    } catch (e) {
        next(e);
    }
};

/**
 * 어드민 수정 컨트롤러
 * req.body를 그대로 서비스단에 전달함.
 * 요청한 사용자의 userRole이 'master'인지 확인 후, 해당 조건을 충족하면 수정하도록 개발하였음.
 */
exports.patchAdmin = async (req, res, next) => {
    try {
        const result = await userService.patchAdmin(req.body);
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * 로그아웃 API 컨트롤러
 * req.user에 저장된 로그인 사용자 정보를 기반으로, 로그아웃 서비스를 호출하고,
 * 클라이언트 쿠키에서 accessToken 쿠키를 삭제하도록 개발하였음.
 */
exports.signOut = async (req, res, next) => {
    try {
        // 로그인된 사용자 정보는 authenticateToken 미들웨어를 통해 req.user에 세팅됨.
        logger.info(req.user)
        const result = await userService.signOut(req.user);

        // 클라이언트 쿠키에서 accessToken 쿠키를 삭제함.
        res.clearCookie('accessToken', { path: '/' });

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};