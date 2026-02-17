const { ServiceConfig, ServiceFieldConfig, sequelize } = require('../../model');
const { validateSlug, getDynamicTableNames } = require('../../utils/slugValidator');
const { invalidateCache } = require('../../middlewares/slugResolver');
const {
    buildCreateEntitiesSQL,
    buildCreateBoardsSQL,
    buildCreateCommentsSQL,
    buildCreateRequestsSQL
} = require('../../utils/dynamicQueryBuilder');
const logger = require('../../utils/logger');

// ── 응답 변환 (DB → 프론트 기대 형식) ──

const STATUS_MAP = { active: 1, inactive: 0, deleted: -1 };
const STATUS_REVERSE = { 1: 'active', 0: 'inactive', '-1': 'deleted' };

function formatService(svc) {
    const raw = svc.toJSON ? svc.toJSON() : svc;
    const result = {
        serviceIdx: raw.serviceId,
        serviceSlug: raw.slug,
        serviceName: raw.name,
        serviceDisplay: raw.displayName || raw.name,
        serviceEmoji: raw.emoji,
        serviceColor: raw.color,
        templateType: raw.templateType,
        serviceStatus: STATUS_MAP[raw.status] !== undefined ? STATUS_MAP[raw.status] : 1,
        serviceOrder: raw.sortOrder,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
    if (raw.fields) {
        result.fields = raw.fields.map(formatField);
    }
    return result;
}

function formatField(f) {
    const raw = f.toJSON ? f.toJSON() : f;
    return {
        fieldIdx: raw.fieldId,
        fieldKey: raw.fieldKey,
        fieldLabel: raw.fieldLabel,
        fieldType: raw.fieldType,
        isRequired: !!raw.isRequired,
        showInList: !!raw.showInList,
        showInDetail: !!raw.showInDetail,
        showInSearch: !!raw.isSearchable,
        sortOrder: raw.sortOrder
    };
}

// 프론트 입력 → DB 필드 변환
function normalizeInput(data) {
    return {
        slug: data.serviceSlug || data.slug,
        name: data.serviceName || data.name,
        displayName: data.serviceDisplay || data.displayName,
        emoji: data.serviceEmoji || data.emoji,
        color: data.serviceColor || data.color,
        templateType: data.templateType,
        sortOrder: data.serviceOrder !== undefined ? data.serviceOrder : data.sortOrder,
        customFields: data.customFields || []
    };
}

// ── 템플릿별 기본 필드 정의 ──

const TEMPLATE_FIELDS = {
    basic: [
        { fieldKey: 'name', fieldLabel: '이름', fieldType: 'text', fieldLength: 60, isRequired: 1, isSearchable: 1, sortOrder: 1 },
        { fieldKey: 'location', fieldLabel: '위치', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 2 },
        { fieldKey: 'type', fieldLabel: '유형', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 3 },
        { fieldKey: 'established', fieldLabel: '설립일', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 4 },
        { fieldKey: 'leader', fieldLabel: '대표자', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 5 },
        { fieldKey: 'url', fieldLabel: '홈페이지', fieldType: 'url', fieldLength: 200, isRequired: 0, isSearchable: 0, sortOrder: 6 },
        { fieldKey: 'addr', fieldLabel: '주소', fieldType: 'text', fieldLength: 200, isRequired: 0, isSearchable: 1, sortOrder: 7 }
    ],
    company: [
        { fieldKey: 'name', fieldLabel: '회사명', fieldType: 'text', fieldLength: 60, isRequired: 1, isSearchable: 1, sortOrder: 1 },
        { fieldKey: 'location', fieldLabel: '위치', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 2 },
        { fieldKey: 'type', fieldLabel: '회사 유형', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 3 },
        { fieldKey: 'ceo', fieldLabel: '대표이사', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 4 },
        { fieldKey: 'industry', fieldLabel: '업종', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 5 },
        { fieldKey: 'employee_count', fieldLabel: '직원 수', fieldType: 'number', isRequired: 0, isSearchable: 0, sortOrder: 6 },
        { fieldKey: 'avg_salary', fieldLabel: '평균 연봉', fieldType: 'number', isRequired: 0, isSearchable: 0, sortOrder: 7 },
        { fieldKey: 'addr', fieldLabel: '주소', fieldType: 'text', fieldLength: 200, isRequired: 0, isSearchable: 1, sortOrder: 8 }
    ],
    restaurant: [
        { fieldKey: 'name', fieldLabel: '맛집명', fieldType: 'text', fieldLength: 60, isRequired: 1, isSearchable: 1, sortOrder: 1 },
        { fieldKey: 'location', fieldLabel: '위치', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 2 },
        { fieldKey: 'food_type', fieldLabel: '음식 종류', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 3 },
        { fieldKey: 'owner', fieldLabel: '대표자', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 4 },
        { fieldKey: 'image', fieldLabel: '이미지', fieldType: 'image', fieldLength: 200, isRequired: 0, isSearchable: 0, sortOrder: 5 },
        { fieldKey: 'addr', fieldLabel: '주소', fieldType: 'text', fieldLength: 200, isRequired: 0, isSearchable: 1, sortOrder: 6 }
    ]
};


/**
 * 서비스 목록 조회 (fields 포함)
 */
exports.listServices = async (query = {}) => {
    try {
        const where = {};
        if (query.status) where.status = query.status;
        else where.status = ['active', 'inactive'];

        const services = await ServiceConfig.findAll({
            where,
            include: [{ model: ServiceFieldConfig, as: 'fields' }],
            order: [['sortOrder', 'ASC'], ['serviceId', 'ASC']]
        });

        logger.info(`[serviceConfig.list] ${services.length} services found`);
        return { status: 200, data: services.map(formatService) };
    } catch (error) {
        logger.error(`[serviceConfig.list] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 서비스 상세 + 필드 설정 조회
 */
exports.getServiceBySlug = async (slug) => {
    try {
        const service = await ServiceConfig.findOne({
            where: { slug },
            include: [{ model: ServiceFieldConfig, as: 'fields' }]
        });

        if (!service) {
            return { status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` };
        }

        return { status: 200, data: formatService(service) };
    } catch (error) {
        logger.error(`[serviceConfig.get] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 서비스 생성 (보상 트랜잭션 패턴)
 */
exports.createService = async (data) => {
    const input = normalizeInput(data);
    const { slug, name, displayName, emoji, color, templateType = 'basic', sortOrder = 0, customFields } = input;

    // 1. slug 검증
    const validation = validateSlug(slug);
    if (!validation.valid) {
        return { status: 400, message: validation.error };
    }

    // 2. 중복 체크
    const existing = await ServiceConfig.findOne({ where: { slug } });
    if (existing) {
        return { status: 409, message: `slug '${slug}'는 이미 사용 중입니다.` };
    }

    let serviceConfig = null;
    const tables = getDynamicTableNames(slug);
    const createdTables = [];

    try {
        // Phase A: 설정 INSERT (트랜잭션)
        const transaction = await sequelize.transaction();
        try {
            serviceConfig = await ServiceConfig.create({
                slug, name, displayName, emoji, color, templateType, sortOrder
            }, { transaction });

            const templateFields = TEMPLATE_FIELDS[templateType] || TEMPLATE_FIELDS.basic;
            const allFields = [...templateFields, ...customFields].map((f, i) => ({
                serviceId: serviceConfig.serviceId,
                fieldKey: f.fieldKey,
                fieldLabel: f.fieldLabel,
                fieldType: f.fieldType || 'text',
                fieldLength: f.fieldLength || null,
                isRequired: f.isRequired || 0,
                isSearchable: f.isSearchable || (f.showInSearch ? 1 : 0),
                showInList: f.showInList !== undefined ? (f.showInList ? 1 : 0) : 1,
                showInDetail: f.showInDetail !== undefined ? (f.showInDetail ? 1 : 0) : 1,
                showInAdmin: f.showInAdmin !== undefined ? (f.showInAdmin ? 1 : 0) : 1,
                sortOrder: f.sortOrder || (templateFields.length + i + 1)
            }));

            await ServiceFieldConfig.bulkCreate(allFields, { transaction });
            await transaction.commit();
            logger.info(`[serviceConfig.create] Phase A complete: slug=${slug}, serviceId=${serviceConfig.serviceId}`);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

        // Phase B: DDL (auto-commit)
        const fieldConfigs = await ServiceFieldConfig.findAll({
            where: { serviceId: serviceConfig.serviceId }
        });

        const ddlStatements = [
            { name: 'entities', sql: buildCreateEntitiesSQL(tables.entities, templateType, fieldConfigs) },
            { name: 'boards', sql: buildCreateBoardsSQL(tables.boards) },
            { name: 'comments', sql: buildCreateCommentsSQL(tables.comments) },
            { name: 'requests', sql: buildCreateRequestsSQL(tables.requests) }
        ];

        for (const stmt of ddlStatements) {
            await sequelize.query(stmt.sql);
            createdTables.push(stmt.name);
            logger.info(`[serviceConfig.create] Table created: dynamic_${slug}_${stmt.name}`);
        }

        invalidateCache(slug);

        // 생성된 서비스 + 필드 조회 후 프론트 형식으로 반환
        const created = await ServiceConfig.findOne({
            where: { serviceId: serviceConfig.serviceId },
            include: [{ model: ServiceFieldConfig, as: 'fields' }]
        });

        logger.info(`[serviceConfig.create] Service created successfully: slug=${slug}`);
        return { status: 201, data: formatService(created) };

    } catch (error) {
        logger.error(`[serviceConfig.create] Error: ${error.message}`);

        // 보상 트랜잭션
        for (const tblName of createdTables) {
            try {
                await sequelize.query(`DROP TABLE IF EXISTS ${tables[tblName]}`);
                logger.info(`[serviceConfig.create] Compensation: dropped ${tables[tblName]}`);
            } catch (dropErr) {
                logger.error(`[serviceConfig.create] Compensation drop failed: ${dropErr.message}`);
            }
        }

        if (serviceConfig) {
            try {
                await ServiceFieldConfig.destroy({ where: { serviceId: serviceConfig.serviceId } });
                await ServiceConfig.destroy({ where: { serviceId: serviceConfig.serviceId } });
                logger.info(`[serviceConfig.create] Compensation: config records deleted`);
            } catch (delErr) {
                logger.error(`[serviceConfig.create] Compensation delete failed: ${delErr.message}`);
            }
        }

        throw error;
    }
};

/**
 * 서비스 설정 수정
 */
exports.updateService = async (slug, data) => {
    try {
        const service = await ServiceConfig.findOne({ where: { slug } });
        if (!service) {
            return { status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` };
        }

        // 프론트 필드명 + DB 필드명 모두 허용
        const updateData = {};
        if (data.serviceName !== undefined || data.name !== undefined) updateData.name = data.serviceName || data.name;
        if (data.serviceDisplay !== undefined || data.displayName !== undefined) updateData.displayName = data.serviceDisplay || data.displayName;
        if (data.serviceEmoji !== undefined || data.emoji !== undefined) updateData.emoji = data.serviceEmoji || data.emoji;
        if (data.serviceColor !== undefined || data.color !== undefined) updateData.color = data.serviceColor || data.color;
        if (data.serviceOrder !== undefined || data.sortOrder !== undefined) updateData.sortOrder = data.serviceOrder !== undefined ? data.serviceOrder : data.sortOrder;
        if (data.serviceStatus !== undefined) {
            updateData.status = STATUS_REVERSE[String(data.serviceStatus)] || data.serviceStatus;
        } else if (data.status !== undefined) {
            updateData.status = data.status;
        }

        await ServiceConfig.update(updateData, { where: { serviceId: service.serviceId } });
        invalidateCache(slug);

        logger.info(`[serviceConfig.update] slug=${slug} updated`);
        return { status: 200, message: '서비스 설정이 수정되었습니다.' };
    } catch (error) {
        logger.error(`[serviceConfig.update] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 서비스 비활성화 (soft delete)
 */
exports.deleteService = async (slug) => {
    try {
        const service = await ServiceConfig.findOne({ where: { slug } });
        if (!service) {
            return { status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` };
        }

        await ServiceConfig.update({ status: 'deleted' }, { where: { serviceId: service.serviceId } });
        invalidateCache(slug);

        logger.info(`[serviceConfig.delete] slug=${slug} soft-deleted`);
        return { status: 200, message: '서비스가 비활성화되었습니다.' };
    } catch (error) {
        logger.error(`[serviceConfig.delete] Error: ${error.message}`);
        throw error;
    }
};
