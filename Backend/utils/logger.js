const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
);

const logger = winston.createLogger({
    level: 'info', // 기본 로그 레벨
    format: logFormat,
    transports: [
        new winston.transports.Console({ // 콘솔에 출력
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        new DailyRotateFile({ // 날짜별 로그 파일 생성
            filename: 'logs/backend-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d', // 14일간 유지
            zippedArchive: true,
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
    ],
});

module.exports = logger;
