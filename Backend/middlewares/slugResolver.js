/**
 * slugResolver 미들웨어
 * :slug 파라미터를 검증하고, service_configs 조회 후 req에 주입
 * 5분 메모리 캐시 적용
 */
const { ServiceConfig, ServiceFieldConfig } = require('../model');
const { validateSlug, getDynamicTableNames } = require('../utils/slugValidator');
const logger = require('../utils/logger');

// 5분 캐시 (slug -> { config, fields, tables, cachedAt })
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function clearExpired() {
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (now - entry.cachedAt > CACHE_TTL) {
            cache.delete(key);
        }
    }
}

// 주기적 캐시 정리 (10분마다)
setInterval(clearExpired, 10 * 60 * 1000).unref();

/**
 * Express 미들웨어: slug 검증 -> DB 조회 -> req 주입
 */
async function slugResolver(req, res, next) {
    const slug = req.params.slug;

    // 1. slug 형식 검증
    const validation = validateSlug(slug);
    if (!validation.valid) {
        return res.status(400).json({ status: 400, message: validation.error });
    }

    try {
        // 2. 캐시 확인
        const now = Date.now();
        const cached = cache.get(slug);
        if (cached && (now - cached.cachedAt < CACHE_TTL)) {
            req.serviceConfig = cached.config;
            req.fieldConfigs = cached.fields;
            req.dynamicTables = cached.tables;
            return next();
        }

        // 3. DB 조회
        const config = await ServiceConfig.findOne({
            where: { slug, status: 'active' }
        });

        if (!config) {
            return res.status(404).json({ status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` });
        }

        const fields = await ServiceFieldConfig.findAll({
            where: { serviceId: config.serviceId },
            order: [['sortOrder', 'ASC']]
        });

        const tables = getDynamicTableNames(slug);

        // 4. 캐시 저장
        cache.set(slug, {
            config: config.toJSON(),
            fields: fields.map(f => f.toJSON()),
            tables,
            cachedAt: now
        });

        // 5. req 주입
        req.serviceConfig = config.toJSON();
        req.fieldConfigs = fields.map(f => f.toJSON());
        req.dynamicTables = tables;

        next();
    } catch (error) {
        logger.error(`[slugResolver] Error for slug '${slug}': ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
}

/**
 * 캐시 무효화 (서비스 설정 변경 시 호출)
 */
function invalidateCache(slug) {
    if (slug) {
        cache.delete(slug);
    } else {
        cache.clear();
    }
}

module.exports = { slugResolver, invalidateCache };
