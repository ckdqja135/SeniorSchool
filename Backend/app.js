var createError = require('http-errors');
const helmet = require('helmet');
var express = require('express');
const cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
const routes = require('./routes/delete');
require('dotenv').config();
const bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json()); // JSON 형태의 요청 body를 파싱
app.use(bodyParser.urlencoded({ extended: true })); // URL-encoded 형태의 요청 body를 파싱


app.use(logger('dev'));
app.use(cors({
    origin: '*', // 모든 출처 허용 옵션. true 를 써도 된다.
}));
app.use('/', routes);

// log 기록하기
app.use(
    logger('common', {
        stream: fs.createWriteStream('./access.log', { flags: 'a' })
    // flags : a => 로그를 계속 덧붙인다
    })
);

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({ message: err.message, error: err });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// use routes

// security 처리
// helmet -> Header 설정 바꿔주는 Module.
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
// CORS 처리
// const corsOptions = {
//     origin: 'http://localhost:3001', // 허용할 도메인
//     optionsSuccessStatus: 200, // CORS preflight 응답 성공 상태
// };




module.exports = app;
