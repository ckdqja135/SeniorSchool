const helmet = require('helmet');
const xss = require('xss-clean');

const securityMiddleware = (app) => {
    // 프록시 설정
    app.set('trust proxy', 1);

    // CORS 설정 제거

    // 기본 Helmet 설정
    app.use(helmet());

    // CSP 설정 (API 서버이므로 완화)
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "*"],  // API 요청 허용
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        },
        useDefaults: false
    }));

    // Cross-Origin 설정
    app.use(helmet.crossOriginEmbedderPolicy({ policy: 'credentialless' }));
    app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin-allow-popups' }));
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

    // DNS Prefetching 제어
    app.use(helmet.dnsPrefetchControl());

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