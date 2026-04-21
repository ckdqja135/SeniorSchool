const express = require('express');
const router = express.Router();
const crawlerController = require('../../controller/admin/crawlerController');

// DB 현황 조회
router.get('/stats', crawlerController.getStats);

// 크롤링 가능한 소스 목록 조회
router.get('/sources', crawlerController.getSources);

// 비어있는 데이터 통계
router.get('/missing-stats', crawlerController.getMissingStats);

// 비어있는 필드 보강 크롤링
router.post('/enrich', crawlerController.enrichMissing);

// 비어있는 필드 보강 크롤링 (실시간 진행 스트리밍, NDJSON)
router.post('/enrich/stream', crawlerController.enrichMissingStream);

// 통합 크롤링 실행
router.post('/run', crawlerController.runCrawl);

// 단일 소스 크롤링 (테스트용)
// GET /admin/crawler/run/:source?query=맛집&region=서울&count=10&dryRun=true
router.get('/run/:source', crawlerController.runSingleSource);

module.exports = router;
