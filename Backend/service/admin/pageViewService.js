const { PageView } = require('../../model');
const { Op, fn, col, literal } = require('sequelize');

/**
 * 방문 기록 저장
 */
exports.trackPageView = async ({ path, ip, userAgent, referer }) => {
    await PageView.create({
        pvPath: path,
        pvIp: ip || null,
        pvUserAgent: userAgent || null,
        pvReferer: referer || null,
    });
};

/**
 * 경로별 방문 횟수 통계
 */
exports.getPathStats = async ({ startDate, endDate, limit = 20 }) => {
    const where = {};
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt[Op.lte] = end;
        }
    }

    const stats = await PageView.findAll({
        attributes: ['pvPath', [fn('COUNT', col('pvIdx')), 'count']],
        where,
        group: ['pvPath'],
        order: [[literal('count'), 'DESC']],
        limit: parseInt(limit),
        raw: true,
    });

    return stats;
};

/**
 * 최근 방문 로그 (페이지네이션)
 */
exports.getRecentLogs = async ({ page = 1, rowsPerPage = 30, path, startDate, endDate, order = 'DESC' }) => {
    const where = {};
    if (path) where.pvPath = { [Op.like]: `%${path}%` };
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt[Op.lte] = end;
        }
    }

    const offset = (parseInt(page) - 1) * parseInt(rowsPerPage);
    const { count, rows } = await PageView.findAndCountAll({
        where,
        order: [['createdAt', order === 'ASC' ? 'ASC' : 'DESC']],
        limit: parseInt(rowsPerPage),
        offset,
        raw: true,
    });

    return {
        totalCount: count,
        totalPages: Math.ceil(count / parseInt(rowsPerPage)),
        currentPage: parseInt(page),
        data: rows,
    };
};

/**
 * 일별 방문 수 (최근 30일)
 */
exports.getDailyStats = async ({ startDate, endDate }) => {
    const where = {};
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt[Op.lte] = end;
        }
    } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        where.createdAt = { [Op.gte]: thirtyDaysAgo };
    }

    const stats = await PageView.findAll({
        attributes: [
            [fn('DATE', col('createdAt')), 'date'],
            [fn('COUNT', col('pvIdx')), 'count'],
        ],
        where,
        group: [fn('DATE', col('createdAt'))],
        order: [[fn('DATE', col('createdAt')), 'ASC']],
        raw: true,
    });

    return stats;
};
