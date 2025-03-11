const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
    filename: 'logs/backend-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false, // 압축 여부, true면 gzip으로 압축
    maxFiles: '90d', // 3개월(약 90일)간 로그 유지
});

const errorTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    zippedArchive: false,
    maxFiles: '90d',
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        transport,
        errorTransport
    ],
});

module.exports = logger;