const express = require('express');
const router = express.Router();
const outsourceController = require('../../controller/admin/outsourceController');
const { isAdmin, authenticateToken } = require('../../middlewares/authMiddleware');

/**
 * Admin - 외주 오빠 - 외주업체 관리 페이지에서 사용되는 API
 */

// 외주업체 생성
router.post('/createOutsource', authenticateToken, isAdmin, outsourceController.createOutsource);

// 외주업체 검색
router.get('/searchOutsource', authenticateToken, isAdmin, outsourceController.searchOutsource);

// 외주업체 상세보기 API
router.get('/outsource', authenticateToken, isAdmin, outsourceController.getOutsourceDetail);

// 외주업체 데이터 수정
router.put('/:outsourceIdx', authenticateToken, isAdmin, outsourceController.updateOutsource);

// 외주업체 데이터 삭제
router.delete('/:outsourceIdx', authenticateToken, isAdmin, outsourceController.deleteOutsource);

// 외주업체 통계 조회
router.get('/stats/overview', authenticateToken, isAdmin, outsourceController.getOutsourceStats);

/**
 * Admin - 외주업체 추가 요청 관리 API
 */

// 외주업체 추가 요청 생성 (일반 사용자도 접근 가능)
router.post('/request', outsourceController.createOutsourceRequest);

// 외주업체 추가 요청 목록 조회 (관리자만)
router.get('/request', authenticateToken, isAdmin, outsourceController.getOutsourceRequests);

// 외주업체 추가 요청 상태 업데이트 (관리자만)
router.put('/request/:requestIdx/status', authenticateToken, isAdmin, outsourceController.updateOutsourceRequestStatus);

module.exports = router;
