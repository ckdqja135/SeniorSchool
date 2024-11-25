const express = require('express');
const router = express.Router();
const boardRouter = require('./board');
const searchRouter = require('../search');
const commentRouter = require('./comment');

router.use('/board', boardRouter);
router.use('/search', searchRouter);
router.use('/comment', commentRouter);

module.exports = router;