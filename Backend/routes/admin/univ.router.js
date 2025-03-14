const express = require('express');
const router = express.Router();
const univController = require('../../controller/admin/univController');

/**
 * Admin - 학교 선배 - 학교 관리 페이지에서 사용되는 API
 */

// 학교 생성
router.post('/createUniv', univController.createUniv);

// 학교 상태 변경
router.put('/putUnivStatus', univController.putUnivStatus);

// 학교 데이터 조회
router.get('/getUniv', );

// 학교 데이터 삭제
router.delete('/deleteUniv', );

router.put('/putUnivData', );

module.exports = router;