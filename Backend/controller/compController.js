const compService = require('../service/compService');
const logger = require('../utils/logger');

/**
 * 회사 조회수 기준 인기 회사 TOP10 조회
 */
exports.getTopViewedCompanies = async (req, res, next) => {
    try {
        const result = await compService.getTopViewedCompanies();
        
        logger.info(`[getTopViewedCompanies] 인기 회사 TOP10 조회 성공: ${result.totalCount}개`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getTopViewedCompanies] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 회사 추가 요청 생성
 */
exports.createCompRequest = async (req, res, next) => {
    try {
        const result = await compService.createCompRequest(req.body);
        
        logger.info(`[createCompRequest] 회사 추가 요청 생성 성공: ${result.data.requestIdx}`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[createCompRequest] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 면접 후기 생성
 */
exports.createInterview = async (req, res, next) => {
    try {
        const result = await compService.createInterview(req.body);
        
        logger.info(`[createInterview] 면접 후기 생성 성공: ${result.data?.interviewIdx}`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[createInterview] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 면접 후기 조회 (목록)
 */
exports.getInterviews = async (req, res, next) => {
    try {
        const compIdx = req.query.compIdx ? parseInt(req.query.compIdx) : null;
        const pagination = {
            page: req.query.page,
            rowsPerPage: req.query.rowsPerPage
        };
        
        const result = await compService.getInterviews(compIdx, pagination);
        
        logger.info(`[getInterviews] 면접 후기 조회 성공: ${result.pagination?.totalCount}개`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getInterviews] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 면접 후기 상세 조회
 */
exports.getInterviewDetail = async (req, res, next) => {
    try {
        const interviewIdx = parseInt(req.params.interviewIdx);
        const result = await compService.getInterviewDetail(interviewIdx);
        
        logger.info(`[getInterviewDetail] 면접 후기 상세 조회 성공: ${interviewIdx}`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getInterviewDetail] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 면접 후기 수정
 */
exports.updateInterview = async (req, res, next) => {
    try {
        const interviewIdx = parseInt(req.params.interviewIdx);
        const { writerPw, ...updateData } = req.body;
        
        if (!writerPw) {
            return res.status(400).json({
                status: 400,
                error: '비밀번호는 필수입니다.',
                message: '작성자 비밀번호를 입력해주세요.'
            });
        }
        
        const result = await compService.updateInterview(interviewIdx, updateData, writerPw);
        
        logger.info(`[updateInterview] 면접 후기 수정 성공: ${interviewIdx}`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateInterview] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 면접 후기 삭제
 */
exports.deleteInterview = async (req, res, next) => {
    try {
        const interviewIdx = parseInt(req.params.interviewIdx);
        const { writerPw } = req.body;
        
        if (!writerPw) {
            return res.status(400).json({
                status: 400,
                error: '비밀번호는 필수입니다.',
                message: '작성자 비밀번호를 입력해주세요.'
            });
        }
        
        const result = await compService.deleteInterview(interviewIdx, writerPw);
        
        logger.info(`[deleteInterview] 면접 후기 삭제 성공: ${interviewIdx}`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[deleteInterview] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 연봉 후기 생성
 */
exports.createSalary = async (req, res, next) => {
    try {
        const result = await compService.createSalary(req.body);
        
        logger.info(`[createSalary] 연봉 후기 생성 성공: ${result.data?.salaryIdx}`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[createSalary] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 연봉 후기 조회 (목록)
 */
exports.getSalaries = async (req, res, next) => {
    try {
        const compIdx = req.query.compIdx ? parseInt(req.query.compIdx) : null;
        const pagination = {
            page: req.query.page,
            rowsPerPage: req.query.rowsPerPage
        };
        
        const result = await compService.getSalaries(compIdx, pagination);
        
        logger.info(`[getSalaries] 연봉 후기 조회 성공: ${result.pagination?.totalCount}개`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getSalaries] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};