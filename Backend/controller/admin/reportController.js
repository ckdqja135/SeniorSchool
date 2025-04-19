const reportService = require('../../service/admin/reportService');
const logger = require('../../utils/logger');

/* 신고 게시판 생성 */
exports.createReport = async (req, res) => {
  	try {
		const result = await reportService.createReport(req.body);
		res.status(201).json(result);
  	} catch (err) {
    	logger.error(err);
    	res.status(500).json({ message: '신고 등록 실패' });
  }
};

/* 신고 게시판 리스트 조회 */
exports.getReports = async (req, res) => {
  	try {
		const result = await reportService.getReports(req.query);
		res.status(200).json(result);
  	} catch (err) {
		logger.error(err);
    	res.status(500).json({ message: '신고 조회 실패' });
  	}
};

/* 신고 게시판 상세 조회 */
exports.getReportDetail = async (req, res) => {
  	try {
	    const result = await reportService.getReportDetail(req.query);
		res.status(200).json(result);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ message: '상세 조회 실패' });
	}
};

/* 신고 게시판 상태 업데이트 */
exports.updateReportStatus = async (req, res) => {
  	try {
		const result = await reportService.updateReportStatus(req.body);
		res.status(200).json(result);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ message: '신고 상태 업데이트 실패' });
	}
};

/* 신고 게시판 삭제 */
exports.deleteReportBoard = async (req, res) => {
	try {
		const result = await reportService.deleteReportBoard(req.body);
		res.status(200).json(result);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ message: '신고 게시판 삭제 실패' });
	}
};

