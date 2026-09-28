// 어드민 트리거 라우트 포팅.
//  1) Backend/routes/admin/companyDataScheduler.router.js (+ 인라인 컨트롤러)
//     → mount: routes/admin/index.js 가 /scheduler 로 mount → @Controller('admin/scheduler').
//     → 원본 라우트는 무가드였으나, 어드민 API 이므로 JwtAuthGuard + AdminGuard 를 건다.
//  2) Backend/routes/admin/companyCrawler.router.js (+ controller/admin/companyCrawlerController.js)
//     → mount: routes/admin/index.js 가 /company-crawler 로 mount → @Controller('admin/company-crawler').
//     → 모든 라우트 authenticateToken + isAdmin → 클래스 레벨 @UseGuards(JwtAuthGuard, AdminGuard).
//
// @Req()/@Res() passthrough 로 원본 상태코드/JSON 형태/한글 메시지/에러 스타일을 그대로 재현한다.
import { Controller, Get, Post, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { MenuAccessGuard } from '../../../common/guards/menu-access.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';
import { CompanyDataSchedulerService } from './company-data-scheduler.service';
import { CompanyCrawlerService } from './company-crawler.service';

// ─────────────────────────────────────────────────────────────
// 회사 데이터 스케줄러 관리 API (/admin/scheduler) — authenticateToken + isAdmin
// ─────────────────────────────────────────────────────────────
@Controller('admin/scheduler')
@UseGuards(JwtAuthGuard, AdminGuard, MenuAccessGuard)
export class CompanyDataSchedulerController {
    constructor(private readonly scheduler: CompanyDataSchedulerService) {}

    /**
     * GET /admin/scheduler/status — 스케줄러 상태 조회
     */
    @Get('status')
    getStatus(@Req() req: Request, @Res() res: Response) {
        try {
            const status = this.scheduler.getStatus();
            return res.json({
                success: true,
                data: status,
            });
        } catch (error: any) {
            logger.error(`[Scheduler API] Status error: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: '스케줄러 상태 조회 실패',
                error: error.message,
            });
        }
    }

    /**
     * POST /admin/scheduler/run-now — 즉시 업데이트 실행
     */
    @Post('run-now')
    async runNow(@Req() req: Request, @Res() res: Response) {
        try {
            const status = this.scheduler.getStatus();

            if (status.isRunning) {
                return res.status(400).json({
                    success: false,
                    message: '이미 업데이트가 진행 중입니다.',
                });
            }

            // 비동기로 실행 (응답은 즉시 반환)
            this.scheduler.runUpdateNow().catch((error: any) => {
                logger.error(`[Scheduler API] Run-now error: ${error.message}`);
            });

            return res.json({
                success: true,
                message: '회사 데이터 업데이트가 시작되었습니다. 로그를 확인하세요.',
            });
        } catch (error: any) {
            logger.error(`[Scheduler API] Run-now error: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: '업데이트 실행 실패',
                error: error.message,
            });
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 회사 크롤러 어드민 API (/admin/company-crawler) — authenticateToken + isAdmin
// ─────────────────────────────────────────────────────────────
@Controller('admin/company-crawler')
@UseGuards(JwtAuthGuard, AdminGuard, MenuAccessGuard)
export class CompanyCrawlerController {
    constructor(
        private readonly crawlerService: CompanyCrawlerService,
        private readonly prisma: PrismaService,
    ) {}

    // DB 현황 조회
    @Get('stats')
    async getStats(@Req() req: Request, @Res() res: Response) {
        try {
            const totalCompanies = await this.prisma.compInfo.count({ where: { compStatus: 1 } });

            const withURL = await this.prisma.compInfo.count({
                where: {
                    compStatus: 1,
                    AND: [{ compURL: { not: null } }, { compURL: { not: '' } }],
                },
            });

            // compCEO·compIndustry 는 NOT NULL 이라 not: null 로 비교하면 Prisma 가 던진다
            // (이 때문에 stats 가 계속 500 이었다). 빈 문자열과 플레이스홀더만 걸러낸다.
            const withCEO = await this.prisma.compInfo.count({
                where: {
                    compStatus: 1,
                    AND: [{ compCEO: { not: '' } }, { compCEO: { not: '미정' } }],
                },
            });

            const withIndustry = await this.prisma.compInfo.count({
                where: {
                    compStatus: 1,
                    AND: [{ compIndustry: { not: '' } }, { compIndustry: { not: '기타' } }],
                },
            });

            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentAdded = await this.prisma.compInfo.count({
                where: {
                    compStatus: 1,
                    createdAt: { gte: sevenDaysAgo },
                },
            });

            return res.status(200).json({
                totalCompanies,
                withURL,
                withCEO,
                withIndustry,
                recentAdded,
            });
        } catch (error: any) {
            logger.error(`[CompCrawlerController:getStats] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 크롤링 가능한 소스 목록 조회
    @Get('sources')
    getSources(@Req() req: Request, @Res() res: Response) {
        try {
            const sources = this.crawlerService.getAvailableSources();
            return res.status(200).json(sources);
        } catch (error: any) {
            logger.error(`[CompCrawlerController:getSources] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 비어있는 필드 컬럼별 통계
    @Get('missing-stats')
    async getMissingStats(@Req() req: Request, @Res() res: Response) {
        try {
            const total = await this.prisma.compInfo.count({ where: { compStatus: 1 } });

            // compURL 만 nullable 이다. 나머지는 NOT NULL 이라 null 로 비교하면 Prisma 가 던진다
            // (이 때문에 missing-stats 가 계속 500 이었다 — 식당 쪽과 같은 문제).
            const fields: any[] = [
                { key: 'compURL', label: '홈페이지', condition: { OR: [{ compURL: null }, { compURL: '' }] } },
                { key: 'compCEO', label: '대표이사', condition: { OR: [{ compCEO: '' }, { compCEO: '미정' }] } },
                { key: 'compIndustry', label: '업종', condition: { OR: [{ compIndustry: '' }, { compIndustry: '기타' }] } },
                { key: 'compAddr', label: '도로명주소', condition: { compAddr: '' } },
            ];

            const stats: any[] = [];
            for (const f of fields) {
                const missing = await this.prisma.compInfo.count({
                    where: { compStatus: 1, ...f.condition },
                });
                stats.push({ key: f.key, label: f.label, total, missing, filled: total - missing });
            }

            return res.status(200).json(stats);
        } catch (error: any) {
            logger.error(`[CompCrawlerController:getMissingStats] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // 비어있는 필드 보강 크롤링 — 네이버 기반
    @Post('enrich')
    async enrichMissing(@Req() req: Request, @Res() res: Response) {
        req.setTimeout(600000);
        res.setTimeout(600000);

        try {
            const { field, limit: reqLimit } = req.body;
            const validFields = ['compURL', 'compAddr', 'compIndustry'];
            if (!validFields.includes(field)) {
                return res.status(400).json({ success: false, message: `보강 가능 필드: ${validFields.join(', ')}` });
            }

            const batchLimit = Math.min(reqLimit ? parseInt(reqLimit) : 10, 50);

            const missingCondition: any = field === 'compIndustry'
                ? { OR: [{ compIndustry: null }, { compIndustry: '' }, { compIndustry: '기타' }] }
                : { OR: [{ [field]: null }, { [field]: '' }] };

            const companies: any[] = await this.prisma.compInfo.findMany({
                where: { compStatus: 1, ...missingCondition },
                select: { compIdx: true, compName: true, compAddr: true },
                take: batchLimit,
                orderBy: { compViewCount: 'desc' },
            });

            if (companies.length === 0) {
                return res.status(200).json({ success: true, message: '보강할 회사가 없습니다.', updated: 0 });
            }

            let updated = 0;
            const results: any[] = [];

            for (const c of companies) {
                try {
                    const enriched = await this.crawlerService.enrichFromNaver(c.compName);

                    if (!enriched) {
                        results.push({ name: c.compName, status: 'not_found' });
                        continue;
                    }

                    const updates: any = {};
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
                        await this.prisma.compInfo.updateMany({ where: { compIdx: c.compIdx }, data: updates });
                        updated++;
                        results.push({ name: c.compName, status: 'updated', matched: enriched.matchedName });
                    } else {
                        results.push({ name: c.compName, status: 'no_data', matched: enriched.matchedName });
                    }
                } catch (err: any) {
                    results.push({ name: c.compName, status: 'error', error: err.message });
                }
            }

            return res.status(200).json({
                success: true,
                message: `${companies.length}개 중 ${updated}개 보강 완료`,
                total: companies.length,
                updated,
                results,
            });
        } catch (error: any) {
            logger.error(`[CompCrawlerController:enrichMissing] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // 비어있는 필드 보강 크롤링 — 실시간 스트리밍 (NDJSON)
    @Post('enrich/stream')
    async enrichMissingStream(@Req() req: Request, @Res() res: Response) {
        req.setTimeout(600000);
        res.setTimeout(600000);

        const { field, limit: reqLimit } = req.body;
        const validFields = ['compURL', 'compAddr', 'compIndustry'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, message: `보강 가능 필드: ${validFields.join(', ')}` });
        }

        const batchLimit = Math.min(reqLimit ? parseInt(reqLimit) : 10, 50);

        const missingCondition: any = field === 'compIndustry'
            ? { OR: [{ compIndustry: null }, { compIndustry: '' }, { compIndustry: '기타' }] }
            : { OR: [{ [field]: null }, { [field]: '' }] };

        let companies: any[];
        try {
            companies = await this.prisma.compInfo.findMany({
                where: { compStatus: 1, ...missingCondition },
                select: { compIdx: true, compName: true, compAddr: true },
                take: batchLimit,
                orderBy: { compViewCount: 'desc' },
            });
        } catch (error: any) {
            logger.error(`[CompCrawlerController:enrichMissingStream] findAll: ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }

        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();

        const writeLine = (obj: any) => {
            res.write(JSON.stringify(obj) + '\n');
            if (typeof (res as any).flush === 'function') (res as any).flush();
        };

        writeLine({ type: 'start', total: companies.length, field });

        if (companies.length === 0) {
            writeLine({ type: 'done', success: true, message: '보강할 회사가 없습니다.', total: 0, updated: 0, results: [] });
            return res.end();
        }

        let updated = 0;
        const results: any[] = [];

        for (let i = 0; i < companies.length; i++) {
            const c = companies[i];
            const startedAt = Date.now();
            let entry: any;
            try {
                const enriched = await this.crawlerService.enrichFromNaver(c.compName);

                if (!enriched) {
                    entry = { name: c.compName, status: 'not_found' };
                } else {
                    const updates: any = {};
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
                        await this.prisma.compInfo.updateMany({ where: { compIdx: c.compIdx }, data: updates });
                        updated++;
                        entry = { name: c.compName, status: 'updated', matched: enriched.matchedName };
                    } else {
                        entry = { name: c.compName, status: 'no_data', matched: enriched.matchedName };
                    }
                }
            } catch (err: any) {
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
    }

    // 통합 크롤링 실행
    @Post('run')
    async runCrawl(@Req() req: Request, @Res() res: Response) {
        try {
            const {
                sources,
                query,
                region,
                lat, lng, radius,
                countPerSource,
                dryRun,
                runId,
            } = req.body;

            logger.info(`[CompCrawlerController:runCrawl] 요청 - sources: ${sources}, region: ${region}, dryRun: ${dryRun}`);

            const result = await this.crawlerService.crawlCompanies({
                sources,
                query,
                region,
                lat: lat ? parseFloat(lat) : undefined,
                lng: lng ? parseFloat(lng) : undefined,
                radius: radius ? parseInt(radius) : undefined,
                countPerSource: countPerSource ? parseInt(countPerSource) : undefined,
                saveToDB: !dryRun,
                dryRun: !!dryRun,
                runId,
            });

            return res.status(200).json({
                success: true,
                message: dryRun
                    ? `미리보기 완료: ${result.stats.totalFetched}건 수집`
                    : `크롤링 완료: ${result.stats.saved}건 저장, ${result.stats.duplicateSkipped}건 중복 스킵`,
                ...result,
            });
        } catch (error: any) {
            logger.error(`[CompCrawlerController:runCrawl] ${error.message}`);
            return res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
        }
    }

    // 크롤링 진행 상황 조회 (폴링).
    // run 요청이 블로킹으로 떠 있는 동안 같은 runId 로 물어보면 단계별 상황을 돌려준다.
    @Get('progress/:runId')
    async getProgress(@Req() req: Request, @Res() res: Response) {
        try {
            const runId = (req.params as any).runId;
            const progress = this.crawlerService.getProgress(runId);
            if (!progress) {
                // 아직 시작 전이거나 이미 정리된 경우
                return res.status(200).json({ success: true, found: false });
            }
            return res.status(200).json({ success: true, found: true, ...progress });
        } catch (error: any) {
            logger.error(`[CompCrawlerController:getProgress] ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }

    // 미리보기에서 고른 행만 저장.
    // 기존 run(dryRun=false) 은 크롤링을 다시 돌려서 검토한 목록과 저장분이 달라질 수 있었다.
    @Post('save')
    async saveSelected(@Req() req: Request, @Res() res: Response) {
        try {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: '저장할 항목이 없습니다.' });
            }
            logger.info(`[CompCrawlerController:saveSelected] 요청 ${items.length}건`);
            const result = await this.crawlerService.saveSelected(items);
            const { saved, updated, skipped } = result.stats;
            return res.status(200).json({
                success: true,
                message: `${saved}건 저장 완료` +
                    (updated > 0 ? `, ${updated}건 갱신` : '') +
                    (skipped > 0 ? ` (좌표·이름·주소 누락 ${skipped}건 제외)` : ''),
                ...result,
            });
        } catch (error: any) {
            logger.error(`[CompCrawlerController:saveSelected] ${error.message}`);
            return res.status(500).json({ success: false, message: `저장 실패: ${error.message || 'Internal Server Error'}` });
        }
    }

    // 단일 소스 크롤링 (테스트용)
    // GET /admin/company-crawler/run/:source?query=회사&region=서울&count=10&dryRun=true
    @Get('run/:source')
    async runSingleSource(@Param('source') source: string, @Req() req: Request, @Res() res: Response) {
        try {
            const { query, region, count, dryRun } = req.query as any;

            const validSources = ['kakao', 'naver', 'publicData'];
            if (!validSources.includes(source)) {
                return res.status(400).json({ error: `유효하지 않은 소스: ${source}. 사용 가능: ${validSources.join(',')}` });
            }

            const result = await this.crawlerService.crawlCompanies({
                sources: [source],
                query: query || '회사',
                region: region || '서울',
                countPerSource: count ? parseInt(count) : 10,
                saveToDB: !dryRun,
                dryRun: dryRun === 'true',
            });

            const isDryRun = dryRun === 'true';
            return res.status(200).json({
                success: true,
                source,
                message: isDryRun
                    ? `미리보기 완료: ${result.stats.totalFetched}건 수집`
                    : `크롤링 완료: ${result.stats.saved || 0}건 저장, ${result.stats.duplicateSkipped || 0}건 중복 스킵`,
                ...result,
            });
        } catch (error: any) {
            logger.error(`[CompCrawlerController:runSingleSource] ${error.message}`);
            return res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
        }
    }
}
