const express = require('express');
const router = express.Router();
const restaurantController = require('../../controller/admin/restaurantController');
const { isAdmin, authenticateToken } = require('../../middlewares/authMiddleware');
const { handleImageUpload } = require('../../middlewares/uploadMiddleware');

/**
 * Admin - 맛잘알 오빠 - 식당 관리 페이지에서 사용되는 API
 */

// 식당 생성 (이미지 업로드 지원)
router.post('/createRestaurant', authenticateToken, isAdmin, handleImageUpload, restaurantController.createRestaurant);

// 식당 검색
router.get('/searchRestaurant', authenticateToken, isAdmin, restaurantController.searchRestaurant);

// 식당 상세보기 API
router.get('/restaurant', authenticateToken, isAdmin, restaurantController.getRestaurantDetail);

// 식당 데이터 수정 (이미지 업로드 지원)
router.put('/:restaurantIdx', authenticateToken, isAdmin, handleImageUpload, restaurantController.updateRestaurant);

// 식당 데이터 삭제
router.delete('/:restaurantIdx', authenticateToken, isAdmin, restaurantController.deleteRestaurant);

// 식당 통계 조회
router.get('/stats/overview', authenticateToken, isAdmin, restaurantController.getRestaurantStats);

// 식당 추가 요청 목록 조회 (관리자만)
router.get('/request', authenticateToken, isAdmin, restaurantController.getRestaurantRequests);

// 식당 추가 요청 상태 업데이트 (관리자만)
router.put('/request/:requestIdx/status', authenticateToken, isAdmin, restaurantController.updateRestaurantRequestStatus);

module.exports = router;
