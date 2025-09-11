const express = require('express');
const router = express.Router();
const churchController = require('../controller/churchController');

// 교회 목록 조회
router.get('/', churchController.getChurches);

// 교회 상세 조회 (churchName, churchAddr로 조회 가능)
router.get('/church', churchController.getChurchDetail);

// 교회 등록
router.post('/', churchController.createChurch);

// 교회 수정
router.put('/:churchIdx', churchController.updateChurch);

// 교회 삭제
router.delete('/:churchIdx', churchController.deleteChurch);

module.exports = router;
