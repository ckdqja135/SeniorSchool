const express = require('express');
const router = express.Router();
const pageViewController = require('../../controller/admin/pageViewController');
const { authenticateToken, isAdmin } = require('../../middlewares/authMiddleware');

// 방문 기록 저장 (공개 - 인증 불필요)
router.post('/track', pageViewController.track);

// 어드민 조회 (인증 필요)
router.get('/path-stats', authenticateToken, isAdmin, pageViewController.getPathStats);
router.get('/referer-stats', authenticateToken, isAdmin, pageViewController.getRefererStats);
router.get('/daily-stats', authenticateToken, isAdmin, pageViewController.getDailyStats);
router.get('/logs', authenticateToken, isAdmin, pageViewController.getRecentLogs);

module.exports = router;
