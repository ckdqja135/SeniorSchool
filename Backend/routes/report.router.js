const express = require('express');
const router = express.Router();
const reportController = require('../controller/reportController');

/**
 * 신고하기 API
 * POST /report
 * Body: { boardIdx, serviceType, reportReason, reporterId? }
 */
router.post('/', reportController.createReport);

module.exports = router;
