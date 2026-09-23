/**
 * 크롤러 키워드 AI 증강 서비스
 * Gemini API를 활용해 주 1회 신규 검색 키워드를 생성하고 DB에 저장
 *
 * Backend/service/crawlerKeywordService.js의 1:1 포팅.
 *  - Gemini 호출은 원본과 동일하게 전역 fetch(Node 18+) + AbortSignal.timeout 사용(별도 SDK 미사용).
 *  - Sequelize 모델 접근(CrawlerKeyword/RestaurantInfo)은 PrismaService로 치환.
 *    · getDBStats 의 그룹 집계(findAll + fn('COUNT')) → $queryRawUnsafe 로 재현(별칭 count).
 *    · saveKeywords: update(isActive) + bulkCreate → updateMany + createMany.
 *    · updateDiscoveryCount: increment → update data { increment }.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const VALID_REGIONS = ['서울', '부산', '대구', '인천', '대전', '광주', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

@Injectable()
export class CrawlerKeywordService {
    constructor(private readonly prisma: PrismaService) {}

    // ─── DB 현황 조회 ─────────────────────────────────────────────
    async getDBStats(): Promise<any> {
        const [regionStats, typeStats, totalCount] = await Promise.all([
            this.prisma.$queryRawUnsafe<any[]>(
                'SELECT restaurantLocation, COUNT(restaurantIdx) AS count FROM tb_restaurant_info WHERE restaurantStatus = 1 GROUP BY restaurantLocation ORDER BY COUNT(restaurantIdx) DESC LIMIT 20'
            ).then(rows => rows.map(r => ({ restaurantLocation: r.restaurantLocation, count: Number(r.count) }))),
            this.prisma.$queryRawUnsafe<any[]>(
                'SELECT restaurantType, COUNT(restaurantIdx) AS count FROM tb_restaurant_info WHERE restaurantStatus = 1 GROUP BY restaurantType ORDER BY COUNT(restaurantIdx) DESC LIMIT 20'
            ).then(rows => rows.map(r => ({ restaurantType: r.restaurantType, count: Number(r.count) }))),
            this.prisma.restaurantInfo.count({ where: { restaurantStatus: 1 } }),
        ]);

        return { regionStats, typeStats, totalCount };
    }

    // ─── Gemini API 키워드 생성 ───────────────────────────────────
    async generateKeywordsWithGemini(dbStats: any): Promise<any[]> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            logger.warn('[CrawlerKeyword] GEMINI_API_KEY 미설정, 기본 키워드 사용');
            return this.getDefaultKeywords();
        }

        const { regionStats, typeStats, totalCount } = dbStats;

        const prompt = `당신은 맛집 데이터 수집 전략가입니다.
현재 맛집 DB 현황:
- 총 식당 수: ${totalCount}개
- 지역별 분포 (상위): ${regionStats.slice(0, 10).map((r: any) => `${r.restaurantLocation}(${r.count}개)`).join(', ')}
- 음식 종류 분포 (상위): ${typeStats.slice(0, 10).map((t: any) => `${t.restaurantType}(${t.count}개)`).join(', ')}

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
            const data: any = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('JSON 파싱 실패');

            const keywords = JSON.parse(jsonMatch[0]);
            logger.info(`[CrawlerKeyword] Gemini API ${keywords.length}개 키워드 생성 완료`);
            return keywords;
        } catch (err) {
            logger.error(`[CrawlerKeyword] Gemini API 실패: ${err.message}, 기본 키워드 사용`);
            return this.getDefaultKeywords();
        }
    }

    // ─── 기본 키워드 (API 키 미설정 or 실패 시 폴백) ──────────────
    getDefaultKeywords(): any[] {
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
    async saveKeywords(keywords: any[]): Promise<number> {
        if (!keywords || keywords.length === 0) return 0;

        await this.prisma.crawlerKeyword.updateMany({ where: { isActive: 1 }, data: { isActive: 0 } });

        const validKeywords = keywords
            .filter(k => k.keyword && VALID_REGIONS.includes(k.region))
            .map(k => ({
                keyword: k.keyword.slice(0, 100),
                region: k.region.slice(0, 50),
                usedCount: 0,
                discoveryCount: 0,
                isActive: 1,
            }));

        await this.prisma.crawlerKeyword.createMany({ data: validKeywords });
        logger.info(`[CrawlerKeyword] ${validKeywords.length}개 키워드 저장 완료`);
        return validKeywords.length;
    }

    // ─── 활성 키워드 조회 ─────────────────────────────────────────
    async getActiveKeywords(): Promise<any[]> {
        return await this.prisma.crawlerKeyword.findMany({
            where: { isActive: 1 },
            orderBy: { discoveryCount: 'desc' },
        });
    }

    // ─── 키워드 사용 결과 업데이트 ────────────────────────────────
    async updateDiscoveryCount(keywordIdx: any, discoveryCount: number): Promise<void> {
        await this.prisma.crawlerKeyword.updateMany({
            where: { keywordIdx },
            data: {
                usedCount: { increment: 1 },
                discoveryCount: { increment: discoveryCount },
            },
        });
    }
}
