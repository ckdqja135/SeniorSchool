const univService = require('../../service/admin/univService');
const logger = require('../../utils/logger');

exports.createUniv = async (req, res, next) => {
    try {
        const result = await univService.createUniv(req.body);
        return res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

exports.patchUnivStatus = async (req, res, next) => {
    try {
        const { univIdx, status } = req.query;

        const result = await univService.patchUnivStatus(univIdx, status);

        // 상태 코드와 메시지 반환
        return res.status(result.status).json({
            success: result.status === 200, // 200이면 true, 나머지는 false
            message: result.message
        });

    } catch (error) {
        next(error);
    }
};

exports.searchUniv = async (req, res, next) => {
    try {
        const result = await univService.searchUniv(req.query);
        return res.status(201).json(result);
    } catch (e) {
        next(e);
    }
};

// 학교 리스트 검색
exports.searchUniv = async (req, res) => {
    const rowsPerPage = parseInt(req.query.rowsPerPage, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    try {
        const result = await univService.searchUniv(rowsPerPage, page);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[searchUniv] Error: ${error.message}`);
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
exports.patchUnivData = async (req, res, next) => {
    try {
        // req.body를 그대로 서비스단에 전달함
        const result = await univService.patchUnivData(req.body);
        // 수정 결과를 JSON 형태로 응답함
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};