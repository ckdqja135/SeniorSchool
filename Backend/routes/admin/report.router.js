const express = require('express');
const router = express.Router();
const reportController = require('../../controller/admin/reportController');

// 신고 게시판 등록
router.post('/createReport', reportController.createReport);

// 신고 게시판 리스트
router.get('/getReports', reportController.getReports);

// 신고 게시판 상세
router.get('/getReportDetail', reportController.getReportDetail);

// 신고 처리 상태 업데이트
router.patch('/updateReportStatus', reportController.updateReportStatus);

// 신고 게시판 삭제
router.delete('/deleteReportBoard', reportController.deleteReportBoard);

module.exports = router;
