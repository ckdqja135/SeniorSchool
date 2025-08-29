const express = require('express');
const router = express.Router();
const searchController = require('../controller/searchController');

// 자동 완성 검색
router.get('/auto', searchController.autoComplete);

// 학교 정보 검색
router.get('/school', searchController.getSchoolInfo);

// univViewCount 높은 순으로 상위 10개 대학교 조회
router.get('/top-viewed', searchController.getTopViewedUniversities);

module.exports = router;
