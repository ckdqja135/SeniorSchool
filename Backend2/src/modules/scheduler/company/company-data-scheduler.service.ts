// Backend/scheduler/companyDataScheduler.js 의 1:1 포팅.
// 회사 정보 자동 업데이트 스케줄러 — 매일 자정(0 0 * * *)에 모든 회사의 OpenDart 정보를 업데이트.
// node-cron → @nestjs/schedule 의 @Cron 으로 대체 (원본 .start()의 cron 표현식 그대로 유지).
//
// BigInt 컬럼 주의: 구 스택 Sequelize 는 BIGINT 컬럼에 number 를 그대로 저장했으나, Prisma 는
// BigInt 필드에 number 를 허용하지 않는다 → 저장값 동일성을 위해 number 를 BigInt 로 변환한다.
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';
import { ExternalApiService } from './external-api.service';

// number|null → bigint|null (Prisma BigInt 컬럼 저장용; 값 동일성 유지)
function toBigIntOrNull(v: any): bigint | null {
    if (v === null || v === undefined) return null;
    return BigInt(Math.trunc(Number(v)));
}

@Injectable()
export class CompanyDataSchedulerService {
    private isRunning = false;
    private lastRunTime: Date | null = null;
    private stats: any = {
        totalCompanies: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
    };

    constructor(
        private readonly externalApiService: ExternalApiService,
        private readonly prisma: PrismaService,
    ) {}

    /**
     * 스케줄러 등록 (원본: cron.schedule('0 0 * * *', () => this.runUpdate()))
     * @nestjs/schedule 이 모듈 로드시 자동 등록한다 (.start() 호출 불필요).
     */
    @Cron('0 0 * * *')
    async handleCron(): Promise<void> {
        await this.runUpdate();
    }

    /**
     * 즉시 업데이트 실행 (테스트용) — admin 컨트롤러가 호출
     */
    async runUpdateNow(): Promise<void> {
        logger.info('[CompanyDataScheduler] Manual update triggered');
        await this.runUpdate();
    }

    /**
     * 회사 정보 업데이트 실행
     */
    async runUpdate(): Promise<void> {
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
            errors: [],
        };

        logger.info('[CompanyDataScheduler] ========================================');
        logger.info('[CompanyDataScheduler] Starting company data update');
        logger.info('[CompanyDataScheduler] ========================================');

        try {
            // 1. 모든 회사 조회 (status = 1, 활성 상태만)
            const companies: any[] = await this.prisma.compInfo.findMany({
                where: {
                    compStatus: 1,
                },
                select: { compIdx: true, compName: true, compCorpCode: true, compDataUpdatedAt: true },
                orderBy: { compIdx: 'asc' },
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
                    const openDartData = await this.externalApiService.getCompanyDataFromOpenDart(
                        company.compName,
                        null,
                        currentYear,
                        company.compCorpCode || null,
                    );

                    if (!openDartData) {
                        logger.warn(`${progress} No data found for: ${company.compName}`);
                        this.stats.skippedCount++;
                        continue;
                    }

                    // 3. DB 업데이트
                    const updateData: any = {
                        // 기본 정보
                        compCEO: openDartData.ceoName || company.compCEO,
                        compURL: openDartData.homepage || company.compURL,
                        compAddr: openDartData.address || company.compAddr,

                        // 직원 정보
                        compEmployeeCount: openDartData.employeeCount || company.compEmployeeCount,
                        totalEmployees: openDartData.employeeCount || company.totalEmployees,
                        compAvgSalary: toBigIntOrNull(openDartData.avgSalary),
                        compAvgTenure: openDartData.avgTenure,
                        newHires: openDartData.estimatedNewHires,
                        resignations: openDartData.estimatedResignations,

                        // 재무 정보
                        compSales: toBigIntOrNull(openDartData.revenue),
                        compCapital: toBigIntOrNull(openDartData.equity),
                        compOperatingProfit: toBigIntOrNull(openDartData.operatingProfit),
                        compNetIncome: toBigIntOrNull(openDartData.profit),
                        compTotalAssets: toBigIntOrNull(openDartData.assets),
                        compTotalLiabilities: toBigIntOrNull(openDartData.liabilities),
                        compTotalEquity: toBigIntOrNull(openDartData.equity),

                        // 메타 정보
                        compCorpCode: openDartData.corpCode,
                        compDataUpdatedAt: new Date(),
                    };

                    // 원본 { silent: true } (updatedAt 미변경). Prisma CompInfo.updatedAt 은 @updatedAt 이 아니라
                    // 갱신되지 않으므로 별도 처리 불필요.
                    await this.prisma.compInfo.update({
                        where: { compIdx: company.compIdx },
                        data: updateData,
                    });

                    this.stats.successCount++;
                    logger.info(`${progress} 업데이트 성공: ${company.compName}`);
                    logger.info(`${progress}    - 직원 수: ${openDartData.employeeCount?.toLocaleString() || 'N/A'}명`);
                    logger.info(`${progress}    - 평균 연봉: ${openDartData.avgSalary?.toLocaleString() || 'N/A'}원`);
                    logger.info(`${progress}    - 평균 근속: ${openDartData.avgTenure || 'N/A'}년`);
                    logger.info(`${progress}    - 신규입사(추정): ${openDartData.estimatedNewHires ?? 'N/A'}명 / 퇴사(추정): ${openDartData.estimatedResignations ?? 'N/A'}명`);
                    logger.info(`${progress}    - 매출액: ${openDartData.revenue?.toLocaleString() || 'N/A'}원`);

                    // API Rate Limiting 방지를 위한 딜레이 (2초)
                    await this.sleep(2000);
                } catch (error: any) {
                    this.stats.failedCount++;
                    this.stats.errors.push({
                        compIdx: company.compIdx,
                        compName: company.compName,
                        error: error.message,
                    });
                    logger.error(`${progress} 업데이트 실패: ${company.compName}: ${error.message}`);
                }
            }

            // 4. 결과 요약
            this.stats.endTime = new Date();
            this.stats.duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);

            this.printSummary();
        } catch (error: any) {
            logger.error(`[CompanyDataScheduler] Critical error: ${error.message}`);
            logger.error(error.stack);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 결과 요약 출력
     */
    printSummary(): void {
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
            this.stats.errors.forEach((err: any, idx: number) => {
                logger.error(`[CompanyDataScheduler] ${idx + 1}. ${err.compName} (${err.compIdx}): ${err.error}`);
            });
        }

        logger.info('[CompanyDataScheduler] ========================================');
    }

    /**
     * Sleep 함수
     */
    sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 스케줄러 상태 조회
     */
    getStatus(): any {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            stats: this.stats,
        };
    }
}
