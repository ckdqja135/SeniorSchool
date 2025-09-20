const express = require('express');
const router = express.Router();

// 기존 라우터들 (학교 오빠 - 호환성 유지)
const boardRouter = require('./board.router');
const commentRouter = require('./comment.router');

// 학교 오빠 (univ) 라우터들
const univBoardRouter = require('./univBoard.router');
const univCommentRouter = require('./univComment.router');

// 교회 오빠 (church) 라우터들
const churchRouter = require('./church.router');
const churchBoardRouter = require('./churchBoard.router');
const churchCommentRouter = require('./churchComment.router');

// 회사 오빠 (comp) 라우터들
const compRouter = require('./comp.router');
const compBoardRouter = require('./compBoard.router');
const compCommentRouter = require('./compComment.router');

// 기타 라우터들
const searchRouter = require('./search.router');
const adminRouter = require('./admin/index');

// 기존 라우터들 (호환성 유지)
router.use('/board', boardRouter);
router.use('/comment', commentRouter);

// 학교 오빠 (univ) 라우터들
router.use('/univ/board', univBoardRouter);
router.use('/univ/comment', univCommentRouter);

// 교회 오빠 (church) 라우터들
router.use('/church', churchRouter);
router.use('/church/board', churchBoardRouter);
router.use('/church/comment', churchCommentRouter);

// 회사 오빠 (comp) 라우터들
router.use('/comp', compRouter);
router.use('/comp/board', compBoardRouter);
router.use('/comp/comment', compCommentRouter);

// 기타 라우터들
router.use('/search', searchRouter);
router.use('/admin', adminRouter);

module.exports = router;