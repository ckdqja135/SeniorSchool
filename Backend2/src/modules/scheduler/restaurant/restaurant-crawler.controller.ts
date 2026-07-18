/**
 * 어드민 크롤러 컨트롤러 (/admin/crawler).
 * Backend/routes/admin/crawler.router.js + Backend/controller/admin/crawlerController.js 포팅.
 *
 * 가드: 구 crawler.router.js 및 상위 마운트(routes/admin/index.js, routes/index.js '/admin')에
 *       authenticateToken/isAdmin 미들웨어가 전혀 없다 → 전 라우트 무가드(@Public/@UseGuards 불필요).
 *
 * 직렬화: 응답 값은 모두 숫자/문자열(카운트·통계·보강 결과)뿐이라 BigInt/DECIMAL 직렬화 이슈 없음.
 *         restaurantMenu 저장 시에는 구 Sequelize setter(JSON.stringify)를 재현한다.
 * @Req()/@Res() 패스스루로 각 메서드의 status/JSON/한글 메시지/에러 스타일을 원본 그대로 유지.
 */

import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';
import { RestaurantCrawlerService } from './restaurant-crawler.service';

@Controller('admin/crawler')
export class RestaurantCrawlerController {
    constructor(
        private readonly crawlerService: RestaurantCrawlerService,
        private readonly prisma: PrismaService,
    ) {}

    // 크롤링 가능한 소스 목록 조회
    @Get('sources')
    async getSources(@Res() res: Response) {
        try {
            const sources = this.crawlerService.getAvailableSources();
            return res.status(200).json(sources);
        } catch (error) {
            logger.error(`[CrawlerController:getSources] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 통합 크롤링 실행
    @Post('run')
    async runCrawl(@Req() req: Request, @Res() res: Response) {
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

            const result = await this.crawlerService.crawlRestaurants({
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

            return res.status(200).json({
                success: true,
                message: dryRun
                    ? `미리보기 완료: ${result.stats.totalFetched}건 수집`
                    : `크롤링 완료: ${result.stats.saved}건 저장, ${result.stats.duplicateSkipped}건 중복 스킵`,
                ...result,
            });
        } catch (error) {
            logger.error(`[CrawlerController:runCrawl] ${error.message}`);
            return res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
        }
    }

    // DB 현황 조회
    @Get('stats')
    async getStats(@Res() res: Response) {
        try {
            const totalRestaurants = await this.prisma.restaurantInfo.count({
                where: { restaurantStatus: 1 },
            });

            const withMenu = await this.prisma.restaurantInfo.count({
                where: {
                    restaurantStatus: 1,
                    restaurantMenu: { not: null },
                },
            });

            const withImage = await this.prisma.restaurantInfo.count({
                where: {
                    restaurantStatus: 1,
                    restaurantImage: { not: null },
                },
            });

            const withRating = await this.prisma.restaurantInfo.count({
                where: {
                    restaurantStatus: 1,
                    restaurantRating: { not: null },
                },
            });

            // 최근 7일 내 추가된 식당
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentAdded = await this.prisma.restaurantInfo.count({
                where: {
                    restaurantStatus: 1,
                    createdAt: { gte: sevenDaysAgo },
                },
            });

            return res.status(200).json({
                totalRestaurants,
                withMenu,
                withImage,
                withRating,
                recentAdded,
            });
        } catch (error) {
            logger.error(`[CrawlerController:getStats] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 비어있는 데이터 컬럼별 통계 조회
    @Get('missing-stats')
    async getMissingStats(@Res() res: Response) {
        try {
            const total = await this.prisma.restaurantInfo.count({ where: { restaurantStatus: 1 } });

            const fields = [
                { key: 'restaurantMenu', label: '메뉴' },
                { key: 'restaurantImage', label: '이미지' },
                { key: 'restaurantURL', label: 'URL' },
                { key: 'restaurantLotAddr', label: '지번주소' },
            ];

            const stats: any[] = [];
            for (const f of fields) {
                const missing = await this.prisma.restaurantInfo.count({
                    where: {
                        restaurantStatus: 1,
                        OR: [{ [f.key]: null }, { [f.key]: '' }],
                    } as any,
                });
                stats.push({ key: f.key, label: f.label, total, missing, filled: total - missing });
            }

            return res.status(200).json(stats);
        } catch (error) {
            logger.error(`[CrawlerController:getMissingStats] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // 비어있는 필드 보강 크롤링 (식신 기반)
    @Post('enrich')
    async enrichMissing(@Req() req: Request, @Res() res: Response) {
        // nginx 등 프록시 타임아웃 방지
        req.setTimeout(600000); // 10분
        res.setTimeout(600000);

        try {
            const { field, limit: reqLimit } = req.body;
            const validFields = ['restaurantMenu', 'restaurantImage'];
            if (!validFields.includes(field)) {
                return res.status(400).json({ success: false, message: `보강 가능 필드: ${validFields.join(', ')}` });
            }

            const batchLimit = Math.min(reqLimit ? parseInt(reqLimit) : 10, 50); // 최대 50

            // 해당 필드가 비어있는 식당 조회
            const restaurants = await this.prisma.restaurantInfo.findMany({
                where: {
                    restaurantStatus: 1,
                    OR: [{ [field]: null }, { [field]: '' }],
                } as any,
                select: { restaurantIdx: true, restaurantName: true, restaurantAddr: true },
                take: batchLimit,
                orderBy: { restaurantViewCount: 'desc' },
            });

            if (restaurants.length === 0) {
                return res.status(200).json({ success: true, message: '보강할 식당이 없습니다.', updated: 0 });
            }

            // 식신에서 식당 이름 검색 → 메뉴/이미지 보강
            let updated = 0;
            const results: any[] = [];

            for (const r of restaurants) {
                try {
                    const enriched = await this.crawlerService.enrichFromSiksin(r.restaurantName);

                    if (!enriched) {
                        results.push({ name: r.restaurantName, status: 'not_found' });
                        continue;
                    }

                    const updates: any = {};
                    if (field === 'restaurantMenu' && enriched.menu && enriched.menu.length > 0) {
                        // 구 Sequelize restaurantMenu setter 재현: 배열 → JSON.stringify
                        updates.restaurantMenu = JSON.stringify(enriched.menu);
                    }
                    if (field === 'restaurantImage' && enriched.image) {
                        updates.restaurantImage = enriched.image;
                    }

                    if (Object.keys(updates).length > 0) {
                        await this.prisma.restaurantInfo.updateMany({
                            where: { restaurantIdx: r.restaurantIdx },
                            data: updates,
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

            return res.status(200).json({
                success: true,
                message: `${restaurants.length}개 중 ${updated}개 보강 완료`,
                total: restaurants.length,
                updated,
                results,
            });
        } catch (error) {
            logger.error(`[CrawlerController:enrichMissing] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // 비어있는 필드 보강 크롤링 — 실시간 스트리밍(NDJSON)
    @Post('enrich/stream')
    async enrichMissingStream(@Req() req: Request, @Res() res: Response) {
        req.setTimeout(600000);
        res.setTimeout(600000);

        const { field, limit: reqLimit } = req.body;
        const validFields = ['restaurantMenu', 'restaurantImage'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ success: false, message: `보강 가능 필드: ${validFields.join(', ')}` });
        }

        const batchLimit = Math.min(reqLimit ? parseInt(reqLimit) : 10, 50);

        let restaurants: any[];
        try {
            restaurants = await this.prisma.restaurantInfo.findMany({
                where: {
                    restaurantStatus: 1,
                    OR: [{ [field]: null }, { [field]: '' }],
                } as any,
                select: { restaurantIdx: true, restaurantName: true, restaurantAddr: true },
                take: batchLimit,
                orderBy: { restaurantViewCount: 'desc' },
            });
        } catch (error) {
            logger.error(`[CrawlerController:enrichMissingStream] findAll: ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }

        // 스트리밍 응답 헤더 (nginx 버퍼링 해제 포함)
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();

        const writeLine = (obj: any) => {
            res.write(JSON.stringify(obj) + '\n');
            if (typeof (res as any).flush === 'function') (res as any).flush();
        };

        writeLine({ type: 'start', total: restaurants.length, field });

        if (restaurants.length === 0) {
            writeLine({ type: 'done', success: true, message: '보강할 식당이 없습니다.', total: 0, updated: 0, results: [] });
            return res.end();
        }

        let updated = 0;
        const results: any[] = [];

        for (let i = 0; i < restaurants.length; i++) {
            const r = restaurants[i];
            const startedAt = Date.now();
            let entry: any;
            try {
                const enriched = await this.crawlerService.enrichFromSiksin(r.restaurantName);

                if (!enriched) {
                    entry = { name: r.restaurantName, status: 'not_found' };
                } else {
                    const updates: any = {};
                    if (field === 'restaurantMenu' && enriched.menu && enriched.menu.length > 0) {
                        // 구 Sequelize restaurantMenu setter 재현: 배열 → JSON.stringify
                        updates.restaurantMenu = JSON.stringify(enriched.menu);
                    }
                    if (field === 'restaurantImage' && enriched.image) {
                        updates.restaurantImage = enriched.image;
                    }

                    if (Object.keys(updates).length > 0) {
                        await this.prisma.restaurantInfo.updateMany({ where: { restaurantIdx: r.restaurantIdx }, data: updates });
                        updated++;
                        entry = { name: r.restaurantName, status: 'updated', matched: enriched.matchedName };
                    } else {
                        entry = { name: r.restaurantName, status: 'no_data', matched: enriched.matchedName };
                    }
                }
            } catch (err) {
                logger.error(`[CrawlerController:enrichMissingStream] ${r.restaurantName}: ${err.message}`);
                entry = { name: r.restaurantName, status: 'error', error: err.message };
            }

            results.push(entry);
            writeLine({
                type: 'progress',
                index: i,
                total: restaurants.length,
                updated,
                elapsedMs: Date.now() - startedAt,
                ...entry,
            });
        }

        writeLine({
            type: 'done',
            success: true,
            message: `${restaurants.length}개 중 ${updated}개 보강 완료`,
            total: restaurants.length,
            updated,
            results,
        });
        res.end();
    }

    // 단일 소스 크롤링 (테스트용)
    // GET /admin/crawler/run/:source?query=맛집&region=서울&count=10&dryRun=true
    @Get('run/:source')
    async runSingleSource(@Req() req: Request, @Res() res: Response) {
        try {
            const { source } = req.params as any;
            const { query, region, count, dryRun } = req.query as any;

            const validSources = ['kakao', 'naver', 'google', 'siksin'];
            if (!validSources.includes(source)) {
                return res.status(400).json({ error: `유효하지 않은 소스: ${source}. 사용 가능: ${validSources.join(',')}` });
            }

            const result = await this.crawlerService.crawlRestaurants({
                sources: [source],
                query: query || '맛집',
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
        } catch (error) {
            logger.error(`[CrawlerController:runSingleSource] ${error.message}`);
            return res.status(500).json({ success: false, message: `크롤링 실패: ${error.message || 'Internal Server Error'}` });
        }
    }
}
