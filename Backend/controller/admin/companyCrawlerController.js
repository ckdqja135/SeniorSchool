let crawlerService;
try {
    crawlerService = require('../../service/companyCrawlerService');
} catch (err) {
    console.error('[CompCrawlerController] companyCrawlerService 로드 실패:', err.message);
}
const { CompInfo } = require('../../model/index');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

// 크롤링 가능한 소스 목록 조회
exports.getSources = async (req, res) => {
    try {
        const sources = crawlerService.getAvailableSources();
        res.status(200).json(sources);
    } catch (error) {
        logger.error(`[CompCrawlerController:getSources] ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 통합 크롤링 실행
exports.runCrawl = async (req, res) => {
    try {
        const {
            sources,
            query,
            region,
            lat, lng, radius,
            countPerSource,
            dryRun,
        } = req.body;

        logger.info(`[CompCrawlerController:runCrawl] 요청 - sources: ${sources}, region: ${region}, dryRun: ${dryRun}`);

        const result = await crawlerService.crawlCompanies({
            sources,
            query,
            region,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            radius: radius ? parseInt(radius) : undefined,
            countPerSource: countPerSource ? parseInt(countPerSource) : undefined,
            saveToDB: !dryRun,
            dryRun: !!dryRun,
        });

        res.status(200).json({
            success: true,
            message: dryRun
                ? `미리보기 완료: ${result.stats.totalFetched}건 수집`
                : `크롤링 완료: ${result.stats.saved}건 저장, ${result.stats.duplicateSkipped}건 중복 스킵`,
            ...result,
        });
    } catch (error) {
        logger.error(`[CompCrawlerController:runCrawl] ${error.message}`);
        res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
    }
};

// 단일 소스 크롤링 (테스트용)
exports.runSingleSource = async (req, res) => {
    try {
        const { source } = req.params;
        const { query, region, count, dryRun } = req.query;

        const validSources = ['kakao', 'naver', 'publicData'];
        if (!validSources.includes(source)) {
            return res.status(400).json({ error: `유효하지 않은 소스: ${source}. 사용 가능: ${validSources.join(',')}` });
        }

        const result = await crawlerService.crawlCompanies({
            sources: [source],
            query: query || '회사',
            region: region || '서울',
            countPerSource: count ? parseInt(count) : 10,
            saveToDB: !dryRun,
            dryRun: dryRun === 'true',
        });

        const isDryRun = dryRun === 'true';
        res.status(200).json({
            success: true,
            source,
            message: isDryRun
                ? `미리보기 완료: ${result.stats.totalFetched}건 수집`
                : `크롤링 완료: ${result.stats.saved || 0}건 저장, ${result.stats.duplicateSkipped || 0}건 중복 스킵`,
            ...result,
        });
    } catch (error) {
        logger.error(`[CompCrawlerController:runSingleSource] ${error.message}`);
        res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
    }
};

// DB 현황 조회
exports.getStats = async (req, res) => {
    try {
        const totalCompanies = await CompInfo.count({ where: { compStatus: 1 } });

        const withURL = await CompInfo.count({
            where: {
                compStatus: 1,
                compURL: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] },
            },
        });

        const withCEO = await CompInfo.count({
            where: {
                compStatus: 1,
                compCEO: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }, { [Op.ne]: '미정' }] },
            },
        });

        const withIndustry = await CompInfo.count({
            where: {
                compStatus: 1,
                compIndustry: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }, { [Op.ne]: '기타' }] },
            },
        });

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentAdded = await CompInfo.count({
            where: {
                compStatus: 1,
                createdAt: { [Op.gte]: sevenDaysAgo },
            },
        });

        res.status(200).json({
            totalCompanies,
            withURL,
            withCEO,
            withIndustry,
            recentAdded,
        });
    } catch (error) {
        logger.error(`[CompCrawlerController:getStats] ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 비어있는 필드 컬럼별 통계
exports.getMissingStats = async (req, res) => {
    try {
        const total = await CompInfo.count({ where: { compStatus: 1 } });

        const fields = [
            { key: 'compURL', label: '홈페이지', condition: { [Op.or]: [{ compURL: null }, { compURL: '' }] } },
            { key: 'compCEO', label: '대표이사', condition: { [Op.or]: [{ compCEO: null }, { compCEO: '' }, { compCEO: '미정' }] } },
            { key: 'compIndustry', label: '업종', condition: { [Op.or]: [{ compIndustry: null }, { compIndustry: '' }, { compIndustry: '기타' }] } },
            { key: 'compAddr', label: '도로명주소', condition: { [Op.or]: [{ compAddr: null }, { compAddr: '' }] } },
        ];

        const stats = [];
        for (const f of fields) {
            const missing = await CompInfo.count({
                where: { compStatus: 1, ...f.condition },
            });
            stats.push({ key: f.key, label: f.label, total, missing, filled: total - missing });
        }

        res.status(200).json(stats);
    } catch (error) {
        logger.error(`[CompCrawlerController:getMissingStats] ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 비어있는 필드 보강 크롤링 — 네이버 기반
exports.enrichMissing = async (req, res) => {
    req.setTimeout(600000);
    res.setTimeout(600000);

    try {
        const { field, limit: reqLimit } = req.body;
        const validFields = ['compURL', 'compAddr', 'compIndustry'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, message: `보강 가능 필드: ${validFields.join(', ')}` });
        }

        const batchLimit = Math.min(reqLimit ? parseInt(reqLimit) : 10, 50);

        const missingCondition = field === 'compIndustry'
            ? { [Op.or]: [{ compIndustry: null }, { compIndustry: '' }, { compIndustry: '기타' }] }
            : { [Op.or]: [{ [field]: null }, { [field]: '' }] };

        const companies = await CompInfo.findAll({
            where: { compStatus: 1, ...missingCondition },
            attributes: ['compIdx', 'compName', 'compAddr'],
            limit: batchLimit,
            order: [['compViewCount', 'DESC']],
            raw: true,
        });

        if (companies.length === 0) {
            return res.status(200).json({ success: true, message: '보강할 회사가 없습니다.', updated: 0 });
        }

        let updated = 0;
        const results = [];

        for (const c of companies) {
            try {
                const enriched = await crawlerService.enrichFromNaver(c.compName);

                if (!enriched) {
                    results.push({ name: c.compName, status: 'not_found' });
                    continue;
                }

                const updates = {};
                if (field === 'compURL' && enriched.homepage) updates.compURL = enriched.homepage;
                if (field === 'compAddr' && enriched.addr) {
                    updates.compAddr = enriched.addr;
                    if (enriched.lat && enriched.lng) {
                        updates.compLateX = enriched.lat;
                        updates.compLateY = enriched.lng;
                    }
                }
                if (field === 'compIndustry' && enriched.industry) updates.compIndustry = enriched.industry;

                if (Object.keys(updates).length > 0) {
                    await CompInfo.update(updates, { where: { compIdx: c.compIdx } });
                    updated++;
                    results.push({ name: c.compName, status: 'updated', matched: enriched.matchedName });
                } else {
                    results.push({ name: c.compName, status: 'no_data', matched: enriched.matchedName });
                }
            } catch (err) {
                results.push({ name: c.compName, status: 'error', error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `${companies.length}개 중 ${updated}개 보강 완료`,
            total: companies.length,
            updated,
            results,
        });
    } catch (error) {
        logger.error(`[CompCrawlerController:enrichMissing] ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 비어있는 필드 보강 크롤링 — 실시간 스트리밍 (NDJSON)
exports.enrichMissingStream = async (req, res) => {
    req.setTimeout(600000);
    res.setTimeout(600000);

    const { field, limit: reqLimit } = req.body;
    const validFields = ['compURL', 'compAddr', 'compIndustry'];
    if (!validFields.includes(field)) {
        return res.status(400).json({ success: false, message: `보강 가능 필드: ${validFields.join(', ')}` });
    }

    const batchLimit = Math.min(reqLimit ? parseInt(reqLimit) : 10, 50);

    const missingCondition = field === 'compIndustry'
        ? { [Op.or]: [{ compIndustry: null }, { compIndustry: '' }, { compIndustry: '기타' }] }
        : { [Op.or]: [{ [field]: null }, { [field]: '' }] };

    let companies;
    try {
        companies = await CompInfo.findAll({
            where: { compStatus: 1, ...missingCondition },
            attributes: ['compIdx', 'compName', 'compAddr'],
            limit: batchLimit,
            order: [['compViewCount', 'DESC']],
            raw: true,
        });
    } catch (error) {
        logger.error(`[CompCrawlerController:enrichMissingStream] findAll: ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const writeLine = (obj) => {
        res.write(JSON.stringify(obj) + '\n');
        if (typeof res.flush === 'function') res.flush();
    };

    writeLine({ type: 'start', total: companies.length, field });

    if (companies.length === 0) {
        writeLine({ type: 'done', success: true, message: '보강할 회사가 없습니다.', total: 0, updated: 0, results: [] });
        return res.end();
    }

    let updated = 0;
    const results = [];

    for (let i = 0; i < companies.length; i++) {
        const c = companies[i];
        const startedAt = Date.now();
        let entry;
        try {
            const enriched = await crawlerService.enrichFromNaver(c.compName);

            if (!enriched) {
                entry = { name: c.compName, status: 'not_found' };
            } else {
                const updates = {};
                if (field === 'compURL' && enriched.homepage) updates.compURL = enriched.homepage;
                if (field === 'compAddr' && enriched.addr) {
                    updates.compAddr = enriched.addr;
                    if (enriched.lat && enriched.lng) {
                        updates.compLateX = enriched.lat;
                        updates.compLateY = enriched.lng;
                    }
                }
                if (field === 'compIndustry' && enriched.industry) updates.compIndustry = enriched.industry;

                if (Object.keys(updates).length > 0) {
                    await CompInfo.update(updates, { where: { compIdx: c.compIdx } });
                    updated++;
                    entry = { name: c.compName, status: 'updated', matched: enriched.matchedName };
                } else {
                    entry = { name: c.compName, status: 'no_data', matched: enriched.matchedName };
                }
            }
        } catch (err) {
            logger.error(`[CompCrawlerController:enrichMissingStream] ${c.compName}: ${err.message}`);
            entry = { name: c.compName, status: 'error', error: err.message };
        }

        results.push(entry);
        writeLine({
            type: 'progress',
            index: i,
            total: companies.length,
            updated,
            elapsedMs: Date.now() - startedAt,
            ...entry,
        });
    }

    writeLine({
        type: 'done',
        success: true,
        message: `${companies.length}개 중 ${updated}개 보강 완료`,
        total: companies.length,
        updated,
        results,
    });
    res.end();
};
