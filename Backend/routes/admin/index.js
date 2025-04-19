const express = require('express');
const router = express.Router();

// 각 리소스별 라우터 불러오기
const univRouter = require('./univ.router');
const userRouter = require('./user.router');
const boardRouter = require('./board.router');
const reportRouter = require('./report.router');

// "/admin/univ" 경로 → univRouter
router.use('/univ', univRouter);
router.use('/user', userRouter);
router.use('/board', boardRouter);
router.use('/report', reportRouter);
module.exports = router;