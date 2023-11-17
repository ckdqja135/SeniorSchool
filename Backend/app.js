var createError = require('http-errors');
const helmet = require('helmet');
var express = require('express');
const cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
const routes = require('./routes/index');
require('dotenv').config();
var app = express();


app.use(logger('dev'));
app.use('/', routes);

// log 기록하기
app.use(
  logger('common', {
    stream: fs.createWriteStream('./access.log', { flags: 'a' }) 
		// flags : a => 로그를 계속 덧붙인다
  })
);

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
// CORS 처리.
app.use(cors());

module.exports = app;
