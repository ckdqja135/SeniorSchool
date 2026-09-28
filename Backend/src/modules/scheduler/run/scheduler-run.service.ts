/**
 * 스케줄러 수동 실행 + 실행 기록.
 *
 * 그동안 크론이 언제 돌았는지, 지금 돌고 있는지 확인할 방법이 없었다. 이 서비스가
 *  1) 잡 목록을 한 곳에 모으고
 *  2) 수동 실행을 큐에 넣어 하나씩 돌리고
 *  3) 수동이든 정기(크론)든 tb_scheduler_run 에 기록을 남긴다.
 *
 * 크론 등록을 각 잡 서비스에서 이리로 옮겼다. 그래야 정기 실행도 같은 경로(=기록 남김)를 탄다.
 * 각 잡 서비스는 run() 만 들고 있고 @Cron 은 갖지 않는다.
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';
import { RestaurantCrawlerSchedulerService } from '../restaurant/restaurant-crawler-scheduler.service';
import { CompanyCrawlerSchedulerService } from '../company/company-crawler-scheduler.service';
import { CompanyDataSchedulerService } from '../company/company-data-scheduler.service';

export type Trigger = 'manual' | 'cron';

export interface SchedulerJob {
    key: string;
    label: string;
    description: string;
    /** 화면 카드의 분류 배지 */
    group: string;
    /** 표시용 크론 표현식 */
    cron: string;
    /** 대상 기간을 받는 잡인지 */
    supportsPeriod: boolean;
    run: (ctx: { periodFrom?: string; periodTo?: string }) => Promise<string>;
}

interface QueueItem {
    id: string;
    jobKey: string;
    jobLabel: string;
    periodFrom?: string;
    periodTo?: string;
    trigger: Trigger;
    status: 'waiting' | 'running';
    startedAt?: number;
    runIdx?: bigint;
}

/** 'YYYY-MM-DD' → 연도. OpenDart 잡은 연도 단위라 시작일의 연도만 쓴다 */
function yearOf(v?: string): number | undefined {
    if (!v) return undefined;
    const y = Number(String(v).slice(0, 4));
    return Number.isFinite(y) && y > 1900 ? y : undefined;
}

@Injectable()
export class SchedulerRunService {
    private readonly queue: QueueItem[] = [];
    private pumping = false;
    private seq = 0;

    readonly jobs: SchedulerJob[];

    constructor(
        private readonly prisma: PrismaService,
        private readonly restaurantCrawl: RestaurantCrawlerSchedulerService,
        private readonly companyCrawl: CompanyCrawlerSchedulerService,
        private readonly companyData: CompanyDataSchedulerService,
    ) {
        this.jobs = [
            {
                key: 'restaurant-crawl',
                label: '식당 주간 수집',
                description: 'AI 키워드로 식당을 수집하고, 빈 메뉴·이미지·URL 을 이어서 보강합니다.',
                group: '맛잘알 오빠',
                cron: '0 3 * * 1',
                supportsPeriod: false,
                run: async () => {
                    await this.restaurantCrawl.run();
                    const s = this.restaurantCrawl.getStatus()?.lastStats;
                    return s ? `키워드 ${s.keywordsGenerated ?? 0}개 · 저장 ${s.totalSaved ?? 0}건 · 실패 ${s.failed ?? 0}건` : '완료';
                },
            },
            {
                key: 'company-crawl',
                label: '회사 주간 수집',
                description: '지역×키워드 조합으로 네이버·카카오에서 회사를 수집합니다.',
                group: '회사 오빠',
                cron: '0 4 * * 1',
                supportsPeriod: false,
                run: async () => {
                    await this.companyCrawl.run();
                    const s = this.companyCrawl.getStatus()?.lastStats;
                    return s ? `대상 ${s.targetsProcessed ?? 0}개 · 저장 ${s.totalSaved ?? 0}건 · 실패 ${s.failed ?? 0}건` : '완료';
                },
            },
            {
                key: 'company-data',
                label: '회사 정보 갱신 (OpenDart)',
                description: '등록된 회사의 대표·주소·직원수·재무 정보를 OpenDart 에서 갱신합니다.',
                group: '회사 오빠',
                cron: '0 0 * * *',
                // 연도 단위. 대상 기간을 비우면 전년도 기준 (기존 동작)
                supportsPeriod: true,
                run: async (ctx) => {
                    await this.companyData.runUpdate(yearOf(ctx.periodFrom));
                    const s = this.companyData.getStatus()?.stats;
                    return s ? `성공 ${s.successCount ?? 0}건 · 실패 ${s.failedCount ?? 0}건 · 건너뜀 ${s.skippedCount ?? 0}건` : '완료';
                },
            },
        ];
    }

    // ─── 크론 (정기 실행도 같은 큐·기록을 탄다) ──────────────────
    @Cron('0 3 * * 1')
    cronRestaurantCrawl(): void {
        this.enqueue(['restaurant-crawl'], {}, 'cron');
    }

    @Cron('0 4 * * 1')
    cronCompanyCrawl(): void {
        this.enqueue(['company-crawl'], {}, 'cron');
    }

    @Cron('0 0 * * *')
    cronCompanyData(): void {
        this.enqueue(['company-data'], {}, 'cron');
    }

    // ─── 큐 ────────────────────────────────────────────────────

    /** 고른 잡들을 큐에 넣는다. 이미 큐에 있는 잡은 중복으로 넣지 않는다 */
    enqueue(keys: string[], period: { periodFrom?: string; periodTo?: string }, trigger: Trigger): QueueItem[] {
        const added: QueueItem[] = [];
        for (const key of keys) {
            const job = this.jobs.find((j) => j.key === key);
            if (!job) continue;
            if (this.queue.some((q) => q.jobKey === key)) {
                logger.warn(`[SchedulerRun] ${key} 는 이미 대기/실행 중이라 건너뜀`);
                continue;
            }
            const item: QueueItem = {
                id: `q_${Date.now()}_${++this.seq}`,
                jobKey: job.key,
                jobLabel: job.label,
                periodFrom: job.supportsPeriod ? period.periodFrom : undefined,
                periodTo: job.supportsPeriod ? period.periodTo : undefined,
                trigger,
                status: 'waiting',
            };
            this.queue.push(item);
            added.push(item);
        }
        void this.pump();
        return added;
    }

    /** 대기 중인 항목만 뺀다. 실행 중인 건 중간에 끊으면 데이터가 어중간해져 취소하지 않는다 */
    cancel(id: string): { ok: boolean; message: string } {
        const i = this.queue.findIndex((q) => q.id === id);
        if (i < 0) return { ok: false, message: '이미 끝났거나 없는 항목입니다.' };
        if (this.queue[i].status === 'running') return { ok: false, message: '실행 중인 작업은 취소할 수 없습니다.' };
        const [removed] = this.queue.splice(i, 1);
        logger.info(`[SchedulerRun] 대기 취소 - ${removed.jobKey}`);
        return { ok: true, message: `${removed.jobLabel} 을(를) 대기에서 뺐습니다.` };
    }

    /** 한 번에 하나씩 순서대로 실행 */
    private async pump(): Promise<void> {
        if (this.pumping) return;
        this.pumping = true;
        try {
            for (;;) {
                const item = this.queue.find((q) => q.status === 'waiting');
                if (!item) break;
                item.status = 'running';
                item.startedAt = Date.now();
                await this.runOne(item);
                // 끝난 항목은 큐에서 뺀다 (기록은 DB 에 남는다)
                const i = this.queue.indexOf(item);
                if (i >= 0) this.queue.splice(i, 1);
            }
        } finally {
            this.pumping = false;
        }
    }

    private async runOne(item: QueueItem): Promise<void> {
        const job = this.jobs.find((j) => j.key === item.jobKey);
        if (!job) return;

        const row = await this.prisma.schedulerRun.create({
            data: {
                jobKey: job.key,
                jobLabel: job.label,
                trigger: item.trigger,
                status: 'running',
                periodFrom: item.periodFrom || null,
                periodTo: item.periodTo || null,
            },
        });
        item.runIdx = row.runIdx;

        const t0 = Date.now();
        try {
            const message = await job.run({ periodFrom: item.periodFrom, periodTo: item.periodTo });
            await this.prisma.schedulerRun.update({
                where: { runIdx: row.runIdx },
                data: {
                    status: 'success',
                    finishedAt: new Date(),
                    durationMs: Date.now() - t0,
                    resultMessage: (message || '완료').slice(0, 255),
                },
            });
            logger.info(`[SchedulerRun] ${job.key} 완료 - ${message}`);
        } catch (err: any) {
            await this.prisma.schedulerRun.update({
                where: { runIdx: row.runIdx },
                data: {
                    status: 'failed',
                    finishedAt: new Date(),
                    durationMs: Date.now() - t0,
                    error: String(err?.message || err).slice(0, 2000),
                },
            });
            logger.error(`[SchedulerRun] ${job.key} 실패 - ${err?.message}`);
        }
    }

    // ─── 조회 ──────────────────────────────────────────────────

    /** 잡 목록 + 각 잡의 마지막 실행 */
    async listJobs(): Promise<any[]> {
        const last = await this.prisma.$queryRawUnsafe<any[]>(
            `SELECT r.jobKey, r.status, r.startedAt, r.finishedAt, r.durationMs, r.resultMessage
               FROM tb_scheduler_run r
               JOIN (SELECT jobKey, MAX(runIdx) AS mx FROM tb_scheduler_run GROUP BY jobKey) m
                 ON r.runIdx = m.mx`,
        ).catch(() => [] as any[]);
        const byKey = new Map(last.map((r) => [r.jobKey, r]));

        return this.jobs.map((j) => ({
            key: j.key,
            label: j.label,
            description: j.description,
            group: j.group,
            cron: j.cron,
            supportsPeriod: j.supportsPeriod,
            lastRun: byKey.get(j.key) ?? null,
        }));
    }

    /** 진행 상황 — 화면의 '진행 상황' 패널용 */
    async getProgress(): Promise<any> {
        // 진행 바는 지난 성공 실행의 소요 시간을 기준으로 그린다 (잡 자체는 진행률을 모른다)
        const runningKey = this.queue.find((q) => q.status === 'running')?.jobKey;
        let expectedMs: number | null = null;
        if (runningKey) {
            const prev = await this.prisma.schedulerRun.findFirst({
                where: { jobKey: runningKey, status: 'success', durationMs: { not: null } },
                orderBy: { runIdx: 'desc' },
                select: { durationMs: true },
            }).catch(() => null);
            expectedMs = prev?.durationMs ?? null;
        }

        return {
            items: this.queue.map((q) => ({
                id: q.id,
                jobKey: q.jobKey,
                jobLabel: q.jobLabel,
                status: q.status,
                trigger: q.trigger,
                startedAt: q.startedAt ?? null,
                elapsedMs: q.startedAt ? Date.now() - q.startedAt : null,
                canCancel: q.status === 'waiting',
            })),
            runningCount: this.queue.filter((q) => q.status === 'running').length,
            waitingCount: this.queue.filter((q) => q.status === 'waiting').length,
            expectedMs,
        };
    }

    /** 실행 현황 표 + 집계 */
    async listRuns(limit = 100, offset = 0): Promise<any> {
        const [rows, total, running, success, failed] = await Promise.all([
            this.prisma.schedulerRun.findMany({ orderBy: { runIdx: 'desc' }, take: limit, skip: offset }),
            this.prisma.schedulerRun.count(),
            this.prisma.schedulerRun.count({ where: { status: 'running' } }),
            this.prisma.schedulerRun.count({ where: { status: 'success' } }),
            this.prisma.schedulerRun.count({ where: { status: 'failed' } }),
        ]);
        return {
            rows: rows.map((r) => ({ ...r, runIdx: Number(r.runIdx) })),
            counts: { total, running, success, failed },
        };
    }
}
