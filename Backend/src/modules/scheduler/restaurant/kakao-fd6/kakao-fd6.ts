/**
 * 카카오 로컬 API 음식점(FD6) 동 단위 수집.
 *
 * 카카오 검색은 한 조건에 최대 45건(15건 × 3쪽)까지만 준다. 그래서
 *  1) 행정동의 경계 사각형(rect)으로 FD6 를 검색하고
 *  2) meta.total_count 가 45를 넘으면 rect 를 4등분해 각각 다시 검색한다 (45 이하가 될 때까지)
 *  3) 중복은 응답의 id 로만 지운다 (이웃 동의 사각형은 서로 겹치고, 쪼갠 칸의 경계에 걸린 가게는 양쪽에서 나온다)
 *
 * 식당 크롤러(RestaurantCrawlerService.fetchFromKakao)와 따로 돌리는 수집 스크립트(tools/kakao-fd6/crawl.ts)가 같이 쓴다.
 * 여기에는 DB·Nest 의존이 없다.
 */

import axios from 'axios';
import { DONG_BBOX, DongBboxRow } from './dong-bbox.data';
import { themeLabel } from './theme-map';

/** 카카오가 한 조건에 주는 최대 건수 (15 × 3쪽) */
export const KAKAO_PAGE_LIMIT = 45;
const PAGE_SIZE = 15;
/** 이보다 작은 칸(약 30m)은 더 쪼개지 않는다 — 한 건물에 45곳이 넘으면 쪼개도 줄지 않는다 */
const MIN_SPAN_DEG = 0.0003;
/** 쪼개기 깊이 상한 (동 사각형의 1/4^12) — 좌표가 같은 가게가 몰린 곳에서 끝없이 쪼개지 않게 */
const MAX_DEPTH = 12;

export type Rect = [number, number, number, number]; // [minX(경도), minY(위도), maxX, maxY]

export interface Dong {
    code: string;
    sido: string;      // 짧은 이름 (서울, 경기 …)
    sidoFull: string;  // 정식 이름
    sigungu: string;
    dong: string;
    rect: Rect;
}

/** 카카오 응답 한 건 + 테마 */
export interface KakaoPlace {
    id: string;
    place_name: string;
    category_name: string;
    category_group_code: string;
    phone: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
    place_url: string;
    theme: string;
}

export interface CollectStats {
    calls: number;
    /** 45 이하로 못 쪼개 일부만 받은 칸 수 (받은 45건은 들어 있다) */
    truncatedCells: number;
    /** 호출 실패로 건너뛴 칸 수 (재시도하지 않는다) */
    failedCells: number;
}

export interface CollectOptions {
    apiKey: string;
    /** 없으면 카테고리 검색(FD6 전체), 있으면 키워드 검색 + FD6 필터 */
    query?: string;
    /** 모은 개수가 이만큼 되면 멈춘다 (없으면 끝까지) */
    limit?: number;
    /** 호출 사이 쉬는 시간(ms) */
    pauseMs?: number;
    /** 이미 본 id (여러 동·여러 실행에 걸쳐 공유). 여기에 있는 id 는 다시 내보내지 않는다 */
    seen?: Set<string>;
    /** 호출 한 번마다 — 호출 수 상한 같은 바깥 예산 확인용. false 를 돌려주면 멈춘다 */
    beforeCall?: () => boolean;
    onPlace?: (p: KakaoPlace) => void;
    log?: (msg: string) => void;
}

/** 일일 호출 한도 초과 — 이후 호출도 다 실패하므로 수집을 멈춰야 한다 */
export class KakaoQuotaError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function toDong(row: DongBboxRow): Dong {
    const [code, sido, sidoFull, sigungu, dong, minX, minY, maxX, maxY] = row;
    return { code, sido, sidoFull, sigungu, dong, rect: [minX, minY, maxX, maxY] };
}

export function allDongs(): Dong[] {
    return DONG_BBOX.map(toDong);
}

/**
 * "서울", "서울 마포구", "서울특별시 마포구 서교동" 같은 지역 문자열에 맞는 동들.
 * 첫 토큰은 시/도(짧은·정식 이름 모두), 다음은 시군구, 그다음은 동 이름(앞부분 일치)으로 좁힌다.
 */
export function dongsForRegion(region: string, dongs: Dong[] = allDongs()): Dong[] {
    const [sido, sigungu, dong] = (region || '').trim().split(/\s+/).filter(Boolean);
    return dongs.filter((d) => {
        if (sido && d.sido !== sido && d.sidoFull !== sido && !d.sidoFull.startsWith(sido)) return false;
        // 시군구는 '수원시 장안구' 처럼 두 단어일 수 있어 포함으로 본다
        if (sigungu && !d.sigungu.includes(sigungu)) return false;
        if (dong && !d.dong.startsWith(dong)) return false;
        return true;
    });
}

/** 좌표 + 반경(m) → rect */
export function rectAround(lat: number, lng: number, radiusM: number): Rect {
    const dLat = radiusM / 111_000;
    const dLng = radiusM / (111_000 * Math.cos((lat * Math.PI) / 180));
    return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

function splitRect([minX, minY, maxX, maxY]: Rect): Rect[] {
    const mx = (minX + maxX) / 2;
    const my = (minY + maxY) / 2;
    return [
        [minX, minY, mx, my],
        [mx, minY, maxX, my],
        [minX, my, mx, maxY],
        [mx, my, maxX, maxY],
    ];
}

const fmt = (r: Rect) => r.map((v) => v.toFixed(6)).join(',');

interface PageResult {
    total: number;
    isEnd: boolean;
    docs: any[];
}

/** 한 쪽 조회. 한도 초과는 KakaoQuotaError, 나머지 오류는 그대로 던진다 */
async function fetchPage(rect: Rect, page: number, opt: CollectOptions): Promise<PageResult> {
    const url = opt.query
        ? 'https://dapi.kakao.com/v2/local/search/keyword.json'
        : 'https://dapi.kakao.com/v2/local/search/category.json';
    try {
        const { data } = await axios.get(url, {
            headers: { Authorization: `KakaoAK ${opt.apiKey}` },
            params: {
                ...(opt.query ? { query: opt.query } : {}),
                category_group_code: 'FD6',
                rect: fmt(rect),
                page,
                size: PAGE_SIZE,
                sort: 'accuracy',
            },
            timeout: 10000,
        });
        return {
            total: Number(data?.meta?.total_count ?? 0),
            isEnd: Boolean(data?.meta?.is_end ?? true),
            docs: data?.documents || [],
        };
    } catch (err: any) {
        const status = err?.response?.status;
        const type = err?.response?.data?.errorType || '';
        // 카카오는 일일 한도를 넘기면 429 또는 errorType 'RequestThrottled' 를 준다
        if (status === 429 || /Throttled|quota/i.test(type)) {
            throw new KakaoQuotaError(`카카오 호출 한도 초과 (${status} ${type})`);
        }
        throw err;
    }
}

/**
 * rect 하나를 끝까지 수집한다 (45건이 넘으면 4등분해 재귀).
 * 새로 본 가게만 onPlace 로 내보내고 개수를 돌려준다.
 */
export async function collectRect(rect: Rect, opt: CollectOptions, stats: CollectStats, depth = 0): Promise<number> {
    const seen = opt.seen ?? (opt.seen = new Set());
    let added = 0;
    const full = () => opt.limit !== undefined && seen.size >= opt.limit;
    const canCall = () => !full() && (opt.beforeCall ? opt.beforeCall() : true);

    const take = (docs: any[]) => {
        for (const d of docs) {
            const id = String(d.id || '');
            if (!id || seen.has(id)) continue;
            if (full()) return;
            seen.add(id);
            added += 1;
            opt.onPlace?.({
                id,
                place_name: d.place_name || '',
                category_name: d.category_name || '',
                category_group_code: d.category_group_code || '',
                phone: d.phone || '',
                address_name: d.address_name || '',
                road_address_name: d.road_address_name || '',
                x: d.x || '',
                y: d.y || '',
                place_url: d.place_url || '',
                theme: themeLabel(d.category_name || ''),
            });
        }
    };

    const call = async (page: number): Promise<PageResult | null> => {
        if (!canCall()) return null;
        stats.calls += 1;
        try {
            const r = await fetchPage(rect, page, opt);
            if (opt.pauseMs) await sleep(opt.pauseMs);
            return r;
        } catch (err: any) {
            if (err instanceof KakaoQuotaError) throw err;
            // 실패한 칸은 다시 부르지 않고 넘어간다
            stats.failedCells += 1;
            opt.log?.(`[KakaoFD6] rect ${fmt(rect)} ${page}쪽 실패, 건너뜀: ${err.message}`);
            return null;
        }
    };

    const first = await call(1);
    if (!first) return added;

    const [minX, minY, maxX, maxY] = rect;
    const splittable = depth < MAX_DEPTH && (maxX - minX > MIN_SPAN_DEG || maxY - minY > MIN_SPAN_DEG);

    if (first.total > KAKAO_PAGE_LIMIT && splittable) {
        // 1쪽에서 받은 건 버리지 않는다 (쪼갠 칸에서 다시 나오면 id 로 걸러진다)
        take(first.docs);
        for (const sub of splitRect(rect)) {
            if (full()) break;
            added += await collectRect(sub, opt, stats, depth + 1);
        }
        return added;
    }

    if (first.total > KAKAO_PAGE_LIMIT) {
        stats.truncatedCells += 1;
        opt.log?.(`[KakaoFD6] rect ${fmt(rect)} 는 더 쪼갤 수 없어 ${first.total}건 중 ${KAKAO_PAGE_LIMIT}건만 받음`);
    }

    take(first.docs);
    let isEnd = first.isEnd;
    for (let page = 2; !isEnd && page <= KAKAO_PAGE_LIMIT / PAGE_SIZE; page++) {
        const r = await call(page);
        if (!r) break;
        take(r.docs);
        isEnd = r.isEnd;
    }
    return added;
}

/** 동 하나 수집 (동 경계 사각형에서 시작) */
export function collectDong(dong: Dong, opt: CollectOptions, stats: CollectStats): Promise<number> {
    return collectRect(dong.rect, opt, stats);
}

export function newStats(): CollectStats {
    return { calls: 0, truncatedCells: 0, failedCells: 0 };
}
