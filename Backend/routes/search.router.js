const express = require('express');
const router = express.Router();
const searchController = require('../controller/searchController');

// 자동 완성 검색
router.get('/auto', searchController.autoComplete);

// 학교 정보 검색
router.get('/school', searchController.getSchoolInfo);

module.exports = router;
