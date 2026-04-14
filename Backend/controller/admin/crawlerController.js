let crawlerService;
try {
    crawlerService = require('../../service/restaurantCrawlerService');
} catch (err) {
    console.error('[CrawlerController] restaurantCrawlerService 로드 실패:', err.message);
}
const { RestaurantInfo } = require('../../model/index');
const { fn, col, Op } = require('sequelize');
const logger = require('../../utils/logger');

// 크롤링 가능한 소스 목록 조회
exports.getSources = async (req, res) => {
    try {
        const sources = crawlerService.getAvailableSources();
        res.status(200).json(sources);
    } catch (error) {
        logger.error(`[CrawlerController:getSources] ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 통합 크롤링 실행
exports.runCrawl = async (req, res) => {
    try {
        const {
            sources,           // ['kakao','naver','google','siksin']
            query,             // 검색 키워드
            region,            // 지역
            lat, lng, radius,  // 좌표 + 반경
            countPerSource,    // 소스당 수집 건수
            dryRun,            // true면 수집만 (저장 X)
        } = req.body;

        logger.info(`[CrawlerController:runCrawl] 요청 - sources: ${sources}, region: ${region}, dryRun: ${dryRun}`);

        const result = await crawlerService.crawlRestaurants({
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
        logger.error(`[CrawlerController:runCrawl] ${error.message}`);
        res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
    }
};

// DB 현황 조회
exports.getStats = async (req, res) => {
    try {
        const totalRestaurants = await RestaurantInfo.count({
            where: { restaurantStatus: 1 },
        });

        const withMenu = await RestaurantInfo.count({
            where: {
                restaurantStatus: 1,
                restaurantMenu: { [Op.not]: null },
            },
        });

        const withImage = await RestaurantInfo.count({
            where: {
                restaurantStatus: 1,
                restaurantImage: { [Op.not]: null },
            },
        });

        const withRating = await RestaurantInfo.count({
            where: {
                restaurantStatus: 1,
                restaurantRating: { [Op.not]: null },
            },
        });

        // 최근 7일 내 추가된 식당
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentAdded = await RestaurantInfo.count({
            where: {
                restaurantStatus: 1,
                createdAt: { [Op.gte]: sevenDaysAgo },
            },
        });

        res.status(200).json({
            totalRestaurants,
            withMenu,
            withImage,
            withRating,
            recentAdded,
        });
    } catch (error) {
        logger.error(`[CrawlerController:getStats] ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 비어있는 데이터 컬럼별 통계 조회
exports.getMissingStats = async (req, res) => {
    try {
        const total = await RestaurantInfo.count({ where: { restaurantStatus: 1 } });

        const fields = [
            { key: 'restaurantMenu', label: '메뉴', condition: { [Op.or]: [{ restaurantMenu: null }, { restaurantMenu: '' }] } },
            { key: 'restaurantImage', label: '이미지', condition: { [Op.or]: [{ restaurantImage: null }, { restaurantImage: '' }] } },
            { key: 'restaurantURL', label: 'URL', condition: { [Op.or]: [{ restaurantURL: null }, { restaurantURL: '' }] } },
            { key: 'restaurantLotAddr', label: '지번주소', condition: { [Op.or]: [{ restaurantLotAddr: null }, { restaurantLotAddr: '' }] } },
        ];

        const stats = [];
        for (const f of fields) {
            const missing = await RestaurantInfo.count({
                where: { restaurantStatus: 1, ...f.condition },
            });
            stats.push({ key: f.key, label: f.label, total, missing, filled: total - missing });
        }

        res.status(200).json(stats);
    } catch (error) {
        logger.error(`[CrawlerController:getMissingStats] ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 비어있는 필드 보강 크롤링 (식신 기반)
exports.enrichMissing = async (req, res) => {
    try {
        const { field, limit: reqLimit } = req.body;
        const validFields = ['restaurantMenu', 'restaurantImage'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, message: `보강 가능 필드: ${validFields.join(', ')}` });
        }

        const batchLimit = reqLimit ? parseInt(reqLimit) : 20;

        // 해당 필드가 비어있는 식당 조회
        const restaurants = await RestaurantInfo.findAll({
            where: {
                restaurantStatus: 1,
                [Op.or]: [{ [field]: null }, { [field]: '' }],
            },
            attributes: ['restaurantIdx', 'restaurantName', 'restaurantAddr'],
            limit: batchLimit,
            order: [['restaurantViewCount', 'DESC']],
            raw: true,
        });

        if (restaurants.length === 0) {
            return res.status(200).json({ success: true, message: '보강할 식당이 없습니다.', updated: 0 });
        }

        // 식신에서 식당 이름 검색 → 메뉴/이미지 보강
        let updated = 0;
        const results = [];

        for (const r of restaurants) {
            try {
                const enriched = await crawlerService.enrichFromSiksin(r.restaurantName);

                if (!enriched) {
                    results.push({ name: r.restaurantName, status: 'not_found' });
                    continue;
                }

                const updates = {};
                if (field === 'restaurantMenu' && enriched.menu && enriched.menu.length > 0) {
                    updates.restaurantMenu = enriched.menu;
                }
                if (field === 'restaurantImage' && enriched.image) {
                    updates.restaurantImage = enriched.image;
                }

                if (Object.keys(updates).length > 0) {
                    await RestaurantInfo.update(updates, {
                        where: { restaurantIdx: r.restaurantIdx },
                    });
                    updated++;
                    results.push({ name: r.restaurantName, status: 'updated', matched: enriched.matchedName });
                } else {
                    results.push({ name: r.restaurantName, status: 'no_data', matched: enriched.matchedName });
                }
            } catch (err) {
                results.push({ name: r.restaurantName, status: 'error', error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `${restaurants.length}개 중 ${updated}개 보강 완료`,
            total: restaurants.length,
            updated,
            results,
        });
    } catch (error) {
        logger.error(`[CrawlerController:enrichMissing] ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 단일 소스 크롤링 (테스트용)
exports.runSingleSource = async (req, res) => {
    try {
        const { source } = req.params;
        const { query, region, count, dryRun } = req.query;

        const validSources = ['kakao', 'naver', 'google', 'siksin'];
        if (!validSources.includes(source)) {
            return res.status(400).json({ error: `유효하지 않은 소스: ${source}. 사용 가능: ${validSources.join(',')}` });
        }

        const result = await crawlerService.crawlRestaurants({
            sources: [source],
            query: query || '맛집',
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
        logger.error(`[CrawlerController:runSingleSource] ${error.message}`);
        res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
    }
};
