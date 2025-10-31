const dashboardService = require('../../service/admin/dashboardService');
const logger = require('../../utils/logger');

/**
 * 대시보드 개요 통계 조회
 */
exports.getDashboardOverview = async (req, res) => {
    try {
        logger.info('[getDashboardOverview] Request received');

        const result = await dashboardService.getDashboardOverview();

        logger.info('[getDashboardOverview] Success');
        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error(`[getDashboardOverview] Error: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: '대시보드 개요 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 월별 통계 조회
 */
exports.getMonthlyStats = async (req, res) => {
    try {
        logger.info('[getMonthlyStats] Request received');

        const result = await dashboardService.getMonthlyStats();

        logger.info(`[getMonthlyStats] Success: ${result.length} months retrieved`);
        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error(`[getMonthlyStats] Error: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: '월별 통계 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 최근 활동 조회
 */
exports.getRecentActivities = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        logger.info(`[getRecentActivities] Request received - limit: ${limit}`);

        const result = await dashboardService.getRecentActivities(limit);

        logger.info(`[getRecentActivities] Success: ${result.length} activities retrieved`);
        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error(`[getRecentActivities] Error: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: '최근 활동 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
};

