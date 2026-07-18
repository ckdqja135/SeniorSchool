// Backend/app.js + bin/www의 부트스트랩 포팅.
// 미들웨어 등록 순서가 곧 API 계약이다 — app.js:26-57 순서를 그대로 복제한다.
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { xssMiddleware } from './common/express/xss.middleware';
import { contentFilterMiddleware } from './common/express/content-filter.middleware';
import { applySecurityMiddleware } from './common/express/security.middleware';
import { applyRateLimit } from './common/express/rate-limit.middleware';
import { logger, httpLogger } from './logger/winston.logger';

dotenv.config();

// CORS 설정 (app.js:18-24와 동일)
const corsOptions: cors.CorsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.45.242:3000', 'http://192.168.45.242:3001', 'http://1.233.163.148:9001', 'https://www.ori.blue', 'https://ori.blue', 'https://api.ori.blue'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'Cache-Control', 'Pragma', 'If-Modified-Since'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
};

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: false, // body 파서는 아래에서 XSS 미들웨어 뒤에 수동 등록 (원본 순서 유지)
        logger: false,     // Nest 기본 로거 대신 winston 사용
    });

    const ex = app.getHttpAdapter().getInstance() as express.Express;

    // BigInt/Decimal 직렬화: 구 스택은 bigNumberStrings로 BIGINT를 문자열 반환 → 동일하게 유지
    ex.set('json replacer', (key: string, value: any) =>
        typeof value === 'bigint' ? value.toString() : value);

    // CORS 설정 (가장 먼저 설정)
    app.use(cors(corsOptions));
    ex.options('*', cors(corsOptions));

    // XSS 미들웨어 (body 파서보다 먼저 실행)
    app.use(xssMiddleware);

    // body 파서
    app.use(express.json({ limit: '30mb' }));
    app.use(express.urlencoded({ limit: '30mb', extended: true }));

    // 콘텐츠 필터 (욕설, 성적 표현, XSS 차단)
    app.use(contentFilterMiddleware);

    // 쿠키 파서
    app.use(cookieParser());

    // 보안 미들웨어 (helmet 등) — trust proxy, x-powered-by 처리 포함
    applySecurityMiddleware(ex);

    // Rate Limiting
    applyRateLimit(ex);

    // 로깅
    app.use(httpLogger);

    // 정적 파일 서빙 (이미지 파일 등)
    app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

    // 404 + 에러 핸들러 (app.js:60-74 계약)
    app.useGlobalFilters(new AllExceptionsFilter());

    // 서버 정보 숨기기
    ex.disable('x-powered-by');

    // 예기치 못한 에러 처리
    process.on('uncaughtException', (err) => {
        logger.error(`[UncaughtException] ${err.message}\n${err.stack}`);
    });

    process.on('unhandledRejection', (reason) => {
        logger.error(`[UnhandledRejection] ${reason}`);
    });

    const port = process.env.PORT || '3000';
    await app.listen(port);
    console.log('start on ' + port);
}

bootstrap();
