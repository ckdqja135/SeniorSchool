const rateLimit = require('express-rate-limit');

const rateLimitMiddleware = (app) => {
    // Rate Limiting 설정
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15분
        max: 15, // IP당 15분 동안 최대 15회 요청
        message: {
            status: 429,
            message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        standardHeaders: true, // Rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    // 모든 API 요청에 Rate Limiting 적용
    app.use('/api/', limiter);
};

module.exports = rateLimitMiddleware; 