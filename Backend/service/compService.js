const { CompInfo, CompRequest } = require('../model/index');
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
