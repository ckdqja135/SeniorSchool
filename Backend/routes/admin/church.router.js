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
router.get('/:churchIdx', authenticateToken, isAdmin, churchController.getChurchDetail);

// 교회 데이터 수정
router.put('/:churchIdx', authenticateToken, isAdmin, churchController.updateChurch);

// 교회 데이터 삭제
router.delete('/:churchIdx', authenticateToken, isAdmin, churchController.deleteChurch);

// 교회 통계 조회
router.get('/stats/overview', authenticateToken, isAdmin, churchController.getChurchStats);

module.exports = router;
