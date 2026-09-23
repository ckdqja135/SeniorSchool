// Backend/scheduler/companyCrawlerScheduler.js 의 1:1 포팅.
// 회사 크롤러 주간 스케줄러 — 매주 월요일 새벽 4시(0 4 * * 1)에 자동 크롤링 실행.
// (식당 크롤러 03:00 와 겹치지 않게 1시간 뒤. OpenDart 기반 companyDataScheduler(자정)와 별개로
//  네이버/카카오 소스로 비상장사 보강.)
// node-cron → @nestjs/schedule 의 @Cron 으로 대체 (원본 .start()의 cron 표현식 그대로 유지).
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { logger } from '../../../logger/winston.logger';
import { CompanyCrawlerService } from './company-crawler.service';

// 주간 크롤링 대상 지역×키워드 조합 (최소 세트)
const WEEKLY_TARGETS = [
    { region: '서울', query: '스타트업' },
    { region: '서울', query: 'IT 기업' },
    { region: '경기', query: '판교 IT' },
    { region: '부산', query: '중소기업' },
    { region: '대전', query: '연구소' },
];

@Injectable()
export class CompanyCrawlerSchedulerService {
    private isRunning = false;
    private lastRunTime: Date | null = null;
    private lastStats: any = null;

    constructor(private readonly crawlerService: CompanyCrawlerService) {}

    /**
     * 스케줄러 등록 (원본: cron.schedule('0 4 * * 1', () => this.run()))
     * 매주 월요일 04:00. @nestjs/schedule 이 모듈 로드시 자동 등록한다.
     */
    @Cron('0 4 * * 1')
    async handleCron(): Promise<void> {
        await this.run();
    }

    async runNow(): Promise<void> {
        logger.info('[CompanyCrawlerScheduler] 수동 실행');
        await this.run();
    }

    async run(): Promise<void> {
        if (this.isRunning) {
            logger.warn('[CompanyCrawlerScheduler] 이미 실행 중, 스킵');
            return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();
        const stats: any = { targetsProcessed: 0, totalSaved: 0, failed: 0 };

        logger.info('[CompanyCrawlerScheduler] ========== 주간 크롤링 시작 ==========');

        try {
            for (const target of WEEKLY_TARGETS) {
                try {
                    const result = await this.crawlerService.crawlCompanies({
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
                } catch (err: any) {
                    stats.failed++;
                    logger.error(`[CompanyCrawlerScheduler] "${target.query}" 크롤링 실패: ${err.message}`);
                }
            }

            this.lastStats = stats;
            logger.info(`[CompanyCrawlerScheduler] ========== 완료 - 타겟: ${stats.targetsProcessed}건, 저장: ${stats.totalSaved}건, 실패: ${stats.failed}건 ==========`);
        } catch (err: any) {
            logger.error(`[CompanyCrawlerScheduler] 오류: ${err.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    getStatus(): any {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            lastStats: this.lastStats,
        };
    }
}
