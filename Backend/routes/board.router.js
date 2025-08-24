const express = require('express');
const router = express.Router();
const boardController = require('../controller/boardController');

// 게시판 목록
router.get('/', boardController.getBoards);

// 게시판 상세보기
router.get('/detail', boardController.getBoardDetail);

// 게시판 등록
router.post('/insert', boardController.insertBoard);

// 게시판 수정
router.put('/correct', boardController.correctBoard);

// 게시판 삭제
router.delete('/delete', boardController.deleteBoard);

// 게시판 좋아요 토글
router.post('/like', boardController.toggleBoardLike);

// 게시판 좋아요 조회
router.get('/like/:boardId', boardController.getBoardLike);

// 최근순으로 게시된 게시글 목록 조회 (대학교 정보 포함)
router.get('/recent', boardController.getRecentBoardsWithUnivInfo);

module.exports = router;
