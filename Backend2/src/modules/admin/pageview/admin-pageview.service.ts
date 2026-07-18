// Backend/service/admin/pageViewService.js의 Prisma 포팅.
// 통계 3종(경로별/레퍼러별/일별)은 GROUP BY 집계라 raw SQL + serializeRows(COUNT BIGINT→문자열;
//   원본은 parseInt 없이 raw 반환이라 count가 문자열이다). 최근 로그는 Prisma findMany/count.
// pvIdx BIGINT → 전역 replacer 문자열화. 테이블은 page_views, createdAt 컬럼(@map 없음).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { serializeRows } from '../../../common/utils/serialize-row.util';

const EXCLUDE_IPS = ['::1', '127.0.0.1'];

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
        let sql = "SELECT DATE(createdAt) AS date, COUNT(pvIdx) AS count FROM page_views WHERE pvIp NOT IN ('::1','127.0.0.1')";
        const params: any[] = [];
        if (startDate || endDate) {
            sql = this.appendDateRange(sql, params, startDate, endDate);
        } else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            sql += ' AND createdAt >= ?';
            params.push(thirtyDaysAgo);
        }
        sql += ' GROUP BY DATE(createdAt) ORDER BY DATE(createdAt) ASC';
        return serializeRows(await this.prisma.$queryRawUnsafe<any[]>(sql, ...params));
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
