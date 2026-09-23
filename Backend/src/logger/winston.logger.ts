// Backend/utils/logger.js의 verbatim 포팅 — 로그 포맷/로테이션/HTTP 로깅 동작을 그대로 유지한다.
import * as winston from 'winston';
import * as path from 'path';
import 'winston-daily-rotate-file';
import { Request, Response, NextFunction } from 'express';

const logDir = path.join(process.cwd(), 'logs');

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

export const logger = winston.createLogger({
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
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
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
    res.send = function (body?: any) {
        logResponse();
        return originalSend.call(this, body);
    };

    // res.json 오버라이드
    res.json = function (body?: any) {
        logResponse();
        return originalJson.call(this, body);
    };

    // res.end 오버라이드
    res.end = function (chunk?: any, encoding?: any) {
        logResponse();
        return originalEnd.call(this, chunk, encoding);
    } as Response['end'];

    next();
};
