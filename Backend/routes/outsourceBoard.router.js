const express = require('express');
const router = express.Router();
const outsourceBoardController = require('../controller/outsourceBoardController');

// 외주업체 게시판 목록
router.get('/', outsourceBoardController.getOutsourceBoards);

// 외주업체 게시판 상세보기
router.get('/detail', outsourceBoardController.getOutsourceBoardDetail);

// 외주업체 게시판 등록
router.post('/insert', outsourceBoardController.insertOutsourceBoard);

// 외주업체 게시판 수정
router.put('/correct', outsourceBoardController.correctOutsourceBoard);

// 외주업체 게시판 삭제
router.delete('/delete', outsourceBoardController.deleteOutsourceBoard);

// 외주업체 게시판 좋아요 토글
router.post('/like', outsourceBoardController.toggleOutsourceBoardLike);

// 외주업체 게시판 좋아요 조회
router.get('/like/:boardId', outsourceBoardController.getOutsourceBoardLike);

// 최근순으로 게시된 외주업체 게시글 목록 조회 (외주업체 정보 포함)
router.get('/recent', outsourceBoardController.getRecentOutsourceBoardsWithOutsourceInfo);


module.exports = router;
