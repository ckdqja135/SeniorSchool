const express = require('express');
const router = express.Router();
const univBoardController = require('../controller/univBoardController');

// 게시판 목록
router.get('/', univBoardController.getBoards);

// 게시판 상세보기
router.get('/detail', univBoardController.getBoardDetail);

// 게시판 등록
router.post('/insert', univBoardController.insertBoard);

// 게시판 수정
router.put('/correct', univBoardController.correctBoard);

// 게시판 삭제
router.delete('/delete', univBoardController.deleteBoard);

// 게시판 좋아요 토글
router.post('/like', univBoardController.toggleBoardLike);

// 게시판 좋아요 조회
router.get('/like/:boardId', univBoardController.getBoardLike);

// 최근순으로 게시된 게시글 목록 조회 (대학교 정보 포함)
router.get('/recent', univBoardController.getRecentBoardsWithUnivInfo);

// 대학교별로 게시판 조회수 기준 인기 후기 TOP10 조회
router.get('/top-viewed', univBoardController.getTopViewedBoardsByUniversity);

module.exports = router;
