/**
 * 식당 크롤러 주간 스케줄러
 * 매주 월요일 새벽 3시에 AI 키워드 생성 + 자동 크롤링 실행,
 * 이어서 메뉴·이미지·URL 이 빈 식당 보강(RestaurantEnrichService — 실행당 최대 2시간, 커서로 이어 감)
 *
 * Backend/scheduler/restaurantCrawlerScheduler.js의 1:1 포팅.
 *  - node-cron cron.schedule('0 3 * * 1', ...) → @Cron('0 3 * * 1') (동일 표현식).
 *    ScheduleModule.forRoot()는 오케스트레이터가 등록하며, @Cron이 자동 등록되므로 .start()는 호출하지 않는다.
 *  - isRunning 가드 / lastRunTime / lastStats / runNow() / run() / getStatus() 반환 형태를 그대로 유지.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { logger } from '../../../logger/winston.logger';
import { CrawlerKeywordService } from './crawler-keyword.service';
import { RestaurantCrawlerService } from './restaurant-crawler.service';
import { RestaurantEnrichService } from './restaurant-enrich.service';

@Injectable()
export class RestaurantCrawlerSchedulerService implements OnModuleInit {
    private isRunning = false;
    private lastRunTime: Date | null = null;
    private lastStats: any = null;

    constructor(
        private readonly crawlerKeywordService: CrawlerKeywordService,
        private readonly restaurantCrawlerService: RestaurantCrawlerService,
        private readonly restaurantEnrichService: RestaurantEnrichService,
    ) {}

    // 구 app.js가 부트 시 scheduler.start()를 호출해 남기던 시작 로그를 재현.
    // (@Cron 등록은 데코레이터가 자동 처리하므로 여기서는 로그만 남긴다.)
    onModuleInit() {
        logger.info('[RestaurantCrawlerScheduler] 스케줄러 시작 (매주 월요일 03:00 — 수집 후 빈 필드 보강)');
    }

    // 크론 등록은 SchedulerRunService 로 옮겼다 (수동·정기 실행이 같은 경로를 타며 실행 기록이 남도록).
    // 표현식은 그대로 '0 3 * * 1'.

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
        const stats: any = { keywordsGenerated: 0, totalSaved: 0, failed: 0 };

        logger.info('[RestaurantCrawlerScheduler] ========== 주간 크롤링 시작 ==========');

        try {
            // 1) DB 현황 조회
            logger.info('[RestaurantCrawlerScheduler] 1) DB 현황 조회');
            const dbStats = await this.crawlerKeywordService.getDBStats();
            logger.info(`[RestaurantCrawlerScheduler] 총 식당 수: ${dbStats.totalCount}개`);

            // 2) Gemini API로 키워드 생성
            logger.info('[RestaurantCrawlerScheduler] 2) AI 키워드 생성');
            const keywords = await this.crawlerKeywordService.generateKeywordsWithGemini(dbStats);

            // 3) 키워드 저장
            logger.info('[RestaurantCrawlerScheduler] 3) 키워드 저장');
            stats.keywordsGenerated = await this.crawlerKeywordService.saveKeywords(keywords);

            // 4) 키워드별 크롤링 실행
            logger.info('[RestaurantCrawlerScheduler] 4) 크롤링 실행');
            const activeKeywords = await this.crawlerKeywordService.getActiveKeywords();

            for (const kw of activeKeywords) {
                try {
                    const result = await this.restaurantCrawlerService.crawlRestaurants({
                        sources: ['kakao', 'naver', 'siksin'],
                        query: kw.keyword,
                        region: kw.region,
                        countPerSource: 20,
                        saveToDB: true,
                    });

                    const saved = result.stats?.saved || 0;
                    stats.totalSaved += saved;

                    // 5) discoveryCount 업데이트
                    await this.crawlerKeywordService.updateDiscoveryCount(kw.keywordIdx, saved);

                    logger.info(`[RestaurantCrawlerScheduler] "${kw.keyword}"(${kw.region}) → ${saved}건 저장`);
                } catch (err) {
                    stats.failed++;
                    logger.error(`[RestaurantCrawlerScheduler] "${kw.keyword}" 크롤링 실패: ${err.message}`);
                }
            }

            logger.info(`[RestaurantCrawlerScheduler] 수집 완료 - 키워드: ${stats.keywordsGenerated}개, 저장: ${stats.totalSaved}건, 실패: ${stats.failed}건`);
        } catch (err) {
            logger.error(`[RestaurantCrawlerScheduler] 오류: ${err.message}`);
        }

        // 6) 메뉴·이미지·URL 이 빈 식당 보강. 위 수집이 실패해도 보강은 따로 돈다
        try {
            logger.info('[RestaurantCrawlerScheduler] 6) 빈 필드 보강');
            stats.enrich = await this.restaurantEnrichService.enrichMissing();
        } catch (err) {
            logger.error(`[RestaurantCrawlerScheduler] 보강 오류: ${err.message}`);
        } finally {
            this.lastStats = stats;
            logger.info('[RestaurantCrawlerScheduler] ========== 주간 작업 종료 ==========');
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
