const { CompInfo } = require('../model/index');
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
