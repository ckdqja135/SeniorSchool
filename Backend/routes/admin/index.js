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
const univBoardRouter = require('./univBoard.router');
const churchBoardRouter = require('./churchBoard.router');
const compBoardRouter = require('./compBoard.router');
const outsourceBoardRouter = require('./outsourceBoard.router');
const restaurantBoardRouter = require('./restaurantBoard.router');
const dashboardRouter = require('./dashboard.router');
const schedulerRouter = require('./companyDataScheduler.router');

// 라우터 등록
router.use('/univ', univRouter);
router.use('/comp', compRouter);
router.use('/user', userRouter);
router.use('/board', boardRouter);
router.use('/report', reportRouter);
router.use('/church', churchRouter);
router.use('/outsource', outsourceRouter);
router.use('/restaurant', restaurantRouter);
router.use('/freeboard', freeBoardRouter);
router.use('/univboard', univBoardRouter);
router.use('/churchboard', churchBoardRouter);
router.use('/compboard', compBoardRouter);
router.use('/outsourceboard', outsourceBoardRouter);
router.use('/restaurantboard', restaurantBoardRouter);
router.use('/dashboard', dashboardRouter);
router.use('/scheduler', schedulerRouter);

module.exports = router;