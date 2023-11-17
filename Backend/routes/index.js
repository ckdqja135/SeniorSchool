var express = require('express');
const board = require('./board/index');
const search = require('./search/index');
const router = express.Router();

router.use('/board', board);
router.use('/search', search);
module.exports = router;
