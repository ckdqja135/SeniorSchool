const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const { httpLogger } = logger;
const routes = require('./routes');
const securityMiddleware = require('./middlewares/securityMiddleware');
const xssMiddleware = require('./middlewares/xssMiddleware');
// const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();

// CORS 설정 (가장 먼저 설정)
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.45.242:3000', 'http://192.168.45.242:3001', 'http://1.233.163.148:9001', 'https://www.reviewhub.life', 'https://reviewhub.life'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'Cache-Control', 'Pragma', 'If-Modified-Since'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
};

app.use(cors(corsOptions));

// OPTIONS 요청 처리
app.options('*', cors(corsOptions));

// XSS 미들웨어 (body 파서보다 먼저 실행)
app.use(xssMiddleware);

// body 파서
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 쿠키 파서
app.use(cookieParser());

// 보안 미들웨어 (helmet 등)
securityMiddleware(app);

// Rate Limiting
// rateLimitMiddleware(app);

// 로깅
app.use(httpLogger);

// API 라우터 연결
app.use('/', routes);

// 등록되지 않은 라우트 처리
app.use((req, res, next) => {
    res.status(404).json({
        status: 404,
        message: '요청한 API가 존재하지 않습니다.'
    });
});

// 에러 로깅 핸들러
app.use((err, req, res, next) => {
    logger.error(`[${req.method}] ${req.url} - ${err.message}`);
    res.status(err.status || 500);
    res.json({ message: err.message });
});

// 서버 정보 숨기기
app.disable('x-powered-by');

// 회사 데이터 스케줄러 시작 (매일 자정에 자동 실행)
const companyDataScheduler = require('./scheduler/companyDataScheduler');
companyDataScheduler.start();
logger.info('✅ Company data scheduler started (runs daily at midnight)');

module.exports = app;
