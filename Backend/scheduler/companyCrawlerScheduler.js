/**
 * 회사 크롤러 주간 스케줄러
 * 매주 월요일 새벽 4시에 자동 크롤링 실행 (식당 크롤러 03:00 와 겹치지 않게 1시간 뒤)
 * OpenDart 기반 companyDataScheduler(자정)와 별개로 네이버/카카오 소스로 비상장사 보강
 */

const cron = require('node-cron');
const { crawlCompanies } = require('../service/companyCrawlerService');
const logger = require('../utils/logger');

// 주간 크롤링 대상 지역×키워드 조합 (최소 세트)
const WEEKLY_TARGETS = [
    { region: '서울', query: '스타트업' },
    { region: '서울', query: 'IT 기업' },
    { region: '경기', query: '판교 IT' },
    { region: '부산', query: '중소기업' },
    { region: '대전', query: '연구소' },
];

class CompanyCrawlerScheduler {
    constructor() {
        this.isRunning = false;
        this.lastRunTime = null;
        this.lastStats = null;
    }

    start() {
        // 매주 월요일 04:00
        cron.schedule('0 4 * * 1', async () => {
            await this.run();
        });

        logger.info('[CompanyCrawlerScheduler] 스케줄러 시작 (매주 월요일 04:00)');
    }

    async runNow() {
        logger.info('[CompanyCrawlerScheduler] 수동 실행');
        await this.run();
    }

    async run() {
        if (this.isRunning) {
            logger.warn('[CompanyCrawlerScheduler] 이미 실행 중, 스킵');
            return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();
        const stats = { targetsProcessed: 0, totalSaved: 0, failed: 0 };

        logger.info('[CompanyCrawlerScheduler] ========== 주간 크롤링 시작 ==========');

        try {
            for (const target of WEEKLY_TARGETS) {
                try {
                    const result = await crawlCompanies({
                        sources: ['kakao', 'naver'],
                        query: target.query,
                        region: target.region,
                        countPerSource: 20,
                        saveToDB: true,
                    });

                    const saved = result.stats?.saved || 0;
                    stats.totalSaved += saved;
                    stats.targetsProcessed++;

                    logger.info(`[CompanyCrawlerScheduler] "${target.query}"(${target.region}) → ${saved}건 저장`);
                } catch (err) {
                    stats.failed++;
                    logger.error(`[CompanyCrawlerScheduler] "${target.query}" 크롤링 실패: ${err.message}`);
                }
            }

            this.lastStats = stats;
            logger.info(`[CompanyCrawlerScheduler] ========== 완료 - 타겟: ${stats.targetsProcessed}건, 저장: ${stats.totalSaved}건, 실패: ${stats.failed}건 ==========`);
        } catch (err) {
            logger.error(`[CompanyCrawlerScheduler] 오류: ${err.message}`);
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

const scheduler = new CompanyCrawlerScheduler();
module.exports = scheduler;
