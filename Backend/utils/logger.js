const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

const logDir = path.join(__dirname, '../logs');

const transport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'backend-%DATE%.log'),
    datePattern: 'YYYYMMDD',
    zippedArchive: false, // 압축 여부, true면 gzip으로 압축
    maxSize: '20m', // 20MB 초과 시 같은 날짜라도 분할
    maxFiles: '90d', // 3개월(약 90일)간 로그 유지
});

const errorTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYYMMDD',
    level: 'error',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '90d',
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, statusCode }) => {
            const statusInfo = statusCode ? `[${statusCode}]` : '';
            return `${timestamp} [${level.toUpperCase()}] ${statusInfo} ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        transport,
        errorTransport
    ],
});

// HTTP 요청 로깅을 위한 미들웨어
const httpLogger = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;

    // 로깅 여부를 추적하는 플래그
    let logged = false;

    // 응답이 완료된 후 로깅
    const logResponse = () => {
        // 이미 로깅된 경우 중복 로깅 방지
        if (logged) return;
        logged = true;

        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const method = req.method;
        const url = req.originalUrl || req.url;
        logger.info(`${method} ${url} ${duration}ms`, { statusCode });
    };
    
    // res.send 오버라이드
    res.send = function(body) {
        logResponse();
        return originalSend.call(this, body);
    };
    
    // res.json 오버라이드
    res.json = function(body) {
        logResponse();
        return originalJson.call(this, body);
    };
    
    // res.end 오버라이드
    res.end = function(chunk, encoding) {
        logResponse();
        return originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

// 모듈 내보내기
module.exports = logger;
module.exports.httpLogger = httpLogger;