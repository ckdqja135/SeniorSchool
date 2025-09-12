const express = require('express');
const router = express.Router();
const churchController = require('../controller/churchController');

// 교회 목록 조회
router.get('/', churchController.getChurches);

// 교회 상세 조회 (churchName, churchAddr로 조회 가능)
router.get('/church', churchController.getChurchDetail);


// 교회 수정
router.put('/:churchIdx', churchController.updateChurch);

// 교회 삭제
router.delete('/:churchIdx', churchController.deleteChurch);

// 교회 추가 요청 생성 (일반 사용자용)
router.post('/requests', churchController.createChurchRequest);

// 교회 후기 목록
router.get('/boards', churchController.getChurchBoards);

// 교회 후기 상세보기
router.get('/boards/detail', churchController.getChurchBoardDetail);

// 교회 후기 등록
router.post('/boards/insert', churchController.insertChurchBoard);

// 교회 후기 수정
router.put('/boards/correct', churchController.correctChurchBoard);

// 교회 후기 삭제
router.delete('/boards/delete', churchController.deleteChurchBoard);

// 교회 후기 좋아요 토글
router.post('/boards/like', churchController.toggleChurchBoardLike);

// 교회 후기 좋아요 조회
router.get('/boards/like/:boardId', churchController.getChurchBoardLike);

// 최근순으로 게시된 교회 후기 목록 조회 (교회 정보 포함)
router.get('/boards/recent', churchController.getRecentChurchBoardsWithInfo);

// 교회별로 후기 조회수 기준 인기 후기 TOP10 조회
router.get('/boards/top-viewed', churchController.getTopViewedChurchBoardsByChurch);

module.exports = router;
