/**
 * 회사 정보 자동 업데이트 스케줄러
 * 매일 새벽 2시에 모든 회사의 OpenDart 정보를 업데이트
 */

const cron = require('node-cron');
const externalApiService = require('../service/externalApiService');
const logger = require('../utils/logger');
const db = require('../model/index');

const CompanyInfo = db.CompInfo;

class CompanyDataScheduler {
    constructor() {
        this.isRunning = false;
        this.lastRunTime = null;
        this.stats = {
            totalCompanies: 0,
            successCount: 0,
            failedCount: 0,
            skippedCount: 0
        };
    }

    /**
     * 스케줄러 시작
     */
    start() {
        // 매일 자정에 실행 (0 0 * * *)
        const schedule = '0 0 * * *';
        
        logger.info(`[CompanyDataScheduler] Starting scheduler with cron: ${schedule}`);
        
        cron.schedule(schedule, async () => {
            await this.runUpdate();
        });

        logger.info('[CompanyDataScheduler] Scheduler started successfully');

        // 서버 시작 시 한 번 실행 (선택사항, 주석 처리 가능)
        // this.runUpdate();
    }

    /**
     * 즉시 업데이트 실행 (테스트용)
     */
    async runUpdateNow() {
        logger.info('[CompanyDataScheduler] Manual update triggered');
        await this.runUpdate();
    }

    /**
     * 회사 정보 업데이트 실행
     */
    async runUpdate() {
        if (this.isRunning) {
            logger.warn('[CompanyDataScheduler] Update already running, skipping...');
            return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();
        
        // 통계 초기화
        this.stats = {
            totalCompanies: 0,
            successCount: 0,
            failedCount: 0,
            skippedCount: 0,
            startTime: new Date(),
            errors: []
        };

        logger.info('[CompanyDataScheduler] ========================================');
        logger.info('[CompanyDataScheduler] Starting company data update');
        logger.info('[CompanyDataScheduler] ========================================');

        try {
            // 1. 모든 회사 조회 (status = 1, 활성 상태만)
            const companies = await CompanyInfo.findAll({
                where: {
                    compStatus: 1
                },
                attributes: ['compIdx', 'compName', 'compCorpCode', 'compDataUpdatedAt'],
                order: [['compIdx', 'ASC']]
            });

            this.stats.totalCompanies = companies.length;
            logger.info(`[CompanyDataScheduler] Found ${companies.length} active companies`);

            // 2. 각 회사별로 업데이트
            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                const progress = `[${i + 1}/${companies.length}]`;

                try {
                    logger.info(`${progress} Processing: ${company.compName} (compIdx: ${company.compIdx})`);

                    // OpenDart에서 데이터 조회 (DB에 corpCode가 있으면 바로 사용)
                    const currentYear = new Date().getFullYear() - 1; // 전년도 데이터
                    const openDartData = await externalApiService.getCompanyDataFromOpenDart(
                        company.compName,
                        null,
                        currentYear,
                        company.compCorpCode || null
                    );

                    if (!openDartData) {
                        logger.warn(`${progress} No data found for: ${company.compName}`);
                        this.stats.skippedCount++;
                        continue;
                    }

                    // 3. DB 업데이트
                    const updateData = {
                        // 기본 정보
                        compCEO: openDartData.ceoName || company.compCEO,
                        compURL: openDartData.homepage || company.compURL,
                        compAddr: openDartData.address || company.compAddr,
                        
                        // 직원 정보
                        compEmployeeCount: openDartData.employeeCount || company.compEmployeeCount,
                        totalEmployees: openDartData.employeeCount || company.totalEmployees,
                        compAvgSalary: openDartData.avgSalary,
                        compAvgTenure: openDartData.avgTenure,
                        
                        // 재무 정보
                        compSales: openDartData.revenue, // 매출액
                        compCapital: openDartData.equity, // 자본총계
                        compOperatingProfit: openDartData.operatingProfit, // 영업이익
                        compNetIncome: openDartData.profit, // 당기순이익
                        compTotalAssets: openDartData.assets, // 자산총계
                        compTotalLiabilities: openDartData.liabilities, // 부채총계
                        compTotalEquity: openDartData.equity, // 자본총계
                        
                        // 메타 정보
                        compCorpCode: openDartData.corpCode,
                        compDataUpdatedAt: new Date(),
                        updated_at: new Date()
                    };

                    await company.update(updateData);
                    
                    this.stats.successCount++;
                    logger.info(`${progress} 업데이트 성공: ${company.compName}`);
                    logger.info(`${progress}    - 직원 수: ${openDartData.employeeCount?.toLocaleString() || 'N/A'}명`);
                    logger.info(`${progress}    - 평균 연봉: ${openDartData.avgSalary?.toLocaleString() || 'N/A'}원`);
                    logger.info(`${progress}    - 매출액: ${openDartData.revenue?.toLocaleString() || 'N/A'}원`);

                    // API Rate Limiting 방지를 위한 딜레이 (2초)
                    await this.sleep(2000);

                } catch (error) {
                    this.stats.failedCount++;
                    this.stats.errors.push({
                        compIdx: company.compIdx,
                        compName: company.compName,
                        error: error.message
                    });
                    logger.error(`${progress} 업데이트 실패: ${company.compName}: ${error.message}`);
                }
            }

            // 4. 결과 요약
            this.stats.endTime = new Date();
            this.stats.duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
            
            this.printSummary();

        } catch (error) {
            logger.error(`[CompanyDataScheduler] Critical error: ${error.message}`);
            logger.error(error.stack);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 결과 요약 출력
     */
    printSummary() {
        logger.info('[CompanyDataScheduler] ========================================');
        logger.info('[CompanyDataScheduler] Update Summary');
        logger.info('[CompanyDataScheduler] ========================================');
        logger.info(`[CompanyDataScheduler] Total companies: ${this.stats.totalCompanies}`);
        logger.info(`[CompanyDataScheduler] 업데이트 성공: ${this.stats.successCount}`);
        logger.info(`[CompanyDataScheduler] 건너뛰기: ${this.stats.skippedCount}`);
        logger.info(`[CompanyDataScheduler] 업데이트 실패: ${this.stats.failedCount}`);
        logger.info(`[CompanyDataScheduler] 소요 시간: ${this.stats.duration} 초`);
        logger.info(`[CompanyDataScheduler] 성공률: ${Math.round((this.stats.successCount / this.stats.totalCompanies) * 100)}%`);
        
        if (this.stats.errors.length > 0) {
            logger.info('[CompanyDataScheduler] ========================================');
            logger.info('[CompanyDataScheduler] Failed companies:');
            this.stats.errors.forEach((err, idx) => {
                logger.error(`[CompanyDataScheduler] ${idx + 1}. ${err.compName} (${err.compIdx}): ${err.error}`);
            });
        }
        
        logger.info('[CompanyDataScheduler] ========================================');
    }

    /**
     * Sleep 함수
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 스케줄러 상태 조회
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            stats: this.stats
        };
    }
}

// 싱글톤 인스턴스
const scheduler = new CompanyDataScheduler();

module.exports = scheduler;

