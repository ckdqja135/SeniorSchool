/**
 * 카카오 음식점(FD6) 동 단위 수집 → CSV.
 *
 * 서버와 따로 돌리는 스크립트. DB 에는 쓰지 않는다 (CSV 만 만든다).
 *  - 동 목록을 받아 동마다 경계 사각형으로 FD6 검색
 *  - total_count 가 45를 넘는 칸은 4등분해 다시 검색 (45 이하가 될 때까지)
 *  - 중복은 응답의 id 로만 지운다
 *  - 원본 category_name 과 테마 태그(theme-map.ts)를 같이 적는다
 *
 * 카카오 로컬 API 는 하루 호출 한도가 있다. 한도에 걸리면 진행 상황을 남기고 멈추므로
 * 다음 날 같은 명령에 --resume 을 붙이면 이어서 돈다.
 *
 * 실행 (Backend 디렉터리에서):
 *   npx ts-node -T tools/kakao-fd6/crawl.ts --region "서울 마포구" --out kakao-fd6-mapo.csv
 *   npx ts-node -T tools/kakao-fd6/crawl.ts --dongs my-dongs.csv --out out.csv --resume
 *   npx ts-node -T tools/kakao-fd6/crawl.ts --export-dongs dongs.csv --region 서울   (동 목록만 뽑기)
 *
 * 옵션:
 *   --region <지역>      "서울" · "서울 마포구" · "서울 마포구 서교동" (생략하면 전국)
 *   --dongs <csv>        동 목록 파일. 열: adm_cd, sido, sigungu, dong[, min_x, min_y, max_x, max_y]
 *                        사각형 열이 없으면 내장 행정동 데이터에서 코드(없으면 이름)로 찾는다
 *   --out <csv>          결과 파일 (기본 kakao-fd6.csv)
 *   --resume             결과 파일·진행 파일(<out>.state.json)을 읽어 끝난 동은 건너뛰고 이어서 쓴다
 *   --query <키워드>     키워드 검색 + FD6 필터 (생략하면 FD6 전체 카테고리 검색)
 *   --max-calls <n>      이번 실행의 카카오 호출 수 상한 (기본 90000 — 일일 한도보다 조금 낮게)
 *   --pause <ms>         호출 사이 쉬는 시간 (기본 100)
 *   --export-dongs <csv> 수집하지 않고 동 목록(사각형 포함)만 써서 끝낸다 — 고쳐서 --dongs 로 넘기면 된다
 *
 * 키: 환경변수 KAKAO_REST_API_KEY (Backend/.env 를 읽는다)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
    Dong,
    KakaoPlace,
    KakaoQuotaError,
    allDongs,
    collectDong,
    dongsForRegion,
    newStats,
} from '../../src/modules/scheduler/restaurant/kakao-fd6/kakao-fd6';
import { DONG_BBOX_VERSION } from '../../src/modules/scheduler/restaurant/kakao-fd6/dong-bbox.data';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// ─── 인자 ─────────────────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, string | boolean> {
    const out: Record<string, string | boolean> = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) continue;
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) out[key] = true;
        else {
            out[key] = next;
            i++;
        }
    }
    return out;
}

// ─── CSV ─────────────────────────────────────────────────────

const PLACE_COLUMNS = [
    'id', 'place_name', 'category_name', 'theme', 'phone', 'address_name', 'road_address_name',
    'x', 'y', 'place_url', 'adm_cd', 'sido', 'sigungu', 'dong',
] as const;
const DONG_COLUMNS = ['adm_cd', 'sido', 'sigungu', 'dong', 'min_x', 'min_y', 'max_x', 'max_y'] as const;

function csvCell(v: unknown): string {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csvLine = (cells: unknown[]) => cells.map(csvCell).join(',') + '\n';

/** 따옴표·줄바꿈을 지원하는 간단한 CSV 파서 → 헤더 기준 객체 배열 */
function parseCsv(text: string): Record<string, string>[] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    const src = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (quoted) {
            if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && src[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            if (row.some((x) => x !== '')) rows.push(row);
            row = [];
        } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x !== '')) rows.push(row);
    const [head, ...body] = rows;
    if (!head) return [];
    const keys = head.map((h) => h.trim());
    return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

// ─── 동 목록 ─────────────────────────────────────────────────

function loadDongs(file: string): Dong[] {
    const builtIn = allDongs();
    const byCode = new Map(builtIn.map((d) => [d.code, d]));
    const out: Dong[] = [];
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    for (const [i, r] of rows.entries()) {
        const code = r.adm_cd || r.code || '';
        const hasRect = ['min_x', 'min_y', 'max_x', 'max_y'].every((k) => r[k] !== undefined && r[k] !== '' && !Number.isNaN(Number(r[k])));
        let base = code ? byCode.get(code) : undefined;
        if (!base && r.dong) {
            const hits = dongsForRegion([r.sido, r.sigungu, r.dong].filter(Boolean).join(' '), builtIn).filter((d) => d.dong === r.dong);
            if (hits.length === 1) base = hits[0];
            else if (hits.length > 1 && !hasRect) {
                console.warn(`  ${i + 2}행 "${r.sido} ${r.sigungu} ${r.dong}" 와 같은 이름의 동이 ${hits.length}곳이라 건너뜀 — adm_cd 를 적어 주세요`);
                continue;
            }
        }
        if (!base && !hasRect) {
            console.warn(`  ${i + 2}행 동을 찾지 못하고 사각형도 없어 건너뜀: ${JSON.stringify(r)}`);
            continue;
        }
        out.push({
            code: code || base?.code || `row${i + 2}`,
            sido: r.sido || base?.sido || '',
            sidoFull: base?.sidoFull || r.sido || '',
            sigungu: r.sigungu || base?.sigungu || '',
            dong: r.dong || base?.dong || '',
            rect: hasRect
                ? [Number(r.min_x), Number(r.min_y), Number(r.max_x), Number(r.max_y)]
                : (base as Dong).rect,
        });
    }
    return out;
}

// ─── 진행 상황 ───────────────────────────────────────────────

interface State {
    doneCodes: string[];
    totalCalls: number;
    updatedAt: string;
}

function readState(file: string): State {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return { doneCodes: [], totalCalls: 0, updatedAt: '' };
    }
}

function readSeenIds(csvFile: string): Set<string> {
    const seen = new Set<string>();
    if (!fs.existsSync(csvFile)) return seen;
    for (const r of parseCsv(fs.readFileSync(csvFile, 'utf8'))) if (r.id) seen.add(r.id);
    return seen;
}

// ─── 실행 ────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const region = typeof args.region === 'string' ? args.region : '';

    let dongs = typeof args.dongs === 'string' ? loadDongs(args.dongs) : allDongs();
    if (region) dongs = dongsForRegion(region, dongs);

    if (typeof args['export-dongs'] === 'string') {
        const file = args['export-dongs'];
        fs.writeFileSync(file, '\uFEFF' + csvLine([...DONG_COLUMNS]) + dongs.map((d) => csvLine([d.code, d.sido, d.sigungu, d.dong, ...d.rect])).join(''));
        console.log(`동 ${dongs.length}개 → ${file} (행정동 데이터 ver${DONG_BBOX_VERSION})`);
        return;
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
        console.error('KAKAO_REST_API_KEY 가 없습니다 (Backend/.env 또는 환경변수)');
        process.exit(1);
    }
    if (dongs.length === 0) {
        console.error('수집할 동이 없습니다 — --region / --dongs 를 확인하세요');
        process.exit(1);
    }

    const outFile = typeof args.out === 'string' ? args.out : 'kakao-fd6.csv';
    const stateFile = `${outFile}.state.json`;
    const resume = args.resume === true;
    const maxCalls = Number(args['max-calls'] ?? 90000);
    const pauseMs = Number(args.pause ?? 100);
    const query = typeof args.query === 'string' ? args.query : undefined;

    if (!resume && fs.existsSync(outFile)) {
        console.error(`${outFile} 가 이미 있습니다. 이어서 하려면 --resume, 새로 하려면 파일을 지우거나 --out 을 바꾸세요`);
        process.exit(1);
    }

    const state = resume ? readState(stateFile) : { doneCodes: [], totalCalls: 0, updatedAt: '' };
    const done = new Set(state.doneCodes);
    const seen = resume ? readSeenIds(outFile) : new Set<string>();
    if (!fs.existsSync(outFile)) fs.writeFileSync(outFile, '\uFEFF' + csvLine([...PLACE_COLUMNS]));

    const todo = dongs.filter((d) => !done.has(d.code));
    console.log(
        `동 ${dongs.length}개 중 ${todo.length}개 수집 (끝난 동 ${dongs.length - todo.length}개, 이미 받은 가게 ${seen.size}곳)` +
            ` · ${query ? `키워드 "${query}"` : 'FD6 전체'} · 호출 상한 ${maxCalls} · 행정동 데이터 ver${DONG_BBOX_VERSION}`,
    );

    const stats = newStats();
    const saveState = () => {
        state.doneCodes = [...done];
        state.updatedAt = new Date().toISOString();
        fs.writeFileSync(stateFile, JSON.stringify(state));
    };
    const startedAt = Date.now();
    let stoppedBy = '';

    for (const [i, dong] of todo.entries()) {
        const callsBefore = stats.calls;
        const lines: string[] = [];
        let budgetHit = false as boolean;
        try {
            const added = await collectDong(
                dong,
                {
                    apiKey,
                    query,
                    pauseMs,
                    seen,
                    beforeCall: () => {
                        if (stats.calls >= maxCalls) { budgetHit = true; return false; }
                        return true;
                    },
                    onPlace: (p: KakaoPlace) => {
                        lines.push(csvLine([
                            p.id, p.place_name, p.category_name, p.theme, p.phone, p.address_name, p.road_address_name,
                            p.x, p.y, p.place_url, dong.code, dong.sido, dong.sigungu, dong.dong,
                        ]));
                    },
                    log: (m) => console.warn(`  ${m}`),
                },
                stats,
            );
            // 받은 만큼은 쓴다. 호출 상한으로 중간에 멈춘 동은 '끝남'으로 치지 않아 다음에 다시 본다 (id 로 걸러진다)
            if (lines.length > 0) fs.appendFileSync(outFile, lines.join(''));
            state.totalCalls += stats.calls - callsBefore;
            if (budgetHit) {
                stoppedBy = `호출 상한 ${maxCalls}회`;
                saveState();
                break;
            }
            done.add(dong.code);
            saveState();
            console.log(`[${i + 1}/${todo.length}] ${dong.sido} ${dong.sigungu} ${dong.dong} +${added}곳 (호출 ${stats.calls - callsBefore}, 누적 ${seen.size}곳)`);
        } catch (err: any) {
            if (lines.length > 0) fs.appendFileSync(outFile, lines.join(''));
            state.totalCalls += stats.calls - callsBefore;
            saveState();
            if (err instanceof KakaoQuotaError) {
                stoppedBy = err.message;
                break;
            }
            throw err;
        }
    }

    const mins = Math.round((Date.now() - startedAt) / 60000);
    console.log(
        `\n완료 — 누적 ${seen.size}곳 · 이번 호출 ${stats.calls}회 · 쪼갤 수 없어 45건만 받은 칸 ${stats.truncatedCells} · 실패해 건너뛴 칸 ${stats.failedCells} · ${mins}분`,
    );
    if (stoppedBy) {
        const left = dongs.filter((d) => !done.has(d.code)).length;
        console.log(`${stoppedBy}로 멈춤 — 남은 동 ${left}개. 같은 명령에 --resume 을 붙여 이어서 돌리세요.`);
        process.exitCode = 2;
    }
    console.log(`결과: ${outFile}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
