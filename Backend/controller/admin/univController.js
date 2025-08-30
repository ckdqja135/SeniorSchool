const univService = require('../../service/admin/univService');
const logger = require('../../utils/logger');

exports.createUniv = async (req, res, next) => {
    try {
        const result = await univService.createUniv(req.body);
        
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

// 학교 검색
exports.searchUniv = async (req, res) => {
    try {
        const data = req.query;
        logger.info(`[searchUniv] Request query: ${JSON.stringify(data)}`);
        
        const result = await univService.searchUniv(data);
        logger.info(`[searchUniv] Success: ${result.totalCount} results found`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[searchUniv] Error: ${error.message}`);
        logger.error(`[searchUniv] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};


// 학교 상세보기
exports.getUnivDetail = async (req, res) => {
    const { univIdx } = req.params;

    try {
        const result = await univService.getUnivDetail(univIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getUnivDetail] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};


/**
 * 학교 데이터 삭제 컨트롤러
 * req.body를 그대로 univService.deleteUniv에 전달함.
 * 전달받은 데이터를 기반으로 학교 데이터를 삭제하도록 개발함.
 */
exports.deleteUniv = async (req, res, next) => {
    try {
        // req.body를 그대로 서비스단에 전달함
        const result = await univService.deleteUniv(req.body);
        // 삭제 결과를 JSON 형태로 응답함
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * 학교 데이터 수정 컨트롤러
 * req.body에 담긴 데이터를 그대로 univService.putUnivData에 전달함.
 * 전달받은 데이터를 기반으로 학교 데이터 수정 작업을 수행하도록 개발하였음.
 */
exports.putUnivData = async (req, res, next) => {
    try {
        // req.body를 그대로 서비스단에 전달함
        const result = await univService.putUnivData(req.body);
        // 수정 결과를 JSON 형태로 응답함
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * 대학교 요청 생성 컨트롤러
 */
exports.createUnivRequest = async (req, res, next) => {
    try {
        const result = await univService.createUnivRequest(req.body);
        
        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(409).json(result); // 409 Conflict for duplicate request
        }
    } catch (error) {
        logger.error(`[createUnivRequest] Error: ${error.message}`);
        next(error);
    }
};

/**
 * 대학교 요청 목록 조회 컨트롤러 (관리자용)
 */
exports.getUnivRequests = async (req, res, next) => {
    try {
        const searchParams = req.query;
        const result = await univService.getUnivRequests(searchParams);
        
        logger.info(`[getUnivRequests] 대학교 요청 목록 조회 성공: ${result.totalCount}개`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getUnivRequests] Error: ${error.message}`);
        next(error);
    }
};

/**
 * 대학교 요청 상태 업데이트 컨트롤러 (관리자용)
 */
exports.updateUnivRequestStatus = async (req, res, next) => {
    try {
        const { requestIdx } = req.params;
        const { status, adminNote } = req.body;
        
        if (!requestIdx) {
            return res.status(400).json({ 
                success: false, 
                error: 'requestIdx is required' 
            });
        }
        
        if (!status || !['pending', 'completed'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'status must be "pending" or "completed"' 
            });
        }

        const result = await univService.updateUnivRequestStatus(requestIdx, status, adminNote);
        
        logger.info(`[updateUnivRequestStatus] 대학교 요청 상태 업데이트 성공: ${requestIdx} -> ${status}`);
        
        res.status(200).json(result);
    } catch (error) {
        logger.error(`[updateUnivRequestStatus] Error: ${error.message}`);
        next(error);
    }
};