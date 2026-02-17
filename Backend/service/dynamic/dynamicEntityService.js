const { sequelize } = require('../../model');
const { buildSelectSQL, buildCountSQL, buildInsertSQL, buildUpdateSQL } = require('../../utils/dynamicQueryBuilder');
const logger = require('../../utils/logger');

/**
 * 허용된 엔티티 컬럼 화이트리스트 생성
 */
function getAllowedColumns(fieldConfigs, templateType) {
    // 공통 기본 컬럼
    const base = [
        'name', 'location', 'type', 'established', 'leader',
        'lat_x', 'lat_y', 'url', 'lot_addr', 'addr', 'map_img', 'status', 'view_count'
    ];

    if (templateType === 'company') {
        base.push('ceo', 'industry', 'employee_count', 'avg_salary', 'capital',
            'sales', 'operating_profit', 'net_income', 'total_assets', 'total_liabilities', 'total_equity');
    } else if (templateType === 'restaurant') {
        base.push('owner', 'image', 'average_rating', 'rating_count', 'food_type');
    }

    // 커스텀 필드 추가
    for (const f of fieldConfigs) {
        const key = f.fieldKey || f.field_key;
        if (!base.includes(key)) base.push(key);
    }

    return base;
}

/**
 * 엔티티 목록 (페이지네이션 + 필터)
 */
exports.listEntities = async (tables, fieldConfigs, serviceConfig, query) => {
    try {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const where = { status: 1 };

        if (query.location) where.location = query.location;
        if (query.type) where.type = query.type;

        const { sql: countSql, params: countParams } = buildCountSQL(tables.entities, where);
        const { sql, params } = buildSelectSQL(tables.entities, { page, limit, where });

        const [countResult] = await sequelize.query(countSql, { replacements: countParams, type: sequelize.QueryTypes.SELECT });
        const rows = await sequelize.query(sql, { replacements: params, type: sequelize.QueryTypes.SELECT });

        const total = countResult.total;
        return {
            status: 200,
            totalCount: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            currentCount: rows.length,
            data: rows
        };
    } catch (error) {
        logger.error(`[dynamicEntity.list] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 엔티티 상세 (조회수 증가)
 */
exports.getEntityDetail = async (tables, entityId) => {
    try {
        const rows = await sequelize.query(
            `SELECT * FROM ${tables.entities} WHERE \`entity_idx\` = ?`,
            { replacements: [entityId], type: sequelize.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return { status: 404, message: '엔티티를 찾을 수 없습니다.' };
        }

        // 조회수 증가
        await sequelize.query(
            `UPDATE ${tables.entities} SET \`view_count\` = \`view_count\` + 1 WHERE \`entity_idx\` = ?`,
            { replacements: [entityId] }
        );

        return { status: 200, data: rows[0] };
    } catch (error) {
        logger.error(`[dynamicEntity.detail] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 인기 TOP N
 */
exports.getTopViewed = async (tables, query) => {
    try {
        const limit = parseInt(query.limit) || 10;
        const rows = await sequelize.query(
            `SELECT * FROM ${tables.entities} WHERE \`status\` = 1 ORDER BY \`view_count\` DESC LIMIT ?`,
            { replacements: [limit], type: sequelize.QueryTypes.SELECT }
        );

        return { status: 200, data: rows };
    } catch (error) {
        logger.error(`[dynamicEntity.topViewed] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 자동완성 검색
 */
exports.autoSearch = async (tables, query) => {
    try {
        const keyword = query.keyword;
        if (!keyword || keyword.trim().length === 0) {
            return { status: 200, data: [] };
        }

        const rows = await sequelize.query(
            `SELECT \`entity_idx\`, \`name\`, \`location\` FROM ${tables.entities} WHERE \`status\` = 1 AND \`name\` LIKE ? ORDER BY \`name\` ASC LIMIT 10`,
            { replacements: [`%${keyword}%`], type: sequelize.QueryTypes.SELECT }
        );

        return { status: 200, data: rows };
    } catch (error) {
        logger.error(`[dynamicEntity.autoSearch] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 엔티티 생성 (어드민)
 */
exports.createEntity = async (tables, fieldConfigs, serviceConfig, data) => {
    try {
        const allowed = getAllowedColumns(fieldConfigs, serviceConfig.templateType || serviceConfig.template_type);
        const { sql, params } = buildInsertSQL(tables.entities, data, allowed);

        const [result] = await sequelize.query(sql, { replacements: params });
        logger.info(`[dynamicEntity.create] entity_idx=${result}`);
        return { status: 201, data: { entityIdx: result } };
    } catch (error) {
        logger.error(`[dynamicEntity.create] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 엔티티 수정 (어드민)
 */
exports.updateEntity = async (tables, fieldConfigs, serviceConfig, entityId, data) => {
    try {
        // 존재 확인
        const rows = await sequelize.query(
            `SELECT \`entity_idx\` FROM ${tables.entities} WHERE \`entity_idx\` = ?`,
            { replacements: [entityId], type: sequelize.QueryTypes.SELECT }
        );
        if (rows.length === 0) {
            return { status: 404, message: '엔티티를 찾을 수 없습니다.' };
        }

        const allowed = getAllowedColumns(fieldConfigs, serviceConfig.templateType || serviceConfig.template_type);
        const { sql, params } = buildUpdateSQL(tables.entities, data, 'entity_idx', entityId, allowed);

        await sequelize.query(sql, { replacements: params });
        logger.info(`[dynamicEntity.update] entity_idx=${entityId}`);
        return { status: 200, message: '엔티티가 수정되었습니다.' };
    } catch (error) {
        logger.error(`[dynamicEntity.update] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 엔티티 삭제 (어드민, soft delete)
 */
exports.deleteEntity = async (tables, entityId) => {
    try {
        const rows = await sequelize.query(
            `SELECT \`entity_idx\` FROM ${tables.entities} WHERE \`entity_idx\` = ?`,
            { replacements: [entityId], type: sequelize.QueryTypes.SELECT }
        );
        if (rows.length === 0) {
            return { status: 404, message: '엔티티를 찾을 수 없습니다.' };
        }

        await sequelize.query(
            `UPDATE ${tables.entities} SET \`status\` = 0 WHERE \`entity_idx\` = ?`,
            { replacements: [entityId] }
        );

        logger.info(`[dynamicEntity.delete] entity_idx=${entityId}`);
        return { status: 200, message: '엔티티가 삭제되었습니다.' };
    } catch (error) {
        logger.error(`[dynamicEntity.delete] Error: ${error.message}`);
        throw error;
    }
};
