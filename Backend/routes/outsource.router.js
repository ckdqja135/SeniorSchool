const express = require('express');
const router = express.Router();
const outsourceController = require('../controller/outsourceController');

// 외주업체 목록 조회
router.get('/', outsourceController.getOutsources);

// 외주업체 상세 조회 (outsourceName, outsourceAddr로 조회 가능)
router.get('/outsource', outsourceController.getOutsourceDetail);


// 외주업체 수정
router.put('/:outsourceIdx', outsourceController.updateOutsource);

// 외주업체 삭제
router.delete('/:outsourceIdx', outsourceController.deleteOutsource);

// 외주업체 추가 요청 생성 (일반 사용자용)
router.post('/requests', outsourceController.createOutsourceRequest);

// 외주업체 후기 목록
router.get('/boards', outsourceController.getOutsourceBoards);

// 외주업체 후기 상세보기
router.get('/boards/detail', outsourceController.getOutsourceBoardDetail);

// 외주업체 후기 등록
router.post('/boards/insert', outsourceController.insertOutsourceBoard);

// 외주업체 후기 수정
router.put('/boards/correct', outsourceController.correctOutsourceBoard);

// 외주업체 후기 삭제
router.delete('/boards/delete', outsourceController.deleteOutsourceBoard);

// 외주업체 후기 좋아요 토글
router.post('/boards/like', outsourceController.toggleOutsourceBoardLike);

// 외주업체 후기 좋아요 조회
router.get('/boards/like/:boardId', outsourceController.getOutsourceBoardLike);

// 최근순으로 게시된 외주업체 후기 목록 조회 (외주업체 정보 포함)
router.get('/boards/recent', outsourceController.getRecentOutsourceBoardsWithInfo);

// 외주업체별로 후기 조회수 기준 인기 후기 TOP10 조회
router.get('/boards/top-viewed', outsourceController.getTopViewedOutsourceBoardsByOutsource);

module.exports = router;
