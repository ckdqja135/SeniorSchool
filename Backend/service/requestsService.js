const {
    ChurchRequest,
    RestaurantRequest,
    OutsourceRequest,
    CompRequest,
    UnivRequest,
} = require('../model/index');
const logger = require('../utils/logger');

const SERVICE_META = {
    church:     { label: '교회 오빠',   model: ChurchRequest,     nameField: 'churchName' },
    restaurant: { label: '맛잘알 오빠', model: RestaurantRequest, nameField: 'restaurantName' },
    outsource:  { label: '외주 오빠',   model: OutsourceRequest,  nameField: 'outsourceName' },
    comp:       { label: '회사 오빠',   model: CompRequest,       nameField: 'compName' },
    univ:       { label: '학교 오빠',   model: UnivRequest,       nameField: 'univName' },
};

const toRow = (service, row) => {
    const meta = SERVICE_META[service];
    const plain = row.get({ plain: true });
    return {
        service,
        serviceLabel: meta.label,
        requestIdx: plain.requestIdx,
        name: plain[meta.nameField],
        requestStatus: plain.requestStatus,
        requestDate: plain.requestDate,
        processedDate: plain.processedDate,
    };
};

exports.getRecentRequests = async ({ limit = 20 } = {}) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
    const perTable = Math.min(safeLimit, 20);

    try {
        const results = await Promise.all(
            Object.entries(SERVICE_META).map(async ([key, meta]) => {
                const rows = await meta.model.findAll({
                    attributes: ['requestIdx', meta.nameField, 'requestStatus', 'requestDate', 'processedDate'],
                    order: [['requestDate', 'DESC']],
                    limit: perTable,
                });
                return rows.map(r => toRow(key, r));
            })
        );

        return results
            .flat()
            .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))
            .slice(0, safeLimit);
    } catch (error) {
        logger.error(`[getRecentRequests] Error: ${error.message}`);
        throw error;
    }
};
