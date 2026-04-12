const crawlerService = require('../../service/restaurantCrawlerService');
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
        res.status(500).json({ error: error.message || 'Internal Server Error' });
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

        res.status(200).json({
            success: true,
            source,
            ...result,
        });
    } catch (error) {
        logger.error(`[CrawlerController:runSingleSource] ${error.message}`);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
