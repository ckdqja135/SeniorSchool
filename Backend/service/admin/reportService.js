const { ReportBoard, UnivBoard, CompanyBoard } = require('../../model');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

// 신고 게시판 생성
exports.createReport = async (data) => {
    try {
        const { boardIdx, serviceType, reportType, reportReason, reporterId } = data;

        // serviceType 또는 reportType 중 하나는 있어야 함
        const finalServiceType = serviceType || reportType;

        if (!boardIdx || !finalServiceType || !reportReason) {
            logger.warn(`[createReport] 필수값 누락됨: ${JSON.stringify(data)}`);
            throw new Error('필수값이 누락되었습니다. (boardIdx, serviceType/reportType, reportReason)');
        }

        const created = await ReportBoard.create({
            boardIdx,
            serviceType: finalServiceType,
            reportReason,
            reporterId,
            reportStatus: 'pending',
            isDeleted: false,
        });

        logger.info(`[createReport] 신고 등록 완료: reportIdx=${created.reportIdx}`);
        return { status: 201, message: '신고 등록 완료', data: created };
    } catch (error) {
        logger.error(`[createReport] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 신고 리스트 조회 서비스
 * @param {Object} query - 검색 조건 (예: { page: 1, rowsPerPage: 10, serviceType: 'univ', reportStatus: 'pending' })
 * @returns {Promise<Object>} - 페이징 포함된 신고 리스트 반환
 */
exports.getReports = async (query) => {
    try {
        const rowsPerPage = parseInt(query.rowsPerPage, 10) || 10;
        const page = parseInt(query.page, 10) || 1;
        const offset = (page - 1) * rowsPerPage;

        const { serviceType, reportStatus } = query;

        const where = {};

        if (serviceType) where.serviceType = serviceType;
        if (reportStatus) where.reportStatus = reportStatus;

        const { count, rows } = await ReportBoard.findAndCountAll({
            where,
            limit: rowsPerPage,
            offset,
            order: [['reportDate', 'DESC']],
        });

        logger.info(`[getReports] 신고 리스트 조회: 총 ${count}건`);

        return {
            status: 200,
            data: rows,
            totalCount: count,
            currentPage: page,
            rowsPerPage,
        };
    } catch (error) {
        logger.error(`[getReports] Error: ${error.message}`);
        throw error;
    }
};

// 신고 게시판 상세 조회
exports.getReportDetail = async (query) => {
    try {
        const { reportIdx } = query;
        const report = await ReportBoard.findOne({ where: { reportIdx } });
        if (!report) {
            logger.warn(`[getReportDetail] 신고 정보 없음: reportIdx=${reportIdx}`);
            return { status: 404, message: '신고 정보를 찾을 수 없습니다.' };
        }

        let board = null;

        switch (report.serviceType) {
            case 'univ':
                board = await UnivBoard.findOne({ where: { boardIdx: report.boardIdx } });
                break;
            // case 'company':
            //     board = await CompanyBoard.findOne({ where: { boardIdx: report.boardIdx } });
            //     break;
            default:
                logger.warn(`[getReportDetail] 알 수 없는 서비스 타입: ${report.serviceType}`);
        }

        return {
            status: 200,
            data: {
                report,
                board,
            },
        };
    } catch (error) {
        logger.error(`[getReportDetail] Error: ${error.message}`);
        throw error;
    }
};

// 신고 처리 상태 업데이트
exports.updateReportStatus = async (data) => {
    try {
        const { reportIdx, reportStatus, reportResult } = data;
        const report = await ReportBoard.findOne({ where: { reportIdx } });
        if (!report) {
            logger.warn(`[updateReportStatus] 신고 정보 없음: reportIdx=${reportIdx}`);
            return { status: 404, message: '신고 정보를 찾을 수 없습니다.' };
        }

        if (!reportStatus && !reportResult) {
            throw new Error('업데이트할 항목이 없습니다.');
        }

        if (reportStatus) report.reportStatus = reportStatus;
        if (reportResult) report.reportResult = reportResult;

        await report.save();
        logger.info(`[updateReportStatus] 신고 상태 업데이트 완료: reportIdx=${reportIdx}`);
        return {
            status: 200,
            message: '신고 상태 업데이트 완료',
            data: report,
        };
    } catch (error) {
        logger.error(`[updateReportStatus] Error: ${error.message}`);
        throw error;
    }
};

// 신고 게시판 삭제
exports.deleteReportBoard = async (body) => {
    try {
        const { reportIdx } = body;
		const report = await ReportBoard.findOne({ where: { reportIdx } });

        if (!report) {
            logger.warn(`[deleteReportBoard] 신고 정보 없음: reportIdx=${reportIdx}`);
            return { status: 404, message: '신고 정보를 찾을 수 없습니다.' };
        }

        await report.destroy();
        logger.info(`[deleteReportBoard] 신고 게시판 삭제 완료: reportIdx=${reportIdx}`);
        return { status: 200, message: '신고 게시판 삭제 완료' };
    } catch (error) {
        logger.error(`[deleteReportBoard] Error: ${error.message}`);
        throw error;
    }
};
