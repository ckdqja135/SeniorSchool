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

/**
 * 면접 후기 평점 입력/갱신
 */
exports.updateInterviewRating = async (req, res, next) => {
    try {
        const interviewIdx = parseInt(req.params.interviewIdx, 10);
        const { writerPw, rating } = req.body;

        if (!interviewIdx || Number.isNaN(interviewIdx)) {
            return res.status(400).json({
                status: 400,
                error: '유효하지 않은 면접 후기 인덱스입니다.',
                message: 'interviewIdx는 숫자여야 합니다.'
            });
        }

        if (!writerPw) {
            return res.status(400).json({
                status: 400,
                error: '비밀번호는 필수입니다.',
                message: '작성자 비밀번호를 입력해주세요.'
            });
        }

        if (rating === undefined || rating === null) {
            return res.status(400).json({
                status: 400,
                error: '평점은 필수입니다.',
                message: 'rating 값을 입력해주세요.'
            });
        }

        const numericRating = parseFloat(rating);
        if (
            Number.isNaN(numericRating) ||
            numericRating < 0.5 ||
            numericRating > 5.0 ||
            !Number.isInteger(numericRating * 2)
        ) {
            return res.status(400).json({
                status: 400,
                error: '평점 범위 오류',
                message: '평점은 0.5부터 5.0 사이의 0.5 단위 값이어야 합니다.'
            });
        }

        const result = await compService.updateInterviewRating(interviewIdx, writerPw, numericRating);

        logger.info(`[updateInterviewRating] 면접 후기 평점 업데이트 성공: ${interviewIdx}, rating=${numericRating}`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateInterviewRating] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

/**
 * 회사 평점 평균 조회
 */
exports.getCompanyAverageRating = async (req, res, next) => {
    try {
        const compIdx = parseInt(req.params.compIdx, 10);

        if (!compIdx || Number.isNaN(compIdx)) {
            return res.status(400).json({
                status: 400,
                error: '유효하지 않은 회사 인덱스입니다.',
                message: 'compIdx는 숫자여야 합니다.'
            });
        }

        const result = await compService.getCompanyAverageRating(compIdx);

        logger.info(`[getCompanyAverageRating] 회사 평점 평균 조회 성공: ${compIdx}`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getCompanyAverageRating] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};