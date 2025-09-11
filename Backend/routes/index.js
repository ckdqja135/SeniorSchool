const express = require('express');
const router = express.Router();
const boardRouter = require('./board.router');
const searchRouter = require('./search.router');
const commentRouter = require('./comment.router');
const churchRouter = require('./church.router');
const churchBoardRouter = require('./churchBoard.router');
const churchCommentRouter = require('./churchComment.router');
const adminRouter = require('./admin/index');

router.use('/board', boardRouter);
router.use('/search', searchRouter);
router.use('/comment', commentRouter);
router.use('/church', churchRouter);
router.use('/church/board', churchBoardRouter);
router.use('/church/comment', churchCommentRouter);
router.use('/admin', adminRouter);

module.exports = router;