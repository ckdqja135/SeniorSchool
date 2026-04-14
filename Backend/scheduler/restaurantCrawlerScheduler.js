/**
 * 식당 크롤러 주간 스케줄러
 * 매주 월요일 새벽 3시에 AI 키워드 생성 + 자동 크롤링 실행
 */

const cron = require('node-cron');
const crawlerKeywordService = require('../service/crawlerKeywordService');
const { crawlRestaurants } = require('../service/restaurantCrawlerService');
const logger = require('../utils/logger');

class RestaurantCrawlerScheduler {
    constructor() {
        this.isRunning = false;
        this.lastRunTime = null;
        this.lastStats = null;
    }

    start() {
        // 매주 월요일 새벽 3시
        cron.schedule('0 3 * * 1', async () => {
            await this.run();
        });

        logger.info('[RestaurantCrawlerScheduler] 스케줄러 시작 (매주 월요일 03:00)');
    }

    async runNow() {
        logger.info('[RestaurantCrawlerScheduler] 수동 실행');
        await this.run();
    }

    async run() {
        if (this.isRunning) {
            logger.warn('[RestaurantCrawlerScheduler] 이미 실행 중, 스킵');
            return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();
        const stats = { keywordsGenerated: 0, totalSaved: 0, failed: 0 };

        logger.info('[RestaurantCrawlerScheduler] ========== 주간 크롤링 시작 ==========');

        try {
            // 1) DB 현황 조회
            logger.info('[RestaurantCrawlerScheduler] 1) DB 현황 조회');
            const dbStats = await crawlerKeywordService.getDBStats();
            logger.info(`[RestaurantCrawlerScheduler] 총 식당 수: ${dbStats.totalCount}개`);

            // 2) Gemini API로 키워드 생성
            logger.info('[RestaurantCrawlerScheduler] 2) AI 키워드 생성');
            const keywords = await crawlerKeywordService.generateKeywordsWithGemini(dbStats);

            // 3) 키워드 저장
            logger.info('[RestaurantCrawlerScheduler] 3) 키워드 저장');
            stats.keywordsGenerated = await crawlerKeywordService.saveKeywords(keywords);

            // 4) 키워드별 크롤링 실행
            logger.info('[RestaurantCrawlerScheduler] 4) 크롤링 실행');
            const activeKeywords = await crawlerKeywordService.getActiveKeywords();

            for (const kw of activeKeywords) {
                try {
                    const result = await crawlRestaurants({
                        sources: ['kakao', 'naver', 'siksin'],
                        query: kw.keyword,
                        region: kw.region,
                        countPerSource: 20,
                        saveToDB: true,
                    });

                    const saved = result.stats?.saved || 0;
                    stats.totalSaved += saved;

                    // 5) discoveryCount 업데이트
                    await crawlerKeywordService.updateDiscoveryCount(kw.keywordIdx, saved);

                    logger.info(`[RestaurantCrawlerScheduler] "${kw.keyword}"(${kw.region}) → ${saved}건 저장`);
                } catch (err) {
                    stats.failed++;
                    logger.error(`[RestaurantCrawlerScheduler] "${kw.keyword}" 크롤링 실패: ${err.message}`);
                }
            }

            this.lastStats = stats;
            logger.info(`[RestaurantCrawlerScheduler] ========== 완료 - 키워드: ${stats.keywordsGenerated}개, 저장: ${stats.totalSaved}건, 실패: ${stats.failed}건 ==========`);
        } catch (err) {
            logger.error(`[RestaurantCrawlerScheduler] 오류: ${err.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            lastStats: this.lastStats,
        };
    }
}

const scheduler = new RestaurantCrawlerScheduler();
module.exports = scheduler;
