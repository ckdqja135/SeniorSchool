const jwt = require('jsonwebtoken');
const { User } = require('../model');  // User 모델 경로에 맞게 수정
const logger = require('../utils/logger');

// JWT 검증 및 사용자 정보 추출 미들웨어
exports.authenticateToken = async (req, res, next) => {
    //  Authorization 헤더에서 Bearer Token 추출
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.split(' ')[1];

    //  Cookie 헤더에서 accessToken 추출
    const tokenFromCookieHeader = req.headers.cookie?.split('; ')
        .find(row => row.startsWith('accessToken='))
        ?.split('=')[1];

    //  req.cookies에서 accessToken 추출 (cookie-parser 이용)
    const tokenFromCookie = req.cookies && req.cookies.accessToken;

    // 모든 가능한 위치에서 토큰을 탐색
    const token = tokenFromHeader || tokenFromCookieHeader || tokenFromCookie;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "인증 토큰이 없습니다. (로그인 필요)"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ where: { userId: decoded.userId } });

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "사용자를 찾을 수 없습니다."
            });
        }

        req.user = user; // 사용자 정보 추가
        next();
    } catch (error) {
        // 토큰 만료 에러 구분
        if (error.name === 'TokenExpiredError') {
            // 만료된 토큰인 경우 쿠키 삭제
            res.clearCookie('accessToken', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict'
            });
            
            return res.status(401).json({
                success: false,
                message: "토큰이 만료되었습니다. 다시 로그인해주세요.",
                expired: true
            });
        }
        
        // 기타 토큰 에러 (유효하지 않은 토큰)
        return res.status(401).json({
            success: false,
            message: "유효하지 않은 토큰입니다. 다시 로그인해주세요.",
            error: error.message
        });
    }
};
// 어드민 권한 체크 미들웨어
exports.isAdmin = async (req, res, next) => {
    const { userRole } = req.user;

    if (userRole !== 'admin' && userRole !== 'master') {
        return res.status(403).json({
            success: false,
            message: "권한이 없습니다. (admin 계정 필요)"
        });
    }

    next();
};

// 마스터 권한 체크 미들웨어
exports.isMaster = async (req, res, next) => {
    const { userRole } = req.user;

    if (userRole !== 'master') {
        return res.status(403).json({
            success: false,
            message: "권한이 없습니다. (master 계정 필요)"
        });
    }

    next();
};
