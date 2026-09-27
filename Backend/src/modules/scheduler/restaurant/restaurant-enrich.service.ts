/**
 * 식당 빈 필드(메뉴·이미지·URL) 정기 보강.
 *
 * 주간 크롤링(RestaurantCrawlerSchedulerService.run) 끝에 이어서 돈다.
 *  - 대상: 활성 식당 중 메뉴·이미지가 null/'' 이거나 URL 이 '' 인 곳 (URL 은 NOT NULL 컬럼이라 '' 가 비어 있음)
 *  - 메뉴·이미지: 식신 검색(enrichFromSiksin — 이름 일치 검증 포함)
 *  - URL: 식당 좌표 반경 500m 안에서 카카오 키워드 검색 → 이름이 맞는 곳, 없으면 네이버 지역 검색
 *  - 비어 있는 필드만 채운다. 이미 있는 값은 건드리지 않는다.
 *  - 실패하면 재시도하지 않고 다음 식당으로 넘어간다.
 *
 * 수천 곳을 한 번에 다 돌면 외부 사이트에 부담이고 새벽 시간을 넘기므로
 * 실행당 시간·개수 예산 안에서만 돌고, 어디까지 봤는지(restaurantIdx 커서)를 파일에 남겨
 * 다음 실행은 그 뒤부터 이어 간다. 끝까지 가면 처음으로 돌아간다.
 * (DB 스키마를 바꾸지 않으려고 커서는 logs/ 아래 파일에 둔다. 파일이 없으면 처음부터)
 */

import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';
import { RestaurantCrawlerService } from './restaurant-crawler.service';

export interface EnrichOptions {
    /** 이 시간(ms)이 지나면 다음 식당을 시작하지 않는다 */
    budgetMs?: number;
    /** 한 번에 확인할 최대 식당 수 */
    maxCount?: number;
    /** 식당 사이 쉬는 시간(ms) — 외부 사이트 부담 완화 */
    pauseMs?: number;
}

export interface EnrichStats {
    checked: number;
    filled: number;
    menu: number;
    image: number;
    url: number;
    missed: number;
    errors: number;
    /** 이번 실행 뒤 커서 (다음 실행 시작점) */
    cursor: string;
    wrapped: boolean;
    elapsedMs: number;
}

const DEFAULTS: Required<EnrichOptions> = {
    budgetMs: 2 * 60 * 60 * 1000,
    maxCount: 3000,
    pauseMs: 300,
};

const BATCH = 100;
const STATE_FILE = path.join(process.cwd(), 'logs', 'restaurant-enrich-state.json');

/** 비교용 이름: 공백·괄호·구분 기호를 빼고 소문자로 */
function normName(s: string): string {
    return (s || '')
        .replace(/<\/?b>/g, '')
        .replace(/\(.*?\)|\[.*?\]/g, '')
        .replace(/[\s·\-()（）]/g, '')
        .replace(/(본점|직영점)$/, '')
        .toLowerCase();
}

/** 정확 일치 > 한쪽이 다른 쪽을 포함(3글자 이상)만 같은 가게로 본다 (식신 보강과 같은 기준) */
function sameName(a: string, b: string): boolean {
    const x = normName(a);
    const y = normName(b);
    if (!x || !y) return false;
    if (x === y) return true;
    return (x.length >= 3 && y.includes(x)) || (y.length >= 3 && x.includes(y));
}

function isBlank(v: unknown): boolean {
    return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

/** DB 의 restaurantMenu(TEXT) 가 비었는지 — '[]' 같은 빈 배열 문자열도 빈 것으로 본다 */
function menuBlank(v: string | null): boolean {
    if (isBlank(v)) return true;
    try {
        const parsed = JSON.parse(v as string);
        return Array.isArray(parsed) && parsed.length === 0;
    } catch {
        return false;
    }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class RestaurantEnrichService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly crawler: RestaurantCrawlerService,
    ) {}

    private readCursor(): bigint {
        try {
            const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            return BigInt(raw?.cursor ?? 0);
        } catch {
            return BigInt(0);
        }
    }

    private writeCursor(cursor: bigint, extra: Record<string, unknown> = {}) {
        try {
            fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
            fs.writeFileSync(STATE_FILE, JSON.stringify({ cursor: cursor.toString(), updatedAt: new Date().toISOString(), ...extra }));
        } catch (err) {
            // 커서를 못 남겨도 보강 자체는 계속한다 (다음 실행이 처음부터 다시 볼 뿐)
            logger.warn(`[RestaurantEnrich] 커서 저장 실패: ${err.message}`);
        }
    }

    /** 커서 뒤에서 빈 필드가 있는 식당을 BATCH 개 */
    private async nextBatch(after: bigint) {
        return this.prisma.restaurantInfo.findMany({
            where: {
                restaurantStatus: 1,
                restaurantIdx: { gt: after },
                OR: [
                    { restaurantMenu: null },
                    { restaurantMenu: '' },
                    { restaurantMenu: '[]' },
                    { restaurantImage: null },
                    { restaurantImage: '' },
                    { restaurantURL: '' },
                ],
            },
            select: {
                restaurantIdx: true,
                restaurantName: true,
                restaurantAddr: true,
                restaurantLocation: true,
                restaurantLatX: true,
                restaurantLatY: true,
                restaurantMenu: true,
                restaurantImage: true,
                restaurantURL: true,
            },
            orderBy: { restaurantIdx: 'asc' },
            take: BATCH,
        });
    }

    /** 좌표 반경 500m 안 카카오 키워드 검색으로 같은 이름 가게의 place_url */
    private async findUrlFromKakao(name: string, lat: number, lng: number): Promise<string | null> {
        const key = process.env.KAKAO_REST_API_KEY;
        if (!key || !lat || !lng) return null;
        const { data } = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
            headers: { Authorization: `KakaoAK ${key}` },
            params: { query: name, x: lng, y: lat, radius: 500, size: 5, sort: 'accuracy' },
            timeout: 10000,
        });
        const hit = (data?.documents || []).find((d: any) => sameName(name, d.place_name) && d.place_url);
        return hit ? hit.place_url : null;
    }

    /** 네이버 지역 검색 — 이름이 맞고 주소에 같은 구/군이 들어간 곳의 link */
    private async findUrlFromNaver(name: string, region: string): Promise<string | null> {
        const items = await this.crawler.fetchFromNaver({ query: `${region} ${name}`.trim(), count: 5 });
        const gu = region.split(/\s+/)[1] || '';
        const hit = items.find(
            (it: any) => sameName(name, it.restaurantName) && it.restaurantURL && (!gu || String(it.restaurantAddr || '').includes(gu)),
        );
        return hit ? hit.restaurantURL : null;
    }

    async enrichMissing(options: EnrichOptions = {}): Promise<EnrichStats> {
        const opt = { ...DEFAULTS, ...options };
        const startedAt = Date.now();
        const stats: EnrichStats = { checked: 0, filled: 0, menu: 0, image: 0, url: 0, missed: 0, errors: 0, cursor: '0', wrapped: false, elapsedMs: 0 };
        let cursor = this.readCursor();
        const startCursor = cursor;

        logger.info(`[RestaurantEnrich] 시작 — 커서 ${cursor} 이후, 최대 ${opt.maxCount}곳 / ${Math.round(opt.budgetMs / 60000)}분`);

        const outOfBudget = () => stats.checked >= opt.maxCount || Date.now() - startedAt >= opt.budgetMs;

        while (!outOfBudget()) {
            let batch = await this.nextBatch(cursor);
            if (batch.length === 0) {
                // 끝까지 봤다 → 처음으로 한 번만 돌아간다 (처음부터 시작한 실행이면 대상이 없는 것)
                if (cursor === BigInt(0) || stats.wrapped) break;
                cursor = BigInt(0);
                stats.wrapped = true;
                this.writeCursor(cursor);
                batch = await this.nextBatch(cursor);
                if (batch.length === 0) break;
            }

            for (const r of batch) {
                if (outOfBudget()) break;
                // 한 바퀴 돌아 이번 실행 시작점에 다시 닿으면 멈춘다 (같은 식당을 두 번 보지 않게)
                if (stats.wrapped && r.restaurantIdx > startCursor) {
                    logger.info(`[RestaurantEnrich] 한 바퀴 완료`);
                    return this.finish(stats, startedAt, cursor);
                }

                cursor = r.restaurantIdx;
                stats.checked += 1;
                const needMenu = menuBlank(r.restaurantMenu);
                const needImage = isBlank(r.restaurantImage);
                const needUrl = isBlank(r.restaurantURL);
                const data: Record<string, unknown> = {};

                // 실패해도 재시도하지 않고 다음 필드·다음 식당으로 넘어간다
                if (needMenu || needImage) {
                    try {
                        const found = await this.crawler.enrichFromSiksin(r.restaurantName);
                        if (found) {
                            if (needMenu && Array.isArray(found.menu) && found.menu.length > 0) data.restaurantMenu = JSON.stringify(found.menu);
                            if (needImage && found.image) data.restaurantImage = String(found.image).slice(0, 200);
                        }
                    } catch (err) {
                        stats.errors += 1;
                        logger.warn(`[RestaurantEnrich] 식신 실패 "${r.restaurantName}": ${err.message}`);
                    }
                }

                if (needUrl) {
                    // 카카오가 실패(오류·못 찾음)하면 네이버로 넘어간다 — 같은 소스를 다시 부르지는 않는다
                    const sources: Array<[string, () => Promise<string | null>]> = [
                        ['카카오', () => this.findUrlFromKakao(r.restaurantName, Number(r.restaurantLatX), Number(r.restaurantLatY))],
                        ['네이버', () => this.findUrlFromNaver(r.restaurantName, r.restaurantLocation || '')],
                    ];
                    for (const [label, find] of sources) {
                        try {
                            const url = await find();
                            if (url) {
                                data.restaurantURL = url.slice(0, 200);
                                break;
                            }
                        } catch (err) {
                            stats.errors += 1;
                            logger.warn(`[RestaurantEnrich] ${label} URL 검색 실패 "${r.restaurantName}": ${err.message}`);
                        }
                    }
                }

                if (Object.keys(data).length > 0) {
                    try {
                        await this.prisma.restaurantInfo.updateMany({ where: { restaurantIdx: r.restaurantIdx }, data });
                        stats.filled += 1;
                        if (data.restaurantMenu) stats.menu += 1;
                        if (data.restaurantImage) stats.image += 1;
                        if (data.restaurantURL) stats.url += 1;
                    } catch (err) {
                        stats.errors += 1;
                        logger.warn(`[RestaurantEnrich] 저장 실패 "${r.restaurantName}": ${err.message}`);
                    }
                } else {
                    stats.missed += 1;
                }

                this.writeCursor(cursor);
                if (opt.pauseMs > 0) await sleep(opt.pauseMs);
            }
        }

        return this.finish(stats, startedAt, cursor);
    }

    private finish(stats: EnrichStats, startedAt: number, cursor: bigint): EnrichStats {
        stats.elapsedMs = Date.now() - startedAt;
        stats.cursor = cursor.toString();
        this.writeCursor(cursor, { lastStats: stats });
        logger.info(
            `[RestaurantEnrich] 완료 — 확인 ${stats.checked} · 채움 ${stats.filled}` +
                ` (메뉴 ${stats.menu} · 이미지 ${stats.image} · URL ${stats.url}) · 못 찾음 ${stats.missed}` +
                ` · 오류 ${stats.errors} · ${Math.round(stats.elapsedMs / 1000)}초 · 다음 시작 ${stats.cursor}`,
        );
        return stats;
    }
}
