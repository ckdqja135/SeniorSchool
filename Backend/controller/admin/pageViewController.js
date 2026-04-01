const pageViewService = require('../../service/admin/pageViewService');
const logger = require('../../utils/logger');

/**
 * 방문 기록 저장 (공개 API)
 */
exports.track = async (req, res) => {
    try {
        const { path, referrer } = req.body;
        if (!path) return res.status(400).json({ success: false, message: 'path is required' });

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        const userAgent = req.headers['user-agent'] || null;
        const referer = referrer || req.headers['referer'] || null;

        await pageViewService.trackPageView({ path, ip, userAgent, referer });
        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error(`[pageView.track] ${error.message}`);
        return res.status(500).json({ success: false });
    }
};

/**
 * 경로별 방문 횟수 통계
 */
exports.getPathStats = async (req, res) => {
    try {
        const { startDate, endDate, limit } = req.query;
        const data = await pageViewService.getPathStats({ startDate, endDate, limit });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error(`[pageView.getPathStats] ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 최근 방문 로그
 */
exports.getRecentLogs = async (req, res) => {
    try {
        const { page, rowsPerPage, path, startDate, endDate, order } = req.query;
        const data = await pageViewService.getRecentLogs({ page, rowsPerPage, path, startDate, endDate, order });
        return res.status(200).json({ success: true, ...data });
    } catch (error) {
        logger.error(`[pageView.getRecentLogs] ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Referer별 통계
 */
exports.getRefererStats = async (req, res) => {
    try {
        const { startDate, endDate, limit } = req.query;
        const data = await pageViewService.getRefererStats({ startDate, endDate, limit });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error(`[pageView.getRefererStats] ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 일별 방문 수
 */
exports.getDailyStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await pageViewService.getDailyStats({ startDate, endDate });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error(`[pageView.getDailyStats] ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
};
