const express = require('express');
const router = express.Router();
const compBoardController = require('../controller/compBoardController');

// 게시판 목록
router.get('/', compBoardController.getBoards);

// 게시판 상세보기
router.get('/detail', compBoardController.getBoardDetail);

// 게시판 등록
router.post('/insert', compBoardController.insertBoard);

// 게시판 수정
router.put('/correct', compBoardController.correctBoard);

// 게시판 삭제
router.delete('/delete', compBoardController.deleteBoard);

// 게시판 좋아요 토글
router.post('/like', compBoardController.toggleBoardLike);

// 게시판 좋아요 조회
router.get('/like/:boardId', compBoardController.getBoardLike);

// 최근순으로 게시된 게시글 목록 조회 (회사 정보 포함)
router.get('/recent', compBoardController.getRecentBoardsWithCompInfo);

// 회사별로 게시판 조회수 기준 인기 후기 TOP10 조회
router.get('/top-viewed', compBoardController.getTopViewedBoardsByCompany);

module.exports = router;
