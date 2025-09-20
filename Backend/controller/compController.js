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
