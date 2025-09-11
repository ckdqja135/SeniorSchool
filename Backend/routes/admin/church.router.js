const express = require('express');
const router = express.Router();
const churchController = require('../../controller/admin/churchController');
const { isAdmin, authenticateToken } = require('../../middlewares/authMiddleware');

/**
 * Admin - 교회 오빠 - 교회 관리 페이지에서 사용되는 API
 */

// 교회 생성
router.post('/createChurch', authenticateToken, isAdmin, churchController.createChurch);

// 교회 검색
router.get('/searchChurch', authenticateToken, isAdmin, churchController.searchChurch);

// 교회 상세보기 API
router.get('/church', authenticateToken, isAdmin, churchController.getChurchDetail);

// 교회 데이터 수정
router.put('/:churchIdx', authenticateToken, isAdmin, churchController.updateChurch);

// 교회 데이터 삭제
router.delete('/:churchIdx', authenticateToken, isAdmin, churchController.deleteChurch);

// 교회 통계 조회
router.get('/stats/overview', authenticateToken, isAdmin, churchController.getChurchStats);

/**
 * Admin - 교회 추가 요청 관리 API
 */

// 교회 추가 요청 생성 (일반 사용자도 접근 가능)
router.post('/requests', churchController.createChurchRequest);

// 교회 추가 요청 목록 조회 (관리자만)
router.get('/requests', authenticateToken, isAdmin, churchController.getChurchRequests);

// 교회 추가 요청 상태 업데이트 (관리자만)
router.put('/requests/:requestIdx/status', authenticateToken, isAdmin, churchController.updateChurchRequestStatus);

module.exports = router;
