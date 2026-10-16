// Backend/service/admin/pageViewService.js의 Prisma 포팅.
// 통계 3종(경로별/레퍼러별/일별)은 GROUP BY 집계라 raw SQL + serializeRows(COUNT BIGINT→문자열;
//   원본은 parseInt 없이 raw 반환이라 count가 문자열이다). 최근 로그는 Prisma findMany/count.
// pvIdx BIGINT → 전역 replacer 문자열화. 테이블은 page_views, createdAt 컬럼(@map 없음).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { serializeRows } from '../../../common/utils/serialize-row.util';

const EXCLUDE_IPS = ['::1', '127.0.0.1'];

/** 방문 기록 보관 기간(일). 접속 IP 가 담긴 개인정보라 이 기간이 지나면 지운다 (개인정보보호법 제21조 파기) */
export const PAGE_VIEW_RETENTION_DAYS = 90;
/** 한 번에 지우는 행 수 — 큰 DELETE 한 방으로 테이블을 오래 잠그지 않게 나눠 지운다 */
const PURGE_CHUNK = 5000;

@Injectable()
export class AdminPageViewService {
    constructor(private readonly prisma: PrismaService) {}

    // 방문 기록 저장 (공개)
    async trackPageView(input: { path: string; ip: string | null; userAgent: string | null; referer: string | null }) {
        await this.prisma.pageView.create({
            data: {
                pvPath: input.path,
                pvIp: input.ip || null,
                pvUserAgent: input.userAgent || null,
                pvReferer: input.referer || null,
            },
        });
    }

    // 날짜 범위 조건을 SQL에 추가 (원본과 동일: endDate는 그날 23:59:59.999까지)
    private appendDateRange(sql: string, params: any[], startDate?: string, endDate?: string): string {
        if (startDate) { sql += ' AND createdAt >= ?'; params.push(new Date(startDate)); }
        if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); sql += ' AND createdAt <= ?'; params.push(end); }
        return sql;
    }

    // 경로별 방문 횟수 통계
    async getPathStats({ startDate, endDate, limit = 20 }: any) {
        let sql = "SELECT pvPath, COUNT(pvIdx) AS count FROM page_views WHERE pvIp NOT IN ('::1','127.0.0.1')";
        const params: any[] = [];
        sql = this.appendDateRange(sql, params, startDate, endDate);
        sql += ' GROUP BY pvPath ORDER BY count DESC LIMIT ?';
        params.push(parseInt(limit));
        return serializeRows(await this.prisma.$queryRawUnsafe<any[]>(sql, ...params));
    }

    // Referer별 방문 횟수 통계
    async getRefererStats({ startDate, endDate, limit = 20 }: any) {
        let sql = "SELECT pvReferer, COUNT(pvIdx) AS count FROM page_views WHERE pvReferer IS NOT NULL AND pvReferer != '' AND pvReferer NOT LIKE 'http://localhost%'";
        const params: any[] = [];
        sql = this.appendDateRange(sql, params, startDate, endDate);
        sql += ' GROUP BY pvReferer ORDER BY count DESC LIMIT ?';
        params.push(parseInt(limit));
        return serializeRows(await this.prisma.$queryRawUnsafe<any[]>(sql, ...params));
    }

    // 일별 방문 수 (기본 최근 30일)
    async getDailyStats({ startDate, endDate }: any) {
        // DATE()는 Prisma가 Date 객체로 돌려 JSON에서 ISO 문자열이 된다(원본 Sequelize는 'YYYY-MM-DD' 문자열). 패리티 위해 문자열로 포맷
        let sql = "SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS date, COUNT(pvIdx) AS count FROM page_views WHERE pvIp NOT IN ('::1','127.0.0.1')";
        const params: any[] = [];
        if (startDate || endDate) {
            sql = this.appendDateRange(sql, params, startDate, endDate);
        } else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            sql += ' AND createdAt >= ?';
            params.push(thirtyDaysAgo);
        }
        // only_full_group_by: SELECT 와 같은 식으로 묶어야 한다 (DATE() 와 DATE_FORMAT() 은 다른 식으로 취급)
        sql += " GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d') ORDER BY DATE_FORMAT(createdAt, '%Y-%m-%d') ASC";
        return serializeRows(await this.prisma.$queryRawUnsafe<any[]>(sql, ...params));
    }

    /**
     * 보관 기간이 지난 방문 기록 삭제. 지운 행 수를 돌려준다.
     * createdAt 인덱스가 없어도 빠르게 돌도록 기본키 순서로 지운다 — 오래된 행은 pvIdx 앞쪽에 몰려 있어
     * 각 묶음이 테이블 앞부분만 훑고 끝난다.
     */
    async purgeOlderThan(days = PAGE_VIEW_RETENTION_DAYS): Promise<number> {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        let total = 0;
        for (;;) {
            const n = await this.prisma.$executeRawUnsafe(
                'DELETE FROM page_views WHERE createdAt < ? ORDER BY pvIdx LIMIT ?',
                cutoff,
                PURGE_CHUNK,
            );
            total += n;
            if (n < PURGE_CHUNK) break;
        }
        return total;
    }

    // 최근 방문 로그 (페이지네이션)
    async getRecentLogs({ page = 1, rowsPerPage = 30, path, startDate, endDate, order = 'DESC' }: any) {
        const where: Record<string, any> = { pvIp: { notIn: EXCLUDE_IPS } };
        if (path) where.pvPath = { contains: `${path}` };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); where.createdAt.lte = end; }
        }

        const rpp = parseInt(rowsPerPage);
        const pg = parseInt(page);
        const offset = (pg - 1) * rpp;

        const count = await this.prisma.pageView.count({ where });
        const rows = await this.prisma.pageView.findMany({
            where,
            orderBy: { createdAt: order === 'ASC' ? 'asc' : 'desc' },
            take: rpp,
            skip: offset,
        });

        return {
            totalCount: count,
            totalPages: Math.ceil(count / rpp),
            currentPage: pg,
            data: rows,
        };
    }
}
