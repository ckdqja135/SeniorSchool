const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/admin/dashboardController');

/**
 * @route GET /admin/dashboard/overview
 * @desc 대시보드 개요 통계 조회 (총 게시글 수, 업체 수, 신고 수, 이번 주 활동 수)
 */
router.get('/overview', dashboardController.getDashboardOverview);

/**
 * @route GET /admin/dashboard/monthly-stats
 * @desc 월별 통계 조회 (최근 12개월 게시글, 업체 등록 수)
 */
router.get('/monthly-stats', dashboardController.getMonthlyStats);

/**
 * @route GET /admin/dashboard/recent-activities
 * @desc 최근 활동 조회 (업체 추가/업데이트, 게시글 작성/수정)
 * @query limit - 조회할 활동 개수 (기본값: 20)
 */
router.get('/recent-activities', dashboardController.getRecentActivities);

module.exports = router;

