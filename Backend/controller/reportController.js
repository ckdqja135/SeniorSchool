const { ReportBoard } = require('../model');
const logger = require('../utils/logger');

/**
 * 신고하기 API
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.createReport = async (req, res) => {
    try {
        const { boardIdx, serviceType, reportReason, reporterId } = req.body;

        // 필수값 검증
        if (!boardIdx || !serviceType || !reportReason) {
            return res.status(400).json({
                success: false,
                message: '필수값이 누락되었습니다. (boardIdx, serviceType, reportReason)'
            });
        }

        // 서비스 타입 검증
        const validServiceTypes = ['univ', 'company', 'church'];
        if (!validServiceTypes.includes(serviceType)) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 서비스 타입입니다. (univ, company, church 중 하나)'
            });
        }

        // 신고 데이터 생성
        const reportData = {
            boardIdx,
            serviceType,
            reportReason,
            reporterId: reporterId || null,
            reportStatus: 'pending',
            isDeleted: false
        };

        const newReport = await ReportBoard.create(reportData);

        logger.info(`[createReport] 신고 등록 완료: reportIdx=${newReport.reportIdx}, serviceType=${serviceType}, boardIdx=${boardIdx}`);

        res.status(201).json({
            success: true,
            message: '신고가 성공적으로 등록되었습니다.',
            data: {
                reportIdx: newReport.reportIdx,
                boardIdx: newReport.boardIdx,
                serviceType: newReport.serviceType,
                reportStatus: newReport.reportStatus,
                reportDate: newReport.reportDate
            }
        });

    } catch (error) {
        logger.error(`[createReport] Error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '신고 등록 중 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 신고 조회 API (특정 서비스별)
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.getReports = async (req, res) => {
    try {
        const { serviceType, page = 1, limit = 10, reportStatus } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // 서비스 타입 검증
        if (serviceType) {
            const validServiceTypes = ['univ', 'company', 'church'];
            if (!validServiceTypes.includes(serviceType)) {
                return res.status(400).json({
                    success: false,
                    message: '유효하지 않은 서비스 타입입니다. (univ, company, church 중 하나)'
                });
            }
        }

        // 검색 조건 구성
        const where = { isDeleted: false };
        if (serviceType) where.serviceType = serviceType;
        if (reportStatus) where.reportStatus = reportStatus;

        // 신고 목록 조회
        const { count, rows } = await ReportBoard.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['reportDate', 'DESC']],
            attributes: [
                'reportIdx', 'boardIdx', 'serviceType', 'reportReason',
                'reportDate', 'reportStatus', 'reportResult', 'reporterId'
            ]
        });

        logger.info(`[getReports] 신고 목록 조회: 총 ${count}건, 서비스타입=${serviceType || 'all'}`);

        res.status(200).json({
            success: true,
            message: '신고 목록을 성공적으로 조회했습니다.',
            data: {
                reports: rows,
                pagination: {
                    totalCount: count,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        logger.error(`[getReports] Error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '신고 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 신고 상세 조회 API
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.getReportDetail = async (req, res) => {
    try {
        const { reportIdx } = req.params;

        if (!reportIdx) {
            return res.status(400).json({
                success: false,
                message: 'reportIdx가 필요합니다.'
            });
        }

        const report = await ReportBoard.findOne({
            where: { reportIdx, isDeleted: false },
            attributes: [
                'reportIdx', 'boardIdx', 'serviceType', 'reportReason',
                'reportDate', 'reportStatus', 'reportResult', 'reporterId'
            ]
        });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: '해당 신고를 찾을 수 없습니다.'
            });
        }

        logger.info(`[getReportDetail] 신고 상세 조회: reportIdx=${reportIdx}`);

        res.status(200).json({
            success: true,
            message: '신고 상세 정보를 성공적으로 조회했습니다.',
            data: report
        });

    } catch (error) {
        logger.error(`[getReportDetail] Error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '신고 상세 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
};
