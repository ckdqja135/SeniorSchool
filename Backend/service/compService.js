const { CompInfo, CompRequest, CompInterview, CompSalary } = require('../model/index');
const logger = require('../utils/logger');

/**
 * 회사 조회수 기준 인기 회사 TOP10 조회
 */
exports.getTopViewedCompanies = async () => {
    try {
        const topViewedCompanies = await CompInfo.findAll({
            attributes: [
                'compIdx',
                'compName',
                'compLocate',
                'compType',
                'compIndustry',
                'compCEO',
                'compViewCount'
            ],
            order: [
                ['compViewCount', 'DESC'], // 회사 조회수 기준 내림차순
                ['compName', 'ASC']        // 동일 조회수일 경우 회사명 오름차순
            ],
            limit: 10 // TOP 10만 조회
        });

        logger.info(`[getTopViewedCompanies] 인기 회사 TOP10 조회 성공: ${topViewedCompanies.length}개`);
        
        return {
            status: 200,
            data: topViewedCompanies,
            totalCount: topViewedCompanies.length
        };
    } catch (error) {
        logger.error(`[getTopViewedCompanies] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 회사 상세보기 서비스 (일반 사용자용)
 * @param {number} compIdx - 회사 인덱스
 * @returns {Object} 회사 상세 정보
 */
exports.getCompDetail = async (compIdx) => {
    try {
        logger.info(`[getCompDetail] Searching for compIdx: ${compIdx}`);

        const company = await CompInfo.findByPk(compIdx, {
            where: {
                compStatus: 1 // 활성화된 회사만
            }
        });

        if (!company) {
            logger.warn(`[getCompDetail] Company not found: ${compIdx}`);
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        // 조회수 증가
        await company.increment('compViewCount');

        logger.info(`[getCompDetail] Company found: ${company.compName}`);

        return {
            status: 200,
            message: '회사 상세 정보를 조회했습니다.',
            data: company
        };

    } catch (error) {
        logger.error(`[getCompDetail] Error: ${error.message}`);
        logger.error(`[getCompDetail] Stack trace: ${error.stack}`);
        throw error;
    }
};

/**
 * 회사 추가 요청 생성
 */
exports.createCompRequest = async (requestData) => {
    try {
        const { compName, compLocation, compType, compIndustry, compCEO, compAddr, requesterId } = requestData;

        // 필수값 체크
        if (!compName) {
            throw new Error('회사명은 필수입니다.');
        }

        const request = await CompRequest.create({
            compName,
            compCEO: compCEO || null,
            compType: compType || null,
            compIndustry: compIndustry || null,
            compAddr: compAddr || null,
            requesterId: requesterId || null,
            requestStatus: 'pending'
        });

        logger.info(`[createCompRequest] 회사 추가 요청 생성 완료: ${request.requestIdx}`);
        
        return {
            status: 201,
            data: request,
            message: '회사 추가 요청이 성공적으로 제출되었습니다.'
        };
    } catch (error) {
        logger.error(`[createCompRequest] Error: ${error.message}`);
        throw error;
    }
};

// ========== 면접 후기 관련 서비스 ==========

/**
 * 면접 후기 생성
 * @param {Object} interviewData - 면접 후기 데이터
 * @returns {Object} 생성 결과
 */
exports.createInterview = async (interviewData) => {
    try {
        const { compIdx, writerId, writerPw, interviewTitle, interviewContent, interviewDate, interviewResult, interviewDifficulty, position } = interviewData;

        // 필수값 체크
        if (!compIdx || !writerId || !writerPw || !interviewTitle) {
            throw new Error('필수값이 누락되었습니다. (compIdx, writerId, writerPw, interviewTitle)');
        }

        // 회사 존재 확인
        const company = await CompInfo.findByPk(compIdx);
        if (!company) {
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        const interview = await CompInterview.create({
            compIdx,
            writerId,
            writerPw,
            interviewTitle,
            interviewContent: interviewContent || null,
            interviewDate: interviewDate || null,
            interviewResult: interviewResult || null,
            interviewDifficulty: interviewDifficulty || null,
            position: position || null
        });

        logger.info(`[createInterview] 면접 후기 생성 완료: ${interview.interviewIdx}`);
        
        return {
            status: 201,
            message: '면접 후기가 작성되었습니다.',
            data: interview
        };
    } catch (error) {
        logger.error(`[createInterview] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 면접 후기 조회 (목록)
 * @param {number} compIdx - 회사 인덱스 (선택)
 * @param {Object} pagination - 페이지네이션 정보 (page, rowsPerPage)
 * @returns {Object} 면접 후기 목록
 */
exports.getInterviews = async (compIdx = null, pagination = {}) => {
    try {
        const { page = 1, rowsPerPage = 20 } = pagination;
        const pageNum = parseInt(page, 10) || 1;
        const rowsPerPageNum = parseInt(rowsPerPage, 10) || 20;
        const offset = (pageNum - 1) * rowsPerPageNum;

        const whereClause = {
            isDeleted: false
        };

        if (compIdx) {
            whereClause.compIdx = compIdx;
        }

        const { count, rows } = await CompInterview.findAndCountAll({
            where: whereClause,
            include: [{
                model: CompInfo,
                as: 'company',
                attributes: ['compIdx', 'compName']
            }],
            order: [['regDate', 'DESC']],
            limit: rowsPerPageNum,
            offset
        });

        logger.info(`[getInterviews] 면접 후기 조회 완료: ${rows.length}개 / 총 ${count}개`);

        return {
            status: 200,
            message: '면접 후기 조회가 완료되었습니다.',
            data: rows,
            pagination: {
                totalCount: count,
                totalPages: Math.ceil(count / rowsPerPageNum),
                currentPage: pageNum,
                rowsPerPage: rowsPerPageNum,
                hasNextPage: pageNum < Math.ceil(count / rowsPerPageNum),
                hasPrevPage: pageNum > 1
            }
        };
    } catch (error) {
        logger.error(`[getInterviews] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 면접 후기 상세 조회
 * @param {number} interviewIdx - 면접 후기 인덱스
 * @returns {Object} 면접 후기 상세 정보
 */
exports.getInterviewDetail = async (interviewIdx) => {
    try {
        const interview = await CompInterview.findOne({
            where: {
                interviewIdx,
                isDeleted: false
            },
            include: [{
                model: CompInfo,
                as: 'company',
                attributes: ['compIdx', 'compName', 'compLocate', 'compIndustry']
            }]
        });

        if (!interview) {
            return {
                status: 404,
                message: '면접 후기를 찾을 수 없습니다.',
                data: null
            };
        }

        logger.info(`[getInterviewDetail] 면접 후기 상세 조회: ${interviewIdx}`);

        return {
            status: 200,
            message: '면접 후기 상세 조회가 완료되었습니다.',
            data: interview
        };
    } catch (error) {
        logger.error(`[getInterviewDetail] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 면접 후기 수정
 * @param {number} interviewIdx - 면접 후기 인덱스
 * @param {Object} updateData - 수정할 데이터
 * @param {string} writerPw - 작성자 비밀번호 (검증용)
 * @returns {Object} 수정 결과
 */
exports.updateInterview = async (interviewIdx, updateData, writerPw) => {
    try {
        const interview = await CompInterview.findOne({
            where: {
                interviewIdx,
                isDeleted: false
            }
        });

        if (!interview) {
            return {
                status: 404,
                message: '면접 후기를 찾을 수 없습니다.',
                data: null
            };
        }

        // 비밀번호 확인
        if (interview.writerPw !== writerPw) {
            return {
                status: 403,
                message: '비밀번호가 일치하지 않습니다.',
                data: null
            };
        }

        // 수정 가능한 필드만 업데이트
        const allowedFields = ['interviewTitle', 'interviewContent', 'interviewDate', 'interviewResult', 'interviewDifficulty', 'position'];
        const updateFields = {};
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                updateFields[field] = updateData[field];
            }
        });

        await interview.update({
            ...updateFields,
            modDate: new Date()
        });

        logger.info(`[updateInterview] 면접 후기 수정 완료: ${interviewIdx}`);

        return {
            status: 200,
            message: '면접 후기가 수정되었습니다.',
            data: interview
        };
    } catch (error) {
        logger.error(`[updateInterview] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 면접 후기 삭제 (소프트 삭제)
 * @param {number} interviewIdx - 면접 후기 인덱스
 * @param {string} writerPw - 작성자 비밀번호 (검증용)
 * @returns {Object} 삭제 결과
 */
exports.deleteInterview = async (interviewIdx, writerPw) => {
    try {
        const interview = await CompInterview.findOne({
            where: {
                interviewIdx,
                isDeleted: false
            }
        });

        if (!interview) {
            return {
                status: 404,
                message: '면접 후기를 찾을 수 없습니다.',
                data: null
            };
        }

        // 비밀번호 확인
        if (interview.writerPw !== writerPw) {
            return {
                status: 403,
                message: '비밀번호가 일치하지 않습니다.',
                data: null
            };
        }

        // 소프트 삭제
        await interview.update({
            isDeleted: true,
            modDate: new Date()
        });

        logger.info(`[deleteInterview] 면접 후기 삭제 완료: ${interviewIdx}`);

        return {
            status: 200,
            message: '면접 후기가 삭제되었습니다.',
            data: null
        };
    } catch (error) {
        logger.error(`[deleteInterview] Error: ${error.message}`);
        throw error;
    }
};

// ========== 연봉 후기 관련 서비스 ==========

/**
 * 연봉 후기 생성
 * @param {Object} salaryData - 연봉 후기 데이터
 * @returns {Object} 생성 결과
 */
exports.createSalary = async (salaryData) => {
    try {
        const { compIdx, salary, workYear, department } = salaryData;

        // 필수값 체크
        if (!compIdx || !salary || !workYear || !department) {
            throw new Error('필수값이 누락되었습니다. (compIdx, salary, workYear, department)');
        }

        // 회사 존재 확인
        const company = await CompInfo.findByPk(compIdx);
        if (!company) {
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        const salaryReview = await CompSalary.create({
            compIdx,
            salary,
            workYear,
            department
        });

        logger.info(`[createSalary] 연봉 후기 생성 완료: ${salaryReview.salaryIdx}`);
        
        return {
            status: 201,
            message: '연봉 후기가 작성되었습니다.',
            data: salaryReview
        };
    } catch (error) {
        logger.error(`[createSalary] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 연봉 후기 조회 (목록)
 * @param {number} compIdx - 회사 인덱스 (선택)
 * @param {Object} pagination - 페이지네이션 정보 (page, rowsPerPage)
 * @returns {Object} 연봉 후기 목록
 */
exports.getSalaries = async (compIdx = null, pagination = {}) => {
    try {
        const { page = 1, rowsPerPage = 20 } = pagination;
        const pageNum = parseInt(page, 10) || 1;
        const rowsPerPageNum = parseInt(rowsPerPage, 10) || 20;
        const offset = (pageNum - 1) * rowsPerPageNum;

        const whereClause = {};

        if (compIdx) {
            whereClause.compIdx = compIdx;
        }

        const { count, rows } = await CompSalary.findAndCountAll({
            where: whereClause,
            include: [{
                model: CompInfo,
                as: 'company',
                attributes: ['compIdx', 'compName']
            }],
            order: [['regDate', 'DESC']],
            limit: rowsPerPageNum,
            offset
        });

        logger.info(`[getSalaries] 연봉 후기 조회 완료: ${rows.length}개 / 총 ${count}개`);

        return {
            status: 200,
            message: '연봉 후기 조회가 완료되었습니다.',
            data: rows,
            pagination: {
                totalCount: count,
                totalPages: Math.ceil(count / rowsPerPageNum),
                currentPage: pageNum,
                rowsPerPage: rowsPerPageNum,
                hasNextPage: pageNum < Math.ceil(count / rowsPerPageNum),
                hasPrevPage: pageNum > 1
            }
        };
    } catch (error) {
        logger.error(`[getSalaries] Error: ${error.message}`);
        throw error;
    }
};
