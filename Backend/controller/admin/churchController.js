const churchService = require('../../service/admin/churchService');
const logger = require('../../utils/logger');

exports.createChurch = async (req, res, next) => {
    try {
        const result = await churchService.createChurch(req.body);
        res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

// 교회 검색
exports.searchChurch = async (req, res) => {
    try {
        const data = req.query;
        logger.info(`[searchChurch] Request query: ${JSON.stringify(data)}`);
        
        const result = await churchService.searchChurch(data);
        logger.info(`[searchChurch] Success: ${result.totalCount} results found`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[searchChurch] Error: ${error.message}`);
        logger.error(`[searchChurch] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 교회 상세보기
exports.getChurchDetail = async (req, res) => {
    const { churchIdx } = req.params;

    try {
        const result = await churchService.getChurchDetail(churchIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getChurchDetail] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 교회 수정
exports.updateChurch = async (req, res) => {
    const { churchIdx } = req.params;

    try {
        const result = await churchService.updateChurch(churchIdx, req.body);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateChurch] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 교회 삭제
exports.deleteChurch = async (req, res) => {
    const { churchIdx } = req.params;

    try {
        const result = await churchService.deleteChurch(churchIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[deleteChurch] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 교회 통계 조회
exports.getChurchStats = async (req, res) => {
    try {
        const result = await churchService.getChurchStats();
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getChurchStats] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 교회 추가 요청 생성 (일반 사용자도 접근 가능)
exports.createChurchRequest = async (req, res, next) => {
    try {
        const result = await churchService.createChurchRequest(req.body);
        
        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(409).json(result); // 409 Conflict for duplicate request
        }
    } catch (error) {
        logger.error(`[createChurchRequest] Error: ${error.message}`);
        next(error);
    }
};

// 교회 추가 요청 목록 조회 (관리자만)
exports.getChurchRequests = async (req, res, next) => {
    try {
        const searchParams = req.query;
        const result = await churchService.getChurchRequests(searchParams);
        
        logger.info(`[getChurchRequests] 교회 요청 목록 조회 성공: ${result.totalCount}개`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getChurchRequests] Error: ${error.message}`);
        next(error);
    }
};

// 교회 추가 요청 상태 업데이트 (관리자만)
exports.updateChurchRequestStatus = async (req, res, next) => {
    try {
        const { requestIdx } = req.params;
        const { status, adminNote } = req.body;
        
        const result = await churchService.updateChurchRequestStatus(requestIdx, status, adminNote);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateChurchRequestStatus] Error: ${error.message}`);
        next(error);
    }
};
