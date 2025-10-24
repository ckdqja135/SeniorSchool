const express = require('express');
const router = express.Router();
const restaurantController = require('../controller/restaurantController');

// 식당 목록 조회
router.get('/', restaurantController.getRestaurants);

// 식당 상세 조회 (restaurantName, restaurantAddr로 조회 가능)
router.get('/restaurant', restaurantController.getRestaurantDetail);

// 식당 조회수 TOP10 조회
router.get('/top-viewed', restaurantController.getTopViewedRestaurants);

// 식당 최근 후기 5개 조회
router.get('/recent', restaurantController.getRecentRestaurantComments);

// 식당 후기 TOP10 조회 (조회수 기준)
router.get('/comments/top', restaurantController.getTopRestaurantComments);

// 식당 후기 상세 조회
router.get('/board/:boardIdx', restaurantController.getRestaurantBoardDetail);

// 게시판 좋아요 조회
router.get('/like', restaurantController.getRestaurantBoardLike);

// 식당 추가 요청 생성 (일반 사용자용)
router.post('/requests', restaurantController.createRestaurantRequest);

module.exports = router;

