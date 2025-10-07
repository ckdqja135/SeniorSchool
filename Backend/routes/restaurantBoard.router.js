const express = require('express');
const router = express.Router();
const restaurantBoardController = require('../controller/restaurantBoardController');

// 식당 게시판 목록
router.get('/', restaurantBoardController.getRestaurantBoards);

// 식당 게시판 상세보기
router.get('/detail', restaurantBoardController.getRestaurantBoardDetail);

// 식당 게시판 등록
router.post('/insert', restaurantBoardController.insertRestaurantBoard);

// 식당 게시판 수정
router.put('/correct', restaurantBoardController.correctRestaurantBoard);

// 식당 게시판 삭제
router.delete('/delete', restaurantBoardController.deleteRestaurantBoard);

// 식당 게시판 좋아요 토글
router.post('/like', restaurantBoardController.toggleRestaurantBoardLike);

// 식당 게시판 좋아요 조회
router.get('/like/:boardId', restaurantBoardController.getRestaurantBoardLike);

// 최근순으로 게시된 식당 게시글 목록 조회 (식당 정보 포함)
router.get('/recent', restaurantBoardController.getRecentRestaurantBoardsWithRestaurantInfo);

// 식당별로 게시판 조회수 기준 인기 후기 TOP10 조회
router.get('/top-viewed', restaurantBoardController.getTopViewedRestaurantBoardsByRestaurant);

module.exports = router;

