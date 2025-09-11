const express = require('express');
const router = express.Router();
const churchBoardController = require('../controller/churchBoardController');

// 교회 게시판 목록
router.get('/', churchBoardController.getChurchBoards);

// 교회 게시판 상세보기
router.get('/detail', churchBoardController.getChurchBoardDetail);

// 교회 게시판 등록
router.post('/insert', churchBoardController.insertChurchBoard);

// 교회 게시판 수정
router.put('/correct', churchBoardController.correctChurchBoard);

// 교회 게시판 삭제
router.delete('/delete', churchBoardController.deleteChurchBoard);

// 교회 게시판 좋아요 토글
router.post('/like', churchBoardController.toggleChurchBoardLike);

// 교회 게시판 좋아요 조회
router.get('/like/:boardId', churchBoardController.getChurchBoardLike);

// 최근순으로 게시된 교회 게시글 목록 조회 (교회 정보 포함)
router.get('/recent', churchBoardController.getRecentChurchBoardsWithChurchInfo);

// 교회별로 게시판 조회수 기준 인기 후기 TOP10 조회
router.get('/top-viewed', churchBoardController.getTopViewedChurchBoardsByChurch);

module.exports = router;
