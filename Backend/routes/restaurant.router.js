const express = require('express');
const router = express.Router();
const restaurantController = require('../controller/restaurantController');

// 식당 목록 조회
router.get('/', restaurantController.getRestaurants);

// 식당 상세 조회 (restaurantName, restaurantAddr로 조회 가능)
router.get('/restaurant', restaurantController.getRestaurantDetail);

// 식당 추가 요청 생성 (일반 사용자용)
router.post('/requests', restaurantController.createRestaurantRequest);

module.exports = router;

