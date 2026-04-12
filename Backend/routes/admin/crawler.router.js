const express = require('express');
const router = express.Router();
const crawlerController = require('../../controller/admin/crawlerController');

// 크롤링 가능한 소스 목록 조회
router.get('/sources', crawlerController.getSources);

// 통합 크롤링 실행
router.post('/run', crawlerController.runCrawl);

// 단일 소스 크롤링 (테스트용)
// GET /admin/crawler/run/:source?query=맛집&region=서울&count=10&dryRun=true
router.get('/run/:source', crawlerController.runSingleSource);

module.exports = router;
