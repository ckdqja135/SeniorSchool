const outsourceService = require('../../service/admin/outsourceService');
const logger = require('../../utils/logger');

exports.createOutsource = async (req, res, next) => {
    try {
        const result = await outsourceService.createOutsource(req.body);
        res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

// 외주업체 검색
exports.searchOutsource = async (req, res) => {
    try {
        const { outsourceName, outsourceType, outsourceLocation, page, rowsPerPage } = req.query;
        
        // 파라미터 매핑 (API 파라미터 -> 서비스 파라미터)
        const searchParams = {
            name: outsourceName, // outsourceName -> name
            type: outsourceType, // outsourceType -> type
            location: outsourceLocation, // outsourceLocation -> location
            page: page || 1,
            limit: rowsPerPage || 10 // rowsPerPage -> limit
        };
        
        logger.info(`[searchOutsource] Request query: ${JSON.stringify(req.query)}`);
        logger.info(`[searchOutsource] Mapped params: ${JSON.stringify(searchParams)}`);
        
        const result = await outsourceService.searchOutsource(searchParams);
        logger.info(`[searchOutsource] Success: ${result.totalCount} results found`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[searchOutsource] Error: ${error.message}`);
        logger.error(`[searchOutsource] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 외주업체 상세보기
exports.getOutsourceDetail = async (req, res) => {
    const { outsourceIdx } = req.params;

    try {
        const result = await outsourceService.getOutsourceDetail(outsourceIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getOutsourceDetail] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 외주업체 수정
exports.updateOutsource = async (req, res) => {
    const { outsourceIdx } = req.params;

    try {
        const result = await outsourceService.updateOutsource(outsourceIdx, req.body);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateOutsource] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 외주업체 삭제
exports.deleteOutsource = async (req, res) => {
    const { outsourceIdx } = req.params;

    try {
        const result = await outsourceService.deleteOutsource(outsourceIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[deleteOutsource] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 외주업체 통계 조회
exports.getOutsourceStats = async (req, res) => {
    try {
        const result = await outsourceService.getOutsourceStats();
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getOutsourceStats] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

/**
 * 외주업체 추가 요청 관리
 */

// 외주업체 추가 요청 생성 (일반 사용자도 접근 가능)
exports.createOutsourceRequest = async (req, res) => {
    try {
        const result = await outsourceService.createOutsourceRequest(req.body);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[createOutsourceRequest] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 외주업체 추가 요청 목록 조회 (관리자만)
exports.getOutsourceRequests = async (req, res) => {
    try {
        const result = await outsourceService.getOutsourceRequests(req.query);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getOutsourceRequests] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 외주업체 추가 요청 단일 조회 (관리자만)
exports.getOutsourceRequest = async (req, res) => {
    const { requestIdx } = req.params;

    try {
        const result = await outsourceService.getOutsourceRequest(requestIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getOutsourceRequest] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 외주업체 추가 요청 상태 업데이트 (관리자만)
exports.updateOutsourceRequestStatus = async (req, res) => {
    const { requestIdx } = req.params;

    try {
        const result = await outsourceService.updateOutsourceRequestStatus(requestIdx, req.body);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateOutsourceRequestStatus] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
