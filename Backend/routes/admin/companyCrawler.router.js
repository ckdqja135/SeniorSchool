const express = require('express');
const router = express.Router();
const controller = require('../../controller/admin/companyCrawlerController');
const { isAdmin, authenticateToken } = require('../../middlewares/authMiddleware');

// DB 현황 조회
router.get('/stats', authenticateToken, isAdmin, controller.getStats);

// 크롤링 가능한 소스 목록 조회
router.get('/sources', authenticateToken, isAdmin, controller.getSources);

// 비어있는 데이터 통계
router.get('/missing-stats', authenticateToken, isAdmin, controller.getMissingStats);

// 비어있는 필드 보강 크롤링
router.post('/enrich', authenticateToken, isAdmin, controller.enrichMissing);

// 비어있는 필드 보강 크롤링 (실시간 진행 스트리밍, NDJSON)
router.post('/enrich/stream', authenticateToken, isAdmin, controller.enrichMissingStream);

// 통합 크롤링 실행
router.post('/run', authenticateToken, isAdmin, controller.runCrawl);

// 단일 소스 크롤링 (테스트용)
// GET /admin/company-crawler/run/:source?query=회사&region=서울&count=10&dryRun=true
router.get('/run/:source', authenticateToken, isAdmin, controller.runSingleSource);

module.exports = router;
