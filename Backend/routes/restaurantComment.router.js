const express = require('express');
const router = express.Router();
const restaurantCommentController = require('../controller/restaurantCommentController');

// 식당 댓글 조회
router.get('/', restaurantCommentController.getRestaurantComments);

// 식당 댓글 추가
router.post('/insert', restaurantCommentController.insertRestaurantComment);

// 식당 댓글 수정
router.put('/modify', restaurantCommentController.modifyRestaurantComment);

// 식당 댓글 삭제
router.delete('/delete', restaurantCommentController.deleteRestaurantComment);

module.exports = router;

