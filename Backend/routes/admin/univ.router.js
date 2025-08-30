const express = require('express');
const router = express.Router();
const univController = require('../../controller/admin/univController');
const { isAdmin, authenticateToken } = require('../../middlewares/authMiddleware');

/**
 * Admin - 학교 선배 - 학교 관리 페이지에서 사용되는 API
 */

// 학교 생성
router.post('/createUniv', authenticateToken, isAdmin, univController.createUniv);

// 학교 검색
router.get('/searchUniv', authenticateToken, isAdmin, univController.searchUniv);

// 학교 상세보기 API
router.get('/univ/:univIdx', authenticateToken, isAdmin, univController.getUnivDetail);

// 학교 데이터 삭제
router.delete('/deleteUniv', authenticateToken, isAdmin, univController.deleteUniv);

// 학교 데이터 수정
router.put('/putUnivData', authenticateToken, isAdmin, univController.putUnivData);

/**
 * Admin - 대학교 요청 관리 API
 */

// 대학교 요청 생성 (일반 사용자도 접근 가능)
router.post('/request', univController.createUnivRequest);

// 대학교 요청 목록 조회 (관리자만)
router.get('/request', authenticateToken, isAdmin, univController.getUnivRequests);

// 대학교 요청 상태 업데이트 (관리자만)
router.put('/request/:requestIdx/status', authenticateToken, isAdmin, univController.updateUnivRequestStatus);

module.exports = router;