const express = require('express');
const router = express.Router();
const bestPostsController = require('../controller/bestPostsController');

// 베스트 후기 조회 (전체)
router.get('/', bestPostsController.getTop10BestPosts);

module.exports = router;

