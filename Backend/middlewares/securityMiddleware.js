const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

const securityMiddleware = (app) => {
    // 프록시 설정
    app.set('trust proxy', 1);

    // CORS 설정 제거

    // 기본 Helmet 설정
    app.use(helmet());

    // CSP 설정
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "http://192.168.45.242:3000", "http://192.168.45.242:3001"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }));

    // Cross-Origin 설정
    app.use(helmet.crossOriginEmbedderPolicy({ policy: 'credentialless' }));
    app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin-allow-popups' }));
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

    // DNS Prefetching 제어
    app.use(helmet.dnsPrefetchControl());

    // Certificate Transparency
    app.use(helmet.expectCt());

    // X-Frame-Options 설정
    app.use(helmet.frameguard({ action: 'deny' }));

    // X-Powered-By 헤더 제거
    app.use(helmet.hidePoweredBy());

    // HTTP Strict Transport Security
    app.use(helmet.hsts());

    // IE에서 파일 다운로드 보안
    app.use(helmet.ieNoOpen());

    // MIME 스니핑 방지
    app.use(helmet.noSniff());

    // Origin-Agent-Cluster 헤더
    app.use(helmet.originAgentCluster());

    // Cross-Domain 정책
    app.use(helmet.permittedCrossDomainPolicies());

    // Referrer 정책
    app.use(helmet.referrerPolicy({ policy: 'no-referrer-when-downgrade' }));

    // XSS 보호
    app.use(helmet.xssFilter());

    // XSS 입력값 검증
    app.use(xss());

    // Rate Limiting 설정
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15분
        max: 100, // IP당 15분 동안 최대 100회 요청
        message: {
            status: 429,
            message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        standardHeaders: true, // Rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    // 모든 API 요청에 Rate Limiting 적용 (search 경로 제외)
    // app.use('/admin/', limiter);
    // app.use('/board/', limiter);
    // app.use('/search/', limiter);  // search 경로 rate limiting 비활성화
    // app.use('/comment/', limiter);
    // app.use('/admin/', limiter);

    // SameSite 쿠키 설정을 위한 미들웨어
    app.use((req, res, next) => {
        // 쿠키가 존재하는 경우에만 처리
        if (req.cookies && req.cookies.session) {
            res.cookie('session', req.cookies.session, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
        }
        next();
    });
};

module.exports = securityMiddleware; 