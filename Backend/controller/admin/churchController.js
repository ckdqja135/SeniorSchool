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
