const express = require('express');
const router = express.Router();
const searchController = require('../controller/searchController');

// 자동 완성 검색
router.get('/auto', searchController.autoComplete);

// 학교 정보 검색
router.get('/school', searchController.getSchoolInfo);

// univViewCount 높은 순으로 상위 10개 대학교 조회
router.get('/top-viewed', searchController.getTopViewedUniversities);

// 회사 검색
router.get('/comp/', searchController.searchCompany);

// 회사 상세보기 (일반 유저용)
router.get('/comp/:compIdx', searchController.getCompanyDetail);

// 교회 자동 완성 검색
router.get('/church/auto', searchController.autoCompleteChurch);

// 교회 정보 검색
router.get('/church/info', searchController.getChurchInfo);

// 외주업체 자동 완성 검색
router.get('/outsource/auto', searchController.autoCompleteOutsource);

// 교회 조회수 높은 순으로 상위 10개 교회 조회
router.get('/church/top-viewed', searchController.getTopViewedChurches);

module.exports = router;
