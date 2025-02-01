const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),  // PM2 logs에서도 출력됨
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),  // 에러 로그 저장
        new winston.transports.File({ filename: 'logs/backend.log' })  // 일반 로그 저장
    ],
});

module.exports = logger;
