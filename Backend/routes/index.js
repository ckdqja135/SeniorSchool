var express = require('express');
const board = require('./board/index');
const search = require('./search/index');
const comment = require('./comment/index');
const router = express.Router();

router.use('/board', board);
router.use('/search', search);
router.use('/comment', comment);
module.exports = router;
