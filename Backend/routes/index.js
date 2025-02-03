const express = require('express');
const router = express.Router();
const boardRouter = require('./board.router');
const searchRouter = require('./search.router');
const commentRouter = require('./search.router');
const adminRouter = require('./admin/index');

router.use('/board', boardRouter);
router.use('/search', searchRouter);
router.use('/comment', commentRouter);
router.use('/admin', adminRouter);

module.exports = router;