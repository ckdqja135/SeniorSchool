const express = require('express');
const router = express.Router();

// 각 리소스별 라우터 불러오기
const univRouter = require('./univ.router');
const compRouter = require('./comp.router');
const userRouter = require('./user.router');
const boardRouter = require('./board.router');
const reportRouter = require('./report.router');
const churchRouter = require('./church.router');
const outsourceRouter = require('./outsource.router');
const restaurantRouter = require('./restaurant.router');
const freeBoardRouter = require('./freeBoard.router');

// "/admin/univ" 경로 → univRouter
router.use('/univ', univRouter);
router.use('/comp', compRouter);
router.use('/user', userRouter);
router.use('/board', boardRouter);
router.use('/report', reportRouter);
router.use('/church', churchRouter);
router.use('/outsource', outsourceRouter);
router.use('/restaurant', restaurantRouter);
router.use('/freeboard', freeBoardRouter);
module.exports = router;