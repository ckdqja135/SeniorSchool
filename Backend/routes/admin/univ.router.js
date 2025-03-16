const express = require('express');
const router = express.Router();
const univController = require('../../controller/admin/univController');

/**
 * Admin - 학교 선배 - 학교 관리 페이지에서 사용되는 API
 */

// 학교 생성
router.post('/createUniv', univController.createUniv);

// 학교 상태 변경
router.patch('/patchUnivStatus', univController.patchUnivStatus);

// 학교 검색
router.get('/searchUniv', univController.searchUniv);

// 학교 데이터 삭제
router.delete('/deleteUniv',univController.deleteUniv);

// 학교 데이터 수정
router.patch('/patchUnivData', univController.patchUnivData);

module.exports = router;