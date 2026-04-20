const express = require('express');
const router = express.Router();
const requestsController = require('../controller/requestsController');

// 모든 오빠 서비스의 최근 신청 현황 (공개)
router.get('/recent', requestsController.getRecentRequests);

module.exports = router;
