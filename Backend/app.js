const createError = require('http-errors');
const helmet = require('helmet');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger'); // winston 기반 로거 추가
const routes = require('./routes');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS 설정
app.use(cors({ origin: '*' }));

// 요청 로깅 (모든 요청 기록)
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// API 경로 연결
app.use('/', routes);

// Winston 기반 요청 로그 기록
app.use((err, req, res, next) => {
    logger.error(`[${req.method}] ${req.url} - ${err.message}`);
    res.status(err.status || 500);
    res.json({ message: err.message, error: err });
});

// JSON & URL 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Helmet 보안 설정
app.use(helmet());
app.use(helmet.contentSecurityPolicy());
app.use(helmet.crossOriginEmbedderPolicy());
app.use(helmet.crossOriginOpenerPolicy());
app.use(helmet.crossOriginResourcePolicy());
app.use(helmet.dnsPrefetchControl());
app.use(helmet.expectCt());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.originAgentCluster());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());
app.disable('x-powered-by');

module.exports = app;
