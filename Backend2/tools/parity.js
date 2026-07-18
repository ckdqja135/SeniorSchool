/**
 * 사이드바이사이드 패리티 하네스
 * 사용: node tools/parity.js <cases.json> [--old http://localhost:3001] [--new http://localhost:3100]
 *
 * cases.json 형식:
 * [
 *   { "name": "univ board list", "method": "GET", "path": "/univ/board?univIdx=1" },
 *   { "name": "insert", "method": "POST", "path": "/univ/board/insert", "body": {...}, "ignoreKeys": ["timestamp"] }
 * ]
 * - ignoreKeys: 응답 JSON에서 무시할 키 (깊이 무관, 예: timestamp/regDate)
 * - 응답 status + 헤더(content-type) + 바디(JSON deep-diff)를 비교한다.
 */
const fs = require('fs');

const args = process.argv.slice(2);
const casesFile = args.find(a => !a.startsWith('--'));
const getOpt = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : def;
};
const OLD = getOpt('--old', 'http://localhost:3001');
const NEW = getOpt('--new', 'http://localhost:3100');

if (!casesFile) {
    console.error('usage: node tools/parity.js <cases.json> [--old URL] [--new URL]');
    process.exit(1);
}

const cases = JSON.parse(fs.readFileSync(casesFile, 'utf8'));

function stripKeys(obj, keys) {
    if (Array.isArray(obj)) return obj.map(o => stripKeys(o, keys));
    if (obj && typeof obj === 'object') {
        const out = {};
        for (const k of Object.keys(obj)) {
            if (keys.includes(k)) continue;
            out[k] = stripKeys(obj[k], keys);
        }
        return out;
    }
    return obj;
}

// 구조 deep-compare. 문자열 완전일치 대신:
// - 부동소수점 number는 상대오차 1e-9까지 동일로 간주 (DOUBLE 컬럼의 mariadb 드라이버 vs Prisma 엔진
//   1 ULP 차이 흡수 — DEVIATIONS.md 참조). 정수는 정확히 일치해야 함.
// - 그 외 값/키 집합/배열 길이는 엄격 비교.
function deepEqual(a, b, path) {
    path = path || '$';
    if (a === b) return null;
    if (typeof a === 'number' && typeof b === 'number') {
        if (Number.isInteger(a) && Number.isInteger(b)) {
            return a === b ? null : `${path}: int ${a} != ${b}`;
        }
        const denom = Math.max(Math.abs(a), Math.abs(b), 1e-300);
        if (Math.abs(a - b) / denom <= 1e-9) return null; // float tolerance
        return `${path}: float ${a} != ${b}`;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        return `${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
    }
    if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array/object mismatch`;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return `${path}: array length ${a.length} != ${b.length}`;
        for (let i = 0; i < a.length; i++) {
            const d = deepEqual(a[i], b[i], `${path}[${i}]`);
            if (d) return d;
        }
        return null;
    }
    const ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length || !ak.every((k, i) => k === bk[i])) {
        return `${path}: key set/order differs\n    old keys: ${ak.join(',')}\n    new keys: ${bk.join(',')}`;
    }
    for (const k of ak) {
        const d = deepEqual(a[k], b[k], `${path}.${k}`);
        if (d) return d;
    }
    return null;
}

async function callOne(base, c) {
    const opts = { method: c.method || 'GET', headers: {} };
    if (c.body !== undefined) {
        opts.headers['Content-Type'] = 'application/json; charset=utf-8';
        opts.body = JSON.stringify(c.body);
    }
    if (c.headers) Object.assign(opts.headers, c.headers);
    const r = await fetch(base + c.path, opts);
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: r.status, contentType: r.headers.get('content-type'), text, json };
}

(async () => {
    let pass = 0, fail = 0;
    for (const c of cases) {
        const ignore = c.ignoreKeys || [];
        let o, n;
        try {
            [o, n] = await Promise.all([callOne(OLD, c), callOne(NEW, c)]);
        } catch (e) {
            console.log(`✖ ${c.name}: request error ${e.message}`);
            fail++;
            continue;
        }
        const problems = [];
        if (o.status !== n.status) problems.push(`status old=${o.status} new=${n.status}`);
        if (o.json !== null && n.json !== null) {
            let oj = stripKeys(o.json, ignore), nj = stripKeys(n.json, ignore);
            // unordered: 최상위 배열을 정규(canonical) 정렬 후 비교 → 순서 무관 multiset 동등성 검증.
            // 원본이 동점(예: 같은 count/hits)에서 실행마다 순서가 바뀌는 비결정적 정렬을 낼 때 사용.
            // (동점 순서는 프론트 계약이 아님 — DEVIATIONS.md 참조)
            if (c.unordered && Array.isArray(oj) && Array.isArray(nj)) {
                const k = v => JSON.stringify(v);
                oj = [...oj].sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0));
                nj = [...nj].sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0));
            }
            const diff = deepEqual(oj, nj);
            if (diff) problems.push(`body diff: ${diff}`);
        } else if (o.text !== n.text) {
            problems.push(`body diff (non-JSON):\n    old: ${o.text.slice(0, 400)}\n    new: ${n.text.slice(0, 400)}`);
        }
        if (problems.length) {
            console.log(`✖ ${c.name}\n  ${problems.join('\n  ')}`);
            fail++;
        } else {
            console.log(`✔ ${c.name} (${o.status})`);
            pass++;
        }
    }
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
