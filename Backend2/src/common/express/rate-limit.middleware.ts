// Backend/middlewares/rateLimitMiddleware.js의 verbatim 포팅 (express-rate-limit 7.x, 동일 한도/스코프/429 바디)
import rateLimit from 'express-rate-limit';
import type { Express, Request, Response, NextFunction } from 'express';

export const applyRateLimit = (app: Express) => {
    // 개발 환경 감지
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

    if (isDevelopment) {
        // 개발 환경: Rate Limiting 비활성화 (원본과 동일)
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
    const isLoginEndpoint = (req: Request) => {
        const path = req.path || '';
        const originalUrl = req.originalUrl || '';
        const url = req.url || '';
        // 다양한 경로 형식 지원
        return path.includes('/user/signIn') ||
               originalUrl.includes('/admin/user/signIn') ||
               url.includes('/user/signIn');
    };

    // 어드민 API에 대한 적절한 Rate Limiting
    const strictLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15분
        max: 100, // IP당 15분 동안 최대 100회 요청
        message: {
            status: 429,
            message: '보안상 너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
        skip: (req) => {
            // 로그인 엔드포인트는 제외 (별도 limiter 적용)
            return isLoginEndpoint(req as Request);
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
            return isLoginEndpoint(req as Request);
        }
    });

    // 각 오빠 서비스 글·댓글 작성/수정/삭제: IP당 30초 10회 (성공 요청 포함 전부 카운트, 대상 전체 합산)
    const writeLimiter = rateLimit({
        windowMs: 30 * 1000,
        max: 10,
        message: {
            status: 429,
            message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Cloudflare → Nginx 경유라 req.ip 는 프록시 IP 일 수 있어 원 클라이언트 IP 헤더를 우선한다
        keyGenerator: (req) => {
            const cf = req.headers['cf-connecting-ip'];
            if (typeof cf === 'string' && cf) return cf;
            const xff = req.headers['x-forwarded-for'];
            const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
            return first || req.ip || '';
        },
    });

    const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const WRITE_PATHS = [
        /^\/((univ|church|comp|outsource|restaurant)\/)?boards?\/(insert|correct|delete)\/?$/,  // 후기 작성/수정/삭제
        /^\/((univ|church|comp|outsource|restaurant)\/)?comment\/(insert|modify|delete)\/?$/,   // 댓글 작성/수정/삭제
        /^\/freeboard\/?$/,                                   // 자유게시판 작성
        /^\/freeboard\/[^/]+\/?$/,                            // 자유게시판 수정/삭제
        /^\/freeboard\/[^/]+\/comments\/?$/,                  // 자유게시판 댓글 작성
        /^\/freeboard\/comments\/[^/]+\/?$/,                  // 자유게시판 댓글 수정/삭제
        /^\/comp\/(interviews|salaries)(\/[^/]+)?\/?$/,       // 면접·연봉 후기 작성/수정/삭제
        /^\/(church|outsource)\/\d+\/?$/,                     // 교회·외주 정보 수정/삭제
        /^\/services\/[^/]+\/boards\/insert\/?$/,             // 동적 서비스 후기 작성
        /^\/services\/[^/]+\/comments(\/[^/]+)?\/?$/,         // 동적 서비스 댓글 작성/삭제
    ];
    const isWriteRequest = (req: Request) =>
        WRITE_METHODS.includes(req.method) && WRITE_PATHS.some((re) => re.test(req.path));

    app.use((req: Request, res: Response, next: NextFunction) => {
        if (!isWriteRequest(req)) return next();
        return writeLimiter(req, res, next);
    });

    // 로그인 엔드포인트에 별도 제한 적용 (성공한 요청은 카운트하지 않음)
    // 다른 limiter보다 먼저 적용하여 우선순위 확보
    app.use('/admin/user/signIn', loginLimiter);

    // 다른 어드민 API에 엄격한 제한 적용 (로그인 엔드포인트 제외)
    app.use('/admin', (req: Request, res: Response, next: NextFunction) => {
        // 로그인 엔드포인트는 strictLimiter를 건너뜀
        if (isLoginEndpoint(req)) {
            return next();
        }
        return strictLimiter(req, res, next);
    });

    // 일반적인 API 요청에 적용 (프로덕션 환경, 로그인 엔드포인트 제외)
    app.use((req: Request, res: Response, next: NextFunction) => {
        // 로그인 엔드포인트는 generalLimiter를 건너뜀
        if (isLoginEndpoint(req)) {
            return next();
        }
        return generalLimiter(req, res, next);
    });
};
