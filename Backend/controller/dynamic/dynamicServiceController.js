const { ServiceConfig } = require('../../model');
const logger = require('../../utils/logger');

/**
 * 퍼블릭 서비스 목록 조회 (active 상태만)
 */
exports.listActiveServices = async (req, res) => {
    try {
        const services = await ServiceConfig.findAll({
            where: { status: 'active' },
            attributes: ['serviceId', 'slug', 'name', 'displayName', 'emoji', 'color', 'templateType', 'sortOrder'],
            order: [['sortOrder', 'ASC'], ['serviceId', 'ASC']]
        });

        const data = services.map(svc => {
            const raw = svc.toJSON();
            return {
                serviceIdx: raw.serviceId,
                serviceSlug: raw.slug,
                serviceName: raw.name,
                serviceDisplay: raw.displayName || raw.name,
                serviceEmoji: raw.emoji,
                serviceColor: raw.color,
                templateType: raw.templateType,
                serviceStatus: 1,
                serviceOrder: raw.sortOrder
            };
        });

        return res.status(200).json({ status: 200, data });
    } catch (error) {
        logger.error(`[public.services.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};
