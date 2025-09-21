const express = require('express');
const router = express.Router();
const compController = require('../../controller/admin/compController');
const { isAdmin, authenticateToken } = require('../../middlewares/authMiddleware');

/**
 * Admin - 회사 오빠 - 회사 관리 페이지에서 사용되는 API
 */

// 회사 생성
router.post('/createComp', authenticateToken, isAdmin, compController.createComp);

// 회사 검색
router.get('/searchComp', authenticateToken, isAdmin, compController.searchComp);

// 회사 추가 요청 목록 조회
router.get('/request', authenticateToken, isAdmin, compController.getCompRequests);

// 회사 상세보기 API
router.get('/comp/:compIdx', authenticateToken, isAdmin, compController.getCompDetail);

// 회사 데이터 삭제
router.delete('/deleteComp/:compIdx', authenticateToken, isAdmin, compController.deleteComp);

// 회사 데이터 수정
router.put('/putCompData/:compIdx', authenticateToken, isAdmin, compController.putCompData);

// 회사 상태 변경 (활성/비활성)
router.put('/comp/:compIdx/status', authenticateToken, isAdmin, compController.updateCompStatus);

// 회사 통계 정보 업데이트 (외부 API 연동)
router.post('/comp/:compIdx/statistics', authenticateToken, isAdmin, compController.updateCompStatistics);

// 여러 회사 통계 정보 일괄 업데이트
router.post('/statistics/batch', authenticateToken, isAdmin, compController.batchUpdateCompStatistics);

module.exports = router;
