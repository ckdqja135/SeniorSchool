/**
 * 행정동 경계(GeoJSON) → 동별 경계 사각형(bbox) 데이터 모듈 생성기.
 *
 * 식당 크롤러(카카오 FD6 동 단위 수집)가 동마다 검색을 시작할 rect 로 쓴다.
 * 행정동이 바뀌면(보통 반기마다) 최신 경계 파일을 받아 다시 돌리면 된다.
 *
 *   원본: https://github.com/vuski/admdongkor (HangJeongDong_verYYYYMMDD.geojson)
 *   실행: node tools/kakao-fd6/build-dong-bbox.js <geojson 경로>
 *   결과: src/modules/scheduler/restaurant/kakao-fd6/dong-bbox.data.ts (덮어씀)
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
    console.error('사용법: node tools/kakao-fd6/build-dong-bbox.js <HangJeongDong_verYYYYMMDD.geojson>');
    process.exit(1);
}

// 행정동 코드 앞 두 자리 → 짧은 시/도 이름 (어드민 지역 선택·REGION_COORDS 키와 같은 표기)
const SIDO_SHORT = {
    '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주', '30': '대전', '31': '울산',
    '36': '세종', '41': '경기', '42': '강원', '51': '강원', '43': '충북', '44': '충남',
    '45': '전북', '52': '전북', '46': '전남', '47': '경북', '48': '경남', '50': '제주',
};
// 2026-07 부터 광주·전남이 '전남광주통합특별시'(코드 12)로 합쳐졌다. 지역 선택은 아직 광주/전남으로 나뉘어 있어
// 옛 광주광역시 자치구는 '광주', 나머지 시군은 '전남'으로 붙인다.
const GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구']);

function sidoShort(p) {
    const code = String(p.adm_cd2).slice(0, 2);
    if (code === '12') return GWANGJU_GU.has(p.sggnm) ? '광주' : '전남';
    return SIDO_SHORT[code] || p.sidonm;
}

function bboxOf(geometry) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const poly of polys) for (const ring of poly) for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    // 소수 다섯째 자리(약 1m)에서 바깥쪽으로 반올림 — 경계에 걸린 가게가 빠지지 않게
    const r = (v, fn) => fn(v * 1e5) / 1e5;
    return [r(minX, Math.floor), r(minY, Math.floor), r(maxX, Math.ceil), r(maxY, Math.ceil)];
}

const geo = JSON.parse(fs.readFileSync(src, 'utf8'));
const rows = geo.features
    .map((f) => {
        const p = f.properties;
        const dong = p.adm_nm.split(' ').slice(-1)[0];
        return [String(p.adm_cd2), sidoShort(p), p.sidonm, p.sggnm, dong, ...bboxOf(f.geometry)];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

const version = (path.basename(src).match(/ver(\d{8})/) || [])[1] || 'unknown';
const out = path.join(__dirname, '../../src/modules/scheduler/restaurant/kakao-fd6/dong-bbox.data.ts');
const body = [
    '// 자동 생성 파일 — 직접 고치지 말 것. tools/kakao-fd6/build-dong-bbox.js 로 다시 만든다.',
    `// 원본: vuski/admdongkor ver${version} (행정동 ${rows.length}개)`,
    '// [행정동코드, 시도(짧은 이름), 시도(정식), 시군구, 동, minX(경도), minY(위도), maxX, maxY]',
    'export type DongBboxRow = [string, string, string, string, string, number, number, number, number];',
    '',
    `export const DONG_BBOX_VERSION = '${version}';`,
    '',
    'export const DONG_BBOX: DongBboxRow[] = [',
    ...rows.map((r) => `    ${JSON.stringify(r)},`),
    '];',
    '',
].join('\n');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body);
console.log(`${rows.length}개 동 → ${path.relative(process.cwd(), out)}`);
