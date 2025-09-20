const express = require('express');
const router = express.Router();
const compController = require('../controller/compController');

// 회사 조회수 기준 인기 회사 TOP10 조회
router.get('/top-viewed', compController.getTopViewedCompanies);

// 회사 추가 요청 생성
router.post('/requests', compController.createCompRequest);

module.exports = router;
