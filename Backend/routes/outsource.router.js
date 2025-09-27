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

module.exports = router;
