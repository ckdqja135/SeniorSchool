const churchService = require('../../service/admin/churchService');
const logger = require('../../utils/logger');

exports.createChurch = async (req, res, next) => {
    try {
        const result = await churchService.createChurch(req.body);
        
        // 배열인 경우 길이, 단일 객체인 경우 1로 처리
        const insertCount = Array.isArray(result) ? result.length : 1;
        
        return res.status(201).json({
            insert: insertCount,
            success: true
        });
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
exports.createChurchRequest = async (req, res) => {
    try {
        const result = await churchService.createChurchRequest(req.body);
        res.status(201).json({
            success: true,
            message: '교회 추가 요청이 성공적으로 등록되었습니다.',
            data: result
        });
    } catch (error) {
        logger.error(`[createChurchRequest] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            message: '서버 오류가 발생했습니다.',
            error: error.message 
        });
    }
};

// 교회 추가 요청 목록 조회 (관리자만)
exports.getChurchRequests = async (req, res) => {
    try {
        const { page = 1, rowsPerPage = 10, status } = req.query;
        
        const result = await churchService.getChurchRequests({
            page: parseInt(page),
            rowsPerPage: parseInt(rowsPerPage),
            status: status
        });
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getChurchRequests] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            message: '서버 오류가 발생했습니다.',
            error: error.message 
        });
    }
};

// 교회 추가 요청 상태 업데이트 (관리자만)
exports.updateChurchRequestStatus = async (req, res) => {
    try {
        const { requestIdx } = req.params;
        const { status, adminNote } = req.body;
        
        const result = await churchService.updateChurchRequestStatus(requestIdx, status, adminNote);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateChurchRequestStatus] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            message: '서버 오류가 발생했습니다.',
            error: error.message 
        });
    }
};
