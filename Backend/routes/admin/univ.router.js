const express = require('express');
const router = express.Router();
const univController = require('../../controller/admin/univ.controller');

// 학교 생성
router.post('/createUniv', univController.createUniv);

// 학교 상태 변경
router.put('/putUnivStatus', univController.putUnivStatus);

module.exports = router;