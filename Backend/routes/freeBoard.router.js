const express = require('express');
const router = express.Router();
const freeBoardController = require('../controller/freeBoardController');

// 자유게시판 목록 조회
router.get('/', freeBoardController.getFreeBoardList);

// 최근 게시물 조회 (/:id보다 먼저 정의)
router.get('/recent', freeBoardController.getRecentFreeBoards);

// 통계 조회 (/:id보다 먼저 정의)
router.get('/stats', freeBoardController.getStats);

// 자유게시판 상세 조회
router.get('/:id', freeBoardController.getFreeBoardDetail);

// 자유게시판 게시글 작성
router.post('/', freeBoardController.createFreeBoard);

// 자유게시판 게시글 수정
router.put('/:id', freeBoardController.updateFreeBoard);

// 자유게시판 게시글 삭제
router.delete('/:id', freeBoardController.deleteFreeBoard);

// 댓글 작성
router.post('/:id/comments', freeBoardController.createComment);

// 댓글 수정
router.put('/comments/:commentId', freeBoardController.updateComment);

// 댓글 삭제
router.delete('/comments/:commentId', freeBoardController.deleteComment);

// 게시글 좋아요
router.post('/:id/like', freeBoardController.toggleBoardLike);

// 댓글 좋아요
router.post('/comments/:commentId/like', freeBoardController.toggleCommentLike);

// 조회수 증가
router.post('/:id/hit', freeBoardController.incrementHits);

module.exports = router;
