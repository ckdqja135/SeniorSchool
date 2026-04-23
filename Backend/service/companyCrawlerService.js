/**
 * 회사 데이터 통합 크롤러 서비스
 * 네이버(검색/로컬), 카카오(Local), 공공데이터포털에서 기업 기본 정보를 수집하여 DB에 저장
 * OpenDart(상장사) 중심인 companyDataScheduler를 보완 — 비상장/중소기업 커버리지 확장
 */

const axios = require('axios');
const { CompInfo } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// ─── 공통 매핑 함수 ─────────────────────────────────────────
function normalizeToCompany(raw) {
    const addr = raw.addr || '';
    // compLocate = 시/도 (최대 45자)
    const locate = (raw.locate || addr.split(' ')[0] || '미정').slice(0, 45);
    // compLotAddr 는 스키마상 20자! (지번 주소) — 시/구 요약본만 저장
    const lotAddr = (raw.lotAddr || addr.split(' ').slice(0, 2).join(' ') || '미정').slice(0, 20);
    return {
        compName: (raw.name || '').slice(0, 60),
        compLocate: locate,
        compType: (raw.type || '일반').slice(0, 45),
        compEstablish: (raw.established || '미정').slice(0, 45),
        compCEO: (raw.ceo || '미정').slice(0, 45),
        compIndustry: (raw.industry || '기타').slice(0, 45),
        compLateX: raw.lat || 0,
        compLateY: raw.lng || 0,
        compURL: (raw.url || '').slice(0, 200),
        compLotAddr: lotAddr,
        compAddr: addr.slice(0, 200),
        compMapIMG: null,
        _source: raw.source,
        _sourceId: raw.sourceId || null,
    };
}

// ─── 지역별 주요 거점 좌표 (회사 밀집지) ──────────────────────
const REGION_COORDS = {
    '서울': [
        { name: '강남/역삼/삼성', lat: 37.4979, lng: 127.0276 },
        { name: '여의도', lat: 37.5247, lng: 126.9265 },
        { name: '판교(성남)', lat: 37.3595, lng: 127.1132 },
        { name: '마포/상암', lat: 37.5715, lng: 126.8893 },
        { name: '종로/중구', lat: 37.5704, lng: 126.9832 },
    ],
    '부산': [
        { name: '센텀시티', lat: 35.1690, lng: 129.1300 },
        { name: '서면', lat: 35.1580, lng: 129.0596 },
    ],
    '대구': [{ name: '동성로', lat: 35.8682, lng: 128.5964 }],
    '인천': [
        { name: '송도', lat: 37.3818, lng: 126.6568 },
        { name: '부평', lat: 37.5076, lng: 126.7219 },
    ],
    '대전': [{ name: '둔산/대덕', lat: 36.3504, lng: 127.3845 }],
    '광주': [{ name: '상무지구', lat: 35.1468, lng: 126.8416 }],
    '울산': [{ name: '삼산동', lat: 35.5384, lng: 129.3225 }],
    '세종': [{ name: '세종시', lat: 36.4800, lng: 127.2550 }],
    '경기': [
        { name: '판교', lat: 37.3946, lng: 127.1095 },
        { name: '수원/영통', lat: 37.2636, lng: 127.0286 },
        { name: '동탄', lat: 37.2015, lng: 127.0760 },
    ],
    '강원': [{ name: '춘천', lat: 37.8813, lng: 127.7298 }],
    '충북': [{ name: '오송/청주', lat: 36.6358, lng: 127.4913 }],
    '충남': [{ name: '천안/아산', lat: 36.8151, lng: 127.1139 }],
    '전북': [{ name: '전주', lat: 35.8242, lng: 127.1480 }],
    '전남': [{ name: '여수/광양', lat: 34.7604, lng: 127.6622 }],
    '경북': [{ name: '포항/구미', lat: 36.0190, lng: 129.3435 }],
    '경남': [{ name: '창원', lat: 35.2270, lng: 128.6811 }],
    '제주': [{ name: '제주시', lat: 33.4996, lng: 126.5312 }],
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ─── 1) 카카오 Local API (회사/기업 키워드 검색) ─────────────
async function fetchFromKakao({ query = '회사', region = '서울', count = 50, lat, lng, radius = 20000 }) {
    const key = process.env.KAKAO_REST_API_KEY;
    if (!key) {
        logger.warn('[CompCrawler:Kakao] KAKAO_REST_API_KEY 미설정, 스킵');
        return [];
    }

    const headers = { Authorization: `KakaoAK ${key}` };
    const results = [];
    const seen = new Set();

    let searchPoints;
    if (lat && lng) {
        searchPoints = [{ lat, lng }];
    } else {
        const mainRegion = region.split(' ')[0];
        const regionKey = Object.keys(REGION_COORDS).find(k => mainRegion.includes(k));
        searchPoints = regionKey
            ? [...REGION_COORDS[regionKey]].sort(() => Math.random() - 0.5)
            : [{ lat: 37.5665, lng: 126.9780 }];
    }

    const countPerPoint = Math.ceil(count / searchPoints.length);

    for (const point of searchPoints) {
        if (results.length >= count) break;

        let page = Math.floor(Math.random() * 3) + 1;
        const pointTarget = Math.min(countPerPoint, count - results.length);
        let pointCount = 0;

        while (pointCount < pointTarget && page <= 45) {
            try {
                const { data } = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
                    headers,
                    params: {
                        query,
                        x: point.lng, y: point.lat, radius,
                        page, size: 15,
                        sort: 'accuracy',
                    },
                });

                for (const d of (data.documents || [])) {
                    if (seen.has(d.id)) continue;
                    seen.add(d.id);

                    // 카테고리에서 음식점/카페/병원 등 비회사 제외
                    const catPath = (d.category_name || '').toLowerCase();
                    const exclude = ['음식점', '카페', '숙박', '병원', '약국', '학교', '학원', '관광', '종교', '주차장', '주유소'];
                    if (exclude.some(e => catPath.includes(e))) continue;

                    const typeRaw = (d.category_name || '').split(' > ');
                    results.push(normalizeToCompany({
                        name: d.place_name,
                        addr: d.road_address_name || d.address_name || '',
                        lotAddr: d.address_name || '',
                        industry: typeRaw[typeRaw.length - 1] || '기타',
                        type: '일반',
                        lat: parseFloat(d.y),
                        lng: parseFloat(d.x),
                        url: d.place_url || '',
                        source: 'kakao',
                        sourceId: `kakao_${d.id}`,
                    }));

                    pointCount++;
                    if (pointCount >= pointTarget) break;
                }

                if (data.meta?.is_end) break;
                page++;
            } catch (err) {
                logger.error(`[CompCrawler:Kakao] ${point.name || 'point'} page ${page} 에러: ${err.message}`);
                break;
            }
        }
    }

    logger.info(`[CompCrawler:Kakao] ${results.length}건 수집 완료 (거점 ${searchPoints.length}개)`);
    return results;
}

// ─── 2) 네이버 Local + Web 검색 API ─────────────────────────
async function fetchFromNaver({ query = '회사', region = '서울', count = 50 }) {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        logger.warn('[CompCrawler:Naver] NAVER_CLIENT_ID/SECRET 미설정, 스킵');
        return [];
    }

    const headers = {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
    };

    const results = [];
    const seen = new Set();
    const maxPerRequest = 5;
    let start = 1;
    const localQuery = `${region} ${query}`.trim();

    while (results.length < count && start <= 1000) {
        try {
            const { data } = await axios.get('https://openapi.naver.com/v1/search/local.json', {
                headers,
                params: { query: localQuery, display: maxPerRequest, start, sort: 'random' },
            });

            if (!data.items || data.items.length === 0) break;

            for (const item of data.items) {
                const cleanName = (item.title || '').replace(/<\/?b>/g, '');
                const rawCategory = (item.category || '').toLowerCase();

                // 회사가 아닌 카테고리 제외
                const exclude = [
                    '음식점', '카페', '제과', '술집', '주점',
                    '숙박', '호텔', '모텔', '게스트', '펜션',
                    '병원', '약국', '의원', '치과', '한의원',
                    '학교', '학원', '교육', '유치원', '어린이집',
                    '관광', '박물관', '미술관', '공원',
                    '주유소', '주차장', '세차',
                    '관공서', '우체국', '경찰', '소방', '동사무소',
                    '종교', '교회', '성당', '사찰',
                    '마트', '편의점', '백화점',
                ];
                if (exclude.some(e => rawCategory.includes(e))) continue;

                const key = `naver_${cleanName}_${item.address}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const coords = convertNaverCoords(item.mapx, item.mapy);
                const industry = (item.category || '').split('>').pop()?.trim() || '기타';

                results.push(normalizeToCompany({
                    name: cleanName,
                    addr: item.roadAddress || item.address || '',
                    lotAddr: item.address || '',
                    industry,
                    type: '일반',
                    lat: coords.lat,
                    lng: coords.lng,
                    url: item.link || '',
                    source: 'naver',
                    sourceId: key,
                }));

                if (results.length >= count) break;
            }

            start += maxPerRequest;
            if (data.total <= start) break;
        } catch (err) {
            logger.error(`[CompCrawler:Naver] start=${start} 에러: ${err.message}`);
            break;
        }
    }

    logger.info(`[CompCrawler:Naver] ${results.length}건 수집 완료`);
    return results;
}

function convertNaverCoords(mapx, mapy) {
    if (!mapx || !mapy) return { lat: 0, lng: 0 };
    return { lat: parseInt(mapy, 10) / 10000000, lng: parseInt(mapx, 10) / 10000000 };
}

// ─── 3) 공공데이터포털 (사업자 등록 정보) ───────────────────
// API 키가 없으면 빈 배열 반환 (식당 크롤러의 google 패턴과 동일)
async function fetchFromPublicData({ query = '회사', region = '서울', count = 50 }) {
    const apiKey = process.env.PUBLIC_DATA_API_KEY;
    if (!apiKey) {
        logger.warn('[CompCrawler:PublicData] PUBLIC_DATA_API_KEY 미설정, 스킵');
        return [];
    }

    // 공공데이터포털은 목록 검색 API가 없으므로 placeholder
    // 실제 운영 시: 국세청 사업자등록 진위확인, 중소벤처기업부 기업통합정보 등으로 교체
    logger.info('[CompCrawler:PublicData] API 세부 엔드포인트 미구현, placeholder 반환');
    return [];
}

// ─── 좌표 보정 (주소 → 카카오 Geocoding) ─────────────────────
async function geocodeByKakao(address) {
    const key = process.env.KAKAO_REST_API_KEY;
    if (!key || !address) return null;

    try {
        const { data } = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
            headers: { Authorization: `KakaoAK ${key}` },
            params: { query: address },
        });

        if (data.documents?.length > 0) {
            const doc = data.documents[0];
            return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
        }
    } catch (err) {
        logger.error(`[CompCrawler:Geocode] ${address} 지오코딩 실패: ${err.message}`);
    }
    return null;
}

// ─── 네이버 웹검색으로 홈페이지 URL 찾기 (enrich) ────────────
async function findHomepageByNaver(companyName) {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    try {
        const { data } = await axios.get('https://openapi.naver.com/v1/search/webkr.json', {
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            },
            params: { query: `${companyName} 공식 홈페이지`, display: 5 },
        });

        const items = data.items || [];
        for (const item of items) {
            const link = item.link || '';
            // 블로그/위키 제외, 기업 도메인으로 추정되는 링크 우선
            if (/(blog|cafe|wikipedia|namu\.wiki|tistory|brunch|post\.naver)/i.test(link)) continue;
            if (link) return link;
        }
        return null;
    } catch (err) {
        logger.error(`[CompEnrich:Naver] ${companyName} 홈페이지 검색 실패: ${err.message}`);
        return null;
    }
}

// ─── 네이버 로컬로 회사 주소/좌표 찾기 (enrich) ──────────────
async function findLocationByNaver(companyName) {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    try {
        const { data } = await axios.get('https://openapi.naver.com/v1/search/local.json', {
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            },
            params: { query: companyName, display: 1 },
        });

        const item = data.items?.[0];
        if (!item) return null;

        const normalize = (s) => s.replace(/[\s·\-()（）주식회사㈜]/g, '').toLowerCase();
        const target = normalize(companyName);
        const matched = normalize((item.title || '').replace(/<\/?b>/g, ''));
        // 이름 유사도 검증 (식당 enrich 로직과 동일한 기준)
        if (target.length >= 3 && !matched.includes(target) && !target.includes(matched)) {
            return null;
        }

        const coords = convertNaverCoords(item.mapx, item.mapy);
        const industry = (item.category || '').split('>').pop()?.trim() || null;
        return {
            addr: item.roadAddress || item.address || '',
            lat: coords.lat,
            lng: coords.lng,
            industry,
            matchedName: (item.title || '').replace(/<\/?b>/g, ''),
        };
    } catch (err) {
        logger.error(`[CompEnrich:Naver] ${companyName} 위치 검색 실패: ${err.message}`);
        return null;
    }
}

/**
 * 단일 회사 정보 enrich — 네이버 webkr(홈페이지) + 네이버 Local(주소/업종)
 */
async function enrichFromNaver(companyName) {
    const [homepage, location] = await Promise.all([
        findHomepageByNaver(companyName),
        findLocationByNaver(companyName),
    ]);

    return {
        homepage,
        addr: location?.addr || null,
        lat: location?.lat || null,
        lng: location?.lng || null,
        industry: location?.industry || null,
        matchedName: location?.matchedName || null,
    };
}

// ─── 통합 크롤링 실행 ────────────────────────────────────────
/**
 * @param {Object} options
 * @param {string[]} options.sources - ['kakao','naver','publicData']
 * @param {string} options.query - 검색 키워드 (기본: '회사')
 * @param {string} options.region - 지역 (기본: '서울')
 * @param {number} options.countPerSource - 소스당 수집 건수
 * @param {boolean} options.saveToDB - DB 저장 여부
 * @param {boolean} options.dryRun - true 이면 수집만, 저장 안 함
 */
async function crawlCompanies(options = {}) {
    const {
        sources = ['kakao', 'naver'],
        query = '회사',
        region = '서울',
        lat,
        lng,
        radius = 20000,
        countPerSource = 50,
        saveToDB = true,
        dryRun = false,
    } = options;

    logger.info(`[CompCrawler] 시작 - sources: ${sources.join(',')}, query: ${query}, region: ${region}, count/src: ${countPerSource}`);

    const allResults = [];
    const stats = {
        sources: {},
        totalFetched: 0,
        duplicateSkipped: 0,
        coordFixed: 0,
        saved: 0,
        failed: 0,
    };

    const fetchPromises = [];
    if (sources.includes('kakao')) {
        fetchPromises.push(
            fetchFromKakao({ query: `${query}`, region, ...(lat && lng ? { lat, lng } : {}), radius, count: countPerSource })
                .then(r => { stats.sources.kakao = r.length; return r; })
                .catch(e => { logger.error(`[CompCrawler] 카카오 실패: ${e.message}`); stats.sources.kakao = 0; return []; })
        );
    }
    if (sources.includes('naver')) {
        fetchPromises.push(
            fetchFromNaver({ query, region, count: countPerSource })
                .then(r => { stats.sources.naver = r.length; return r; })
                .catch(e => { logger.error(`[CompCrawler] 네이버 실패: ${e.message}`); stats.sources.naver = 0; return []; })
        );
    }
    if (sources.includes('publicData')) {
        fetchPromises.push(
            fetchFromPublicData({ query, region, count: countPerSource })
                .then(r => { stats.sources.publicData = r.length; return r; })
                .catch(e => { logger.error(`[CompCrawler] 공공데이터 실패: ${e.message}`); stats.sources.publicData = 0; return []; })
        );
    }

    const sourceResults = await Promise.all(fetchPromises);
    for (const arr of sourceResults) allResults.push(...arr);

    stats.totalFetched = allResults.length;
    logger.info(`[CompCrawler] 총 ${allResults.length}건 수집, 소스별: ${JSON.stringify(stats.sources)}`);

    // DB 기존 회사 제외 (compName 기준으로 필터)
    const names = allResults.filter(x => x.compName).map(x => x.compName);
    const existing = await CompInfo.findAll({
        where: { compName: { [Op.in]: names }, compStatus: 1 },
        attributes: ['compName', 'compAddr'],
        raw: true,
    });
    const existingSet = new Set(existing.map(r => `${r.compName}_${r.compAddr}`));
    const newResults = allResults.filter(item => !existingSet.has(`${item.compName}_${item.compAddr}`));

    stats.alreadyInDB = allResults.length - newResults.length;
    stats.duplicateSkipped = stats.alreadyInDB;
    logger.info(`[CompCrawler] DB 기존 ${stats.alreadyInDB}건 제외, 신규 ${newResults.length}건`);

    // 좌표 보정
    for (const item of newResults) {
        if ((!item.compLateX || !item.compLateY) && item.compAddr) {
            const coords = await geocodeByKakao(item.compAddr);
            if (coords) {
                item.compLateX = coords.lat;
                item.compLateY = coords.lng;
                stats.coordFixed++;
            }
        }
    }

    if (dryRun) {
        logger.info(`[CompCrawler] dryRun - 신규 ${newResults.length}건 미리보기 (좌표보정: ${stats.coordFixed}건)`);
        return { stats, data: newResults };
    }

    // NOT NULL 필수 필드 누락(좌표/이름/주소) 제외
    const bulkData = newResults
        .filter(item => item.compName && item.compLateX && item.compLateY && item.compAddr)
        .map(item => ({
            compName: item.compName,
            compLocate: item.compLocate || '미정',
            compType: item.compType || '일반',
            compEstablish: item.compEstablish || '미정',
            compCEO: item.compCEO || '미정',
            compIndustry: item.compIndustry || '기타',
            compLateX: item.compLateX,
            compLateY: item.compLateY,
            compURL: item.compURL || null,
            compLotAddr: (item.compLotAddr || '미정').slice(0, 20),
            compAddr: item.compAddr,
            compMapIMG: item.compMapIMG || null,
            compStatus: 1,
            compViewCount: 0,
        }));

    const savedList = [];
    if (saveToDB && bulkData.length > 0) {
        try {
            const result = await CompInfo.bulkCreate(bulkData, {
                updateOnDuplicate: ['compURL', 'compIndustry', 'compLateX', 'compLateY'],
            });
            stats.saved = result.length;
            result.forEach(r => savedList.push(r.compName));
        } catch (err) {
            stats.failed = bulkData.length;
            logger.error(`[CompCrawler] bulkCreate 실패: ${err.message}`);
        }
    }

    logger.info(`[CompCrawler] 완료 - 저장: ${stats.saved}, 좌표보정: ${stats.coordFixed}, 실패: ${stats.failed}`);
    return { stats, saved: savedList };
}

// ─── 소스별 상태 확인 ────────────────────────────────────────
function getAvailableSources() {
    const sources = [];
    if (process.env.KAKAO_REST_API_KEY) sources.push({ name: 'kakao', label: '카카오', ready: true });
    else sources.push({ name: 'kakao', label: '카카오', ready: false, reason: 'KAKAO_REST_API_KEY 미설정' });

    if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) sources.push({ name: 'naver', label: '네이버', ready: true });
    else sources.push({ name: 'naver', label: '네이버', ready: false, reason: 'NAVER_CLIENT_ID/SECRET 미설정' });

    if (process.env.PUBLIC_DATA_API_KEY) sources.push({ name: 'publicData', label: '공공데이터포털', ready: true, note: '엔드포인트 연결 필요' });
    else sources.push({ name: 'publicData', label: '공공데이터포털', ready: false, reason: 'PUBLIC_DATA_API_KEY 미설정' });

    return sources;
}

module.exports = {
    crawlCompanies,
    getAvailableSources,
    fetchFromKakao,
    fetchFromNaver,
    fetchFromPublicData,
    enrichFromNaver,
};
