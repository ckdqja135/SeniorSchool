const express = require('express');
const router = express.Router();

// 각 리소스별 라우터 불러오기
const univRouter = require('./univ.router');

// "/admin/univ" 경로 → univRouter
router.use('/univ', univRouter);

module.exports = router;