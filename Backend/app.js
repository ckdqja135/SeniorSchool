const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const routes = require('./routes');
const securityMiddleware = require('./middlewares/securityMiddleware');
const xssMiddleware = require('./middlewares/xssMiddleware');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();

// 1. 가장 먼저 기본 body 파서
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 2. 보안 미들웨어 (helmet 등)
securityMiddleware(app);

// 3. Rate Limiting
rateLimitMiddleware(app);

// 4. CORS 설정
app.use(cors({
    origin: ['http://localhost:3000', 'http://192.168.45.242:3001', 'http://1.233.163.148:9001'],
    credentials: true
}));

// 5. XSS 미들웨어
app.use(xssMiddleware);

// 6. 로깅
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// 7. API 라우터 연결
app.use('/', routes);

// 8. 등록되지 않은 라우트 처리
app.use((req, res, next) => {
    res.status(404).json({
        status: 404,
        message: '요청한 API가 존재하지 않습니다.'
    });
});

// 9. 에러 로깅 핸들러
app.use((err, req, res, next) => {
    logger.error(`[${req.method}] ${req.url} - ${err.message}`);
    res.status(err.status || 500);
    res.json({ message: err.message });
});

// 10. 쿠키 파서
app.use(cookieParser());

// 11. 서버 정보 숨기기
app.disable('x-powered-by');

module.exports = app;
