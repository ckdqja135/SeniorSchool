/**
 * 회사 유형(compType) 분류 서비스
 *
 * 우선순위 (정확도 높은 순):
 *   1) 공정위 공시대상기업집단 (data.go.kr)         → '대기업'        [Phase 1b]
 *   2) OpenDart corpCode.xml stock_code 보유          → '중견기업'      [Phase 1a]
 *   3) 매칭 실패                                       → null (호출측 default 유지)
 *
 * 모든 외부 호출은 fetch + 24h 메모리 캐시.
 */

const AdmZip = require('adm-zip');
const logger = require('../utils/logger');

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT = 30000;

// ─── 메모리 캐시 ─────────────────────────────────────────
const cache = {
    listedMap: null,        // Map<normalizedName, stock_code>
    listedMapAt: 0,
    conglomerateSet: null,  // Set<normalizedName>
    conglomerateSetAt: 0,
};

// ─── 회사명 정규화 ─────────────────────────────────────────
// 공백/괄호/㈜/주식회사 등 제거 후 소문자화 — 매칭 정확도 향상
function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .replace(/주식회사|㈜|\(주\)|\(유\)|유한회사/g, '')
        .replace(/[\s·\-()（）.,]/g, '')
        .toLowerCase()
        .trim();
}

// 한↔영 음차 prefix dictionary
// 공정위는 한글 표기("엘지전자"), OpenDart는 영문 표기("LG ELECTRONICS")가 많아
// 사용자가 "LG전자"로 검색하면 양쪽 어디에도 못 잡히는 문제 → 양방향 alias 등록.
const KOR_ENG_PREFIX = [
    ['엘지', 'lg'],
    ['에스케이', 'sk'],
    ['에이치디', 'hd'],
    ['지에스', 'gs'],
    ['시제이', 'cj'],
    ['케이티', 'kt'],
    ['디비', 'db'],
    ['에이치엘', 'hl'],
    ['오씨아이', 'oci'],
    ['엠비케이', 'mbk'],
    ['비지에프', 'bgf'],
    ['아이에스', 'is'],
    ['엘에스', 'ls'],
    ['에이치엠엠', 'hmm'],
    ['에이치에스', 'hs'],
    ['디엘', 'dl'],
    ['디엔', 'dn'],
    ['디케이', 'dk'],
    ['비에이치', 'bh'],
    ['아이비케이', 'ibk'],
    ['케이씨씨', 'kcc'],
    ['비비큐', 'bbq'],
    ['에이치디씨', 'hdc'],
    ['오케이', 'ok'],
    ['에이치디', 'hd'],
];

// 정규화된 이름 → 가능한 모든 한↔영 변환 alias Set 반환 (자기 자신 포함).
// 단순 prefix 치환만 — anywhere 치환은 false-positive 위험.
function expandAliases(norm) {
    const aliases = new Set([norm]);
    if (!norm) return aliases;
    for (const [kor, eng] of KOR_ENG_PREFIX) {
        if (norm.startsWith(kor)) aliases.add(eng + norm.slice(kor.length));
        if (norm.startsWith(eng)) aliases.add(kor + norm.slice(eng.length));
    }
    return aliases;
}

// 정규화 + alias 확장 후 모두 set에 등록
function addWithAliases(set, name) {
    const norm = normalizeName(name);
    if (!norm) return;
    for (const a of expandAliases(norm)) set.add(a);
}

// 정규화 + alias 확장 후 map에 등록 (key=alias, value=원본 정규화명)
function addMapWithAliases(map, name, value) {
    const norm = normalizeName(name);
    if (!norm) return;
    for (const a of expandAliases(norm)) map.set(a, value);
}

// ─── 1) OpenDart corpCode.xml → 상장사 Map ───────────────
async function loadListedMap() {
    if (cache.listedMap && Date.now() - cache.listedMapAt < TWENTY_FOUR_HOURS) {
        return cache.listedMap;
    }

    const apiKey = process.env.OPENDART_API_KEY;
    const baseUrl = process.env.OPENDART_API_URL || 'https://opendart.fss.or.kr/api';
    if (!apiKey) {
        logger.warn('[Conglomerate:Listed] OPENDART_API_KEY 미설정, 빈 Map 반환');
        cache.listedMap = new Map();
        cache.listedMapAt = Date.now();
        return cache.listedMap;
    }

    try {
        const url = `${baseUrl}/corpCode.xml?crtfc_key=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const buffer = Buffer.from(await res.arrayBuffer());
        let xmlText;
        if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
            // ZIP 시그니처 → adm-zip으로 추출
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries();
            if (entries.length === 0) throw new Error('CORPCODE ZIP empty');
            xmlText = zip.readAsText(entries[0]);
        } else {
            xmlText = buffer.toString('utf-8');
        }

        const map = new Map();
        // corp_eng_name까지 추출 → 영문 등록명도 alias로 매핑 (예: NAVER → 네이버)
        const pattern = /<list>[\s\S]*?<corp_code>(.*?)<\/corp_code>[\s\S]*?<corp_name>(.*?)<\/corp_name>[\s\S]*?<corp_eng_name>([\s\S]*?)<\/corp_eng_name>[\s\S]*?<stock_code>(.*?)<\/stock_code>[\s\S]*?<\/list>/g;
        let m;
        while ((m = pattern.exec(xmlText)) !== null) {
            const corpName = m[2].trim();
            const corpEngName = m[3].trim();
            const stockCode = m[4].trim();
            if (!corpName || !stockCode) continue; // 비상장사 스킵 (compType 분류 목적)
            addMapWithAliases(map, corpName, stockCode);
            if (corpEngName) addMapWithAliases(map, corpEngName, stockCode);
        }

        logger.info(`[Conglomerate:Listed] OpenDart 상장사 ${map.size}건 로드`);
        cache.listedMap = map;
        cache.listedMapAt = Date.now();
        return map;
    } catch (err) {
        logger.error(`[Conglomerate:Listed] 로드 실패: ${err.message}`);
        cache.listedMap = cache.listedMap || new Map();
        return cache.listedMap; // stale 캐시 또는 빈 Map
    }
}

// ─── 2) 공정위 대규모기업집단 → 소속회사 Set ────────────────
// 공정위 OpenAPI 두 개 체이닝 (XML 응답):
//   ① FTC_GROUP_LIST_API_URL   → 지정년도 기업집단 92개 + unityGrupCode 추출
//   ② FTC_GROUP_MEMBER_API_URL → 각 unityGrupCode → 소속회사명(entrprsNm) 누적
//
// 정확한 호출 형식 (실제 응답으로 검증됨):
//   /1130000/appnGroupSttusList/appnGroupSttusListApi?presentnYear=2025
//   /1130000/appnGroupAffiList/appnGroupAffiListApi?presentnYear=2025&unityGrupCode=K1000032

// 지정년도(YYYY): 매년 5월 1일 갱신. 5월 이전이면 전년도 기준.
function getDefaultDesignationYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() + 1 >= 5 ? `${y}` : `${y - 1}`;
}

// XML 태그 값 모두 추출 (CDATA 포함)
function extractXmlField(xmlText, tagName) {
    const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'g');
    const out = [];
    let m;
    while ((m = pattern.exec(xmlText)) !== null) {
        const v = m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        if (v) out.push(v);
    }
    return out;
}

async function fetchXml(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} - ${url.split('?')[0]}`);
    return await res.text();
}

// 사용자가 .env에 base URL만 넣었을 수도 있어 operation suffix 자동 부여
function ensureOperationSuffix(baseUrl, operationName) {
    if (!baseUrl) return baseUrl;
    return baseUrl.endsWith(`/${operationName}`) ? baseUrl : `${baseUrl.replace(/\/$/, '')}/${operationName}`;
}

async function loadConglomerateSet() {
    if (cache.conglomerateSet && Date.now() - cache.conglomerateSetAt < TWENTY_FOUR_HOURS) {
        return cache.conglomerateSet;
    }

    const apiKey = process.env.PUBLIC_DATA_API_KEY;
    const groupListBase = process.env.FTC_GROUP_LIST_API_URL;
    const groupMemberBase = process.env.FTC_GROUP_MEMBER_API_URL;
    if (!apiKey || !groupListBase || !groupMemberBase) {
        logger.warn('[Conglomerate:FTC] PUBLIC_DATA_API_KEY / FTC_GROUP_LIST_API_URL / FTC_GROUP_MEMBER_API_URL 중 누락, 빈 Set 반환');
        cache.conglomerateSet = new Set();
        cache.conglomerateSetAt = Date.now();
        return cache.conglomerateSet;
    }

    const presentnYear = process.env.FTC_DESIGNATION_YEAR || getDefaultDesignationYear();
    const groupListUrl = ensureOperationSuffix(groupListBase, 'appnGroupSttusListApi');
    const groupMemberUrl = ensureOperationSuffix(groupMemberBase, 'appnGroupAffiListApi');
    // PUBLIC_DATA_API_KEY는 "Encoding" 인증키(이미 URL-encoded) → 추가 인코딩 없이 그대로 사용
    const encKey = apiKey;

    try {
        // ① 그룹 목록 조회 — unityGrupCode 추출 (페이징 — 200/페이지로 1페이지면 충분, ~92개)
        const listUrl = `${groupListUrl}?serviceKey=${encKey}&pageNo=1&numOfRows=200&presentnYear=${presentnYear}`;
        const listXml = await fetchXml(listUrl);
        const groupCodes = [...new Set(extractXmlField(listXml, 'unityGrupCode'))];
        // 그룹명/대표회사도 보조 등록: "삼성"·"삼성전자(주)" 같은 단독 검색에도 '대기업' 매칭
        const groupNames = extractXmlField(listXml, 'unityGrupNm');
        const repreNames = extractXmlField(listXml, 'repreCmpny');

        if (groupCodes.length === 0) {
            logger.warn(`[Conglomerate:FTC] 그룹코드 추출 실패 (presentnYear=${presentnYear}). XML 일부: ${listXml.slice(0, 400)}`);
            cache.conglomerateSet = new Set();
            cache.conglomerateSetAt = Date.now();
            return cache.conglomerateSet;
        }
        logger.info(`[Conglomerate:FTC] ${presentnYear}년 지정 기업집단 ${groupCodes.length}개`);

        // ② 각 그룹별 소속회사 조회 (entrprsNm) — 동시성 5
        const set = new Set();
        // 그룹명·대표회사도 보조 등록 (alias 확장 포함)
        for (const n of groupNames) addWithAliases(set, n);
        for (const n of repreNames) addWithAliases(set, n);
        const concurrency = 5;
        for (let i = 0; i < groupCodes.length; i += concurrency) {
            const batch = groupCodes.slice(i, i + concurrency);
            await Promise.all(batch.map(async (groupCode) => {
                try {
                    // 첫 페이지 호출 후 totalCount 확인하여 추가 페이지 필요시 더 호출
                    let pageNo = 1;
                    const perPage = 500;
                    let total = Infinity;
                    while ((pageNo - 1) * perPage < total) {
                        const memberUrl = `${groupMemberUrl}?serviceKey=${encKey}&pageNo=${pageNo}&numOfRows=${perPage}&presentnYear=${presentnYear}&unityGrupCode=${groupCode}`;
                        const xml = await fetchXml(memberUrl);
                        if (pageNo === 1) {
                            const tc = extractXmlField(xml, 'totalCount')[0];
                            total = tc ? parseInt(tc, 10) : 0;
                        }
                        const names = extractXmlField(xml, 'entrprsNm');
                        for (const n of names) addWithAliases(set, n);
                        if (names.length === 0) break;
                        pageNo++;
                    }
                } catch (err) {
                    logger.warn(`[Conglomerate:FTC] unityGrupCode=${groupCode} 소속회사 조회 실패: ${err.message}`);
                }
            }));
        }

        logger.info(`[Conglomerate:FTC] ${presentnYear}년 대규모기업집단 소속회사 ${set.size}건 로드`);
        cache.conglomerateSet = set;
        cache.conglomerateSetAt = Date.now();
        return cache.conglomerateSet;
    } catch (err) {
        logger.error(`[Conglomerate:FTC] 로드 실패: ${err.message}`);
        cache.conglomerateSet = cache.conglomerateSet || new Set();
        return cache.conglomerateSet;
    }
}

// ─── 3) 분류 진입점 ─────────────────────────────────────────
/**
 * 회사명으로 compType 분류. 매칭 실패 시 null 반환 (호출측에서 default 사용).
 * @param {string} compName
 * @returns {Promise<'대기업' | '중견기업' | null>}
 */
async function classifyCompType(compName) {
    const norm = normalizeName(compName);
    if (!norm) return null;
    // 사용자 입력도 한↔영 alias로 확장하여 양쪽 매칭 시도
    const aliases = expandAliases(norm);

    // 1순위: 공정위 대규모기업집단
    const conglomerateSet = await loadConglomerateSet();
    for (const a of aliases) {
        if (conglomerateSet.has(a)) return '대기업';
    }

    // 2순위: OpenDart 상장사
    const listedMap = await loadListedMap();
    for (const a of aliases) {
        if (listedMap.has(a)) return '중견기업';
    }

    return null;
}

// ─── 캐시 워밍 (서버 시작 시 호출 권장) ────────────────────
async function warmCache() {
    logger.info('[Conglomerate] 캐시 워밍 시작');
    await Promise.all([loadListedMap(), loadConglomerateSet()]);
    logger.info('[Conglomerate] 캐시 워밍 완료');
}

module.exports = {
    classifyCompType,
    normalizeName,
    loadListedMap,
    loadConglomerateSet,
    warmCache,
};
