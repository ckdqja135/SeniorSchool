/**
 * 크롤러 키워드 AI 증강 서비스
 * Gemini API를 활용해 주 1회 신규 검색 키워드를 생성하고 DB에 저장
 */

const { CrawlerKeyword, RestaurantInfo } = require('../model/index');
const { fn, col } = require('sequelize');
const logger = require('../utils/logger');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const VALID_REGIONS = ['서울', '부산', '대구', '인천', '대전', '광주', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

// ─── DB 현황 조회 ─────────────────────────────────────────────
async function getDBStats() {
    const [regionStats, typeStats, totalCount] = await Promise.all([
        RestaurantInfo.findAll({
            where: { restaurantStatus: 1 },
            attributes: [
                'restaurantLocation',
                [fn('COUNT', col('restaurantIdx')), 'count'],
            ],
            group: ['restaurantLocation'],
            order: [[fn('COUNT', col('restaurantIdx')), 'DESC']],
            limit: 20,
            raw: true,
        }),
        RestaurantInfo.findAll({
            where: { restaurantStatus: 1 },
            attributes: [
                'restaurantType',
                [fn('COUNT', col('restaurantIdx')), 'count'],
            ],
            group: ['restaurantType'],
            order: [[fn('COUNT', col('restaurantIdx')), 'DESC']],
            limit: 20,
            raw: true,
        }),
        RestaurantInfo.count({ where: { restaurantStatus: 1 } }),
    ]);

    return { regionStats, typeStats, totalCount };
}

// ─── Gemini API 키워드 생성 ───────────────────────────────────
async function generateKeywordsWithGemini(dbStats) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.warn('[CrawlerKeyword] GEMINI_API_KEY 미설정, 기본 키워드 사용');
        return getDefaultKeywords();
    }

    const { regionStats, typeStats, totalCount } = dbStats;

    const prompt = `당신은 맛집 데이터 수집 전략가입니다.
현재 맛집 DB 현황:
- 총 식당 수: ${totalCount}개
- 지역별 분포 (상위): ${regionStats.slice(0, 10).map(r => `${r.restaurantLocation}(${r.count}개)`).join(', ')}
- 음식 종류 분포 (상위): ${typeStats.slice(0, 10).map(t => `${t.restaurantType}(${t.count}개)`).join(', ')}

위 현황을 분석해서 신규 식당 발견 확률을 높일 수 있는 검색 키워드 20개를 생성해주세요.

조건:
- DB에 적게 수집된 지역과 음식 종류 위주로 생성
- 최신 트렌드 음식(오마카세, 파인다이닝, 브런치카페, 스몰비어 등) 포함
- 구체적인 음식명(예: "마라탕", "초밥", "파스타") 위주
- 지역명 포함 키워드(예: "홍대 이자카야", "강남 오마카세") 포함
- region은 반드시 다음 중 하나: ${VALID_REGIONS.join(', ')}
- JSON 배열 형태로만 응답: [{"keyword": "키워드", "region": "지역명"}, ...]`;

    try {
        const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 1000 },
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('JSON 파싱 실패');

        const keywords = JSON.parse(jsonMatch[0]);
        logger.info(`[CrawlerKeyword] Gemini API ${keywords.length}개 키워드 생성 완료`);
        return keywords;
    } catch (err) {
        logger.error(`[CrawlerKeyword] Gemini API 실패: ${err.message}, 기본 키워드 사용`);
        return getDefaultKeywords();
    }
}

// ─── 기본 키워드 (API 키 미설정 or 실패 시 폴백) ──────────────
function getDefaultKeywords() {
    return [
        { keyword: '마라탕', region: '서울' },
        { keyword: '오마카세', region: '서울' },
        { keyword: '브런치카페', region: '서울' },
        { keyword: '이자카야', region: '부산' },
        { keyword: '파인다이닝', region: '서울' },
        { keyword: '스시', region: '서울' },
        { keyword: '양꼬치', region: '서울' },
        { keyword: '흑돼지', region: '제주' },
        { keyword: '막창', region: '대구' },
        { keyword: '냉면', region: '서울' },
        { keyword: '곱창', region: '서울' },
        { keyword: '초밥', region: '부산' },
        { keyword: '파스타', region: '서울' },
        { keyword: '스테이크', region: '서울' },
        { keyword: '샤브샤브', region: '서울' },
        { keyword: '라멘', region: '서울' },
        { keyword: '닭갈비', region: '강원' },
        { keyword: '순대국밥', region: '경기' },
        { keyword: '한정식', region: '전북' },
        { keyword: '갈치조림', region: '제주' },
    ];
}

// ─── 키워드 저장 (기존 활성 키워드 비활성화 후 신규 저장) ──────
async function saveKeywords(keywords) {
    if (!keywords || keywords.length === 0) return 0;

    await CrawlerKeyword.update({ isActive: 0 }, { where: { isActive: 1 } });

    const validKeywords = keywords
        .filter(k => k.keyword && VALID_REGIONS.includes(k.region))
        .map(k => ({
            keyword: k.keyword.slice(0, 100),
            region: k.region.slice(0, 50),
            usedCount: 0,
            discoveryCount: 0,
            isActive: 1,
        }));

    await CrawlerKeyword.bulkCreate(validKeywords);
    logger.info(`[CrawlerKeyword] ${validKeywords.length}개 키워드 저장 완료`);
    return validKeywords.length;
}

// ─── 활성 키워드 조회 ─────────────────────────────────────────
async function getActiveKeywords() {
    return await CrawlerKeyword.findAll({
        where: { isActive: 1 },
        order: [['discoveryCount', 'DESC']],
        raw: true,
    });
}

// ─── 키워드 사용 결과 업데이트 ────────────────────────────────
async function updateDiscoveryCount(keywordIdx, discoveryCount) {
    await CrawlerKeyword.increment(
        { usedCount: 1, discoveryCount },
        { where: { keywordIdx } }
    );
}

module.exports = {
    getDBStats,
    generateKeywordsWithGemini,
    saveKeywords,
    getActiveKeywords,
    updateDiscoveryCount,
    getDefaultKeywords,
};
