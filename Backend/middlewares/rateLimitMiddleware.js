const rateLimit = require('express-rate-limit');

const rateLimitMiddleware = (app) => {
    // 개발 환경 감지
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
    
    if (isDevelopment) {
        // 개발 환경: 매우 관대한 설정
        const devLimiter = rateLimit({
            windowMs: 1 * 60 * 1000, // 1분
            max: 10000, // IP당 1분 동안 최대 10000회 요청
            message: {
                status: 429,
                message: '개발 환경에서도 너무 많은 요청이 발생했습니다.'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true,
        });
        
        // app.use('/api/', devLimiter);
        // console.log('🔧 개발 환경: Rate Limiting 비활성화됨');
        return;
    }
    
    // 로그인 엔드포인트에 대한 적절한 Rate Limiting (성공한 요청은 카운트하지 않음)
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15분
        max: 20, // IP당 15분 동안 최대 20회 요청 (실패한 요청만 카운트)
        message: {
            status: 429,
            message: '보안상 너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // 성공한 로그인 요청은 카운트하지 않음
    });

    // 로그인 엔드포인트 체크 헬퍼 함수
    const isLoginEndpoint = (req) => {
        const path = req.path || '';
        const originalUrl = req.originalUrl || '';
        const url = req.url || '';
        // 다양한 경로 형식 지원
        return path.includes('/user/signIn') || 
               originalUrl.includes('/admin/user/signIn') || 
               url.includes('/user/signIn');
    };

    // 로그인/회원가입 등 민감한 API에 대한 엄격한 Rate Limiting
    const strictLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15분
        max: 5, // IP당 15분 동안 최대 5회 요청
        message: {
            status: 429,
            message: '보안상 너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
        skip: (req) => {
            // 로그인 엔드포인트는 제외 (별도 limiter 적용)
            return isLoginEndpoint(req);
        }
    });

    // 프로덕션 환경: 적절한 보안 설정
    const generalLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1분
        max: 50, // IP당 1분 동안 최대 50회 요청
        message: {
            status: 429,
            message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
        skip: (req) => {
            // 로그인 엔드포인트는 제외 (별도 limiter 적용)
            return isLoginEndpoint(req);
        }
    });

    // 로그인 엔드포인트에 별도 제한 적용 (성공한 요청은 카운트하지 않음)
    // 다른 limiter보다 먼저 적용하여 우선순위 확보
    app.use('/admin/user/signIn', loginLimiter);
    
    // 다른 어드민 API에 엄격한 제한 적용 (로그인 엔드포인트 제외)
    // 로그인 엔드포인트는 skip 함수로 제외됨
    app.use('/admin', (req, res, next) => {
        // 로그인 엔드포인트는 strictLimiter를 건너뜀
        if (isLoginEndpoint(req)) {
            return next();
        }
        return strictLimiter(req, res, next);
    });
    
    // 일반적인 API 요청에 적용 (프로덕션 환경, 로그인 엔드포인트 제외)
    // 로그인 엔드포인트는 skip 함수로 제외됨
    app.use((req, res, next) => {
        // 로그인 엔드포인트는 generalLimiter를 건너뜀
        if (isLoginEndpoint(req)) {
            return next();
        }
        return generalLimiter(req, res, next);
    });
};

module.exports = rateLimitMiddleware; 