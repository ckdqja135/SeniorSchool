// Backend/service/admin/dashboardService.js의 Prisma 포팅.
// 세 엔드포인트 모두 대형 raw SQL(UNION ALL 집계) → $queryRawUnsafe 로 원본 SQL을 그대로 실행.
// 직렬화: overview는 원본이 parseInt → number, monthly/activities는 원본이 raw 반환이라
//   COUNT/SUM(BIGINT)이 bigNumberStrings로 문자열 → serializeRows로 동일하게 문자열화.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { serializeRows } from '../../../common/utils/serialize-row.util';
import { logger } from '../../../logger/winston.logger';

@Injectable()
export class AdminDashboardService {
    constructor(private readonly prisma: PrismaService) {}

    // 대시보드 개요 (총 게시글/업체/신고/이번주 활동 — 전부 number)
    async getDashboardOverview() {
        try {
            const totalPostsQuery = `
                SELECT
                    (SELECT COUNT(*) FROM tb_freeboard WHERE isDeleted = 0) +
                    (SELECT COUNT(*) FROM tb_church_board) +
                    (SELECT COUNT(*) FROM tb_comp_board WHERE isDeleted = 0) +
                    (SELECT COUNT(*) FROM tb_outsource_board) +
                    (SELECT COUNT(*) FROM tb_restaurant_board) +
                    (SELECT COUNT(*) FROM tb_univboard) AS totalPosts
            `;

            const totalCompaniesQuery = `
                SELECT
                    (SELECT COUNT(*) FROM tb_church_info WHERE churchStatus = 1) +
                    (SELECT COUNT(*) FROM tb_comp_info WHERE compStatus = 1) +
                    (SELECT COUNT(*) FROM tb_outsource_info WHERE outsourceStatus = 1) +
                    (SELECT COUNT(*) FROM tb_restaurant_info WHERE restaurantStatus = 1) +
                    (SELECT COUNT(*) FROM tb_universityinfo WHERE univStatus = 1) AS totalCompanies
            `;

            const reportedPostsQuery = `
                SELECT COUNT(*) AS reportedPosts
                FROM tb_report_board
                WHERE reportStatus = 'pending'
            `;

            const thisWeekActivityQuery = `
                SELECT
                    (
                        (SELECT COUNT(*) FROM tb_freeboard
                         WHERE boardRegDate >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                         AND isDeleted = 0) +
                        (SELECT COUNT(*) FROM tb_church_board
                         WHERE STR_TO_DATE(boardRegDate, '%Y-%m-%d') >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) +
                        (SELECT COUNT(*) FROM tb_comp_board
                         WHERE STR_TO_DATE(boardRegDate, '%Y-%m-%d') >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                         AND isDeleted = 0) +
                        (SELECT COUNT(*) FROM tb_outsource_board
                         WHERE STR_TO_DATE(boardRegDate, '%Y-%m-%d') >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) +
                        (SELECT COUNT(*) FROM tb_restaurant_board
                         WHERE STR_TO_DATE(boardRegDate, '%Y-%m-%d') >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) +
                        (SELECT COUNT(*) FROM tb_univboard
                         WHERE STR_TO_DATE(boardRegDate, '%Y-%m-%d') >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY))
                    ) +
                    (
                        (SELECT COUNT(*) FROM tb_church_info
                         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) +
                        (SELECT COUNT(*) FROM tb_comp_info
                         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) +
                        (SELECT COUNT(*) FROM tb_outsource_info
                         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) +
                        (SELECT COUNT(*) FROM tb_restaurant_info
                         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) +
                        (SELECT COUNT(*) FROM tb_universityinfo
                         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY))
                    ) AS thisWeekActivity
            `;

            const [totalPostsResult, totalCompaniesResult, reportedPostsResult, thisWeekActivityResult] = await Promise.all([
                this.prisma.$queryRawUnsafe<any[]>(totalPostsQuery),
                this.prisma.$queryRawUnsafe<any[]>(totalCompaniesQuery),
                this.prisma.$queryRawUnsafe<any[]>(reportedPostsQuery),
                this.prisma.$queryRawUnsafe<any[]>(thisWeekActivityQuery),
            ]);

            const result = {
                totalPosts: Number(totalPostsResult[0].totalPosts) || 0,
                totalCompanies: Number(totalCompaniesResult[0].totalCompanies) || 0,
                reportedPosts: Number(reportedPostsResult[0].reportedPosts) || 0,
                thisWeekActivity: Number(thisWeekActivityResult[0].thisWeekActivity) || 0,
            };

            logger.info(`[getDashboardOverview] Dashboard overview retrieved successfully`);
            return result;
        } catch (error) {
            logger.error(`[getDashboardOverview] Error: ${error.message}`);
            throw error;
        }
    }

    // 월별 통계 (최근 12개월 게시글/업체 등록 수) — postCount/companyCount는 문자열
    async getMonthlyStats() {
        try {
            const query = `
                SELECT
                    DATE_FORMAT(months.month_date, '%Y-%m') AS month,
                    COALESCE(posts.post_count, 0) AS postCount,
                    COALESCE(companies.company_count, 0) AS companyCount
                FROM (
                    SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m-01') AS month_date
                    FROM (
                        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
                        UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
                    ) numbers
                ) months
                LEFT JOIN (
                    SELECT
                        DATE_FORMAT(reg_date, '%Y-%m-01') AS month_date,
                        COUNT(*) AS post_count
                    FROM (
                        SELECT boardRegDate AS reg_date FROM tb_freeboard WHERE isDeleted = 0 AND boardRegDate IS NOT NULL
                        UNION ALL
                        SELECT STR_TO_DATE(boardRegDate, '%Y-%m-%d') FROM tb_church_board WHERE boardRegDate IS NOT NULL
                        UNION ALL
                        SELECT STR_TO_DATE(boardRegDate, '%Y-%m-%d') FROM tb_comp_board WHERE isDeleted = 0 AND boardRegDate IS NOT NULL
                        UNION ALL
                        SELECT STR_TO_DATE(boardRegDate, '%Y-%m-%d') FROM tb_outsource_board WHERE boardRegDate IS NOT NULL
                        UNION ALL
                        SELECT STR_TO_DATE(boardRegDate, '%Y-%m-%d') FROM tb_restaurant_board WHERE boardRegDate IS NOT NULL
                        UNION ALL
                        SELECT STR_TO_DATE(boardRegDate, '%Y-%m-%d') FROM tb_univboard WHERE boardRegDate IS NOT NULL
                    ) all_posts
                    WHERE reg_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                    GROUP BY DATE_FORMAT(reg_date, '%Y-%m-01')
                ) posts ON months.month_date = posts.month_date
                LEFT JOIN (
                    SELECT
                        DATE_FORMAT(created_at, '%Y-%m-01') AS month_date,
                        COUNT(*) AS company_count
                    FROM (
                        SELECT created_at FROM tb_church_info WHERE created_at IS NOT NULL
                        UNION ALL
                        SELECT created_at FROM tb_comp_info WHERE created_at IS NOT NULL
                        UNION ALL
                        SELECT created_at FROM tb_outsource_info WHERE created_at IS NOT NULL
                        UNION ALL
                        SELECT created_at FROM tb_restaurant_info WHERE created_at IS NOT NULL
                        UNION ALL
                        SELECT created_at FROM tb_universityinfo WHERE created_at IS NOT NULL
                    ) all_companies
                    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                    GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
                ) companies ON months.month_date = companies.month_date
                ORDER BY months.month_date DESC
            `;

            const results = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(query));
            logger.info(`[getMonthlyStats] Monthly statistics retrieved: ${results.length} months`);
            return results;
        } catch (error) {
            logger.error(`[getMonthlyStats] Error: ${error.message}`);
            throw error;
        }
    }

    // 최근 활동 (업체 추가/수정 + 게시글 작성/수정) — id는 문자열, timestamp는 ISO
    async getRecentActivities(limit = 20) {
        try {
            const query = `
                SELECT * FROM (
                    SELECT churchIdx AS id, CONVERT('church' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(churchName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, created_at AS timestamp
                    FROM tb_church_info WHERE created_at IS NOT NULL
                    UNION ALL
                    SELECT churchIdx AS id, CONVERT('church' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(churchName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, updated_at AS timestamp
                    FROM tb_church_info WHERE updated_at IS NOT NULL AND updated_at > created_at
                    UNION ALL
                    SELECT compIdx AS id, CONVERT('company' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(compName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, created_at AS timestamp
                    FROM tb_comp_info WHERE created_at IS NOT NULL
                    UNION ALL
                    SELECT compIdx AS id, CONVERT('company' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(compName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, updated_at AS timestamp
                    FROM tb_comp_info WHERE updated_at IS NOT NULL AND updated_at > created_at
                    UNION ALL
                    SELECT outsourceIdx AS id, CONVERT('outsource' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(outsourceName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, created_at AS timestamp
                    FROM tb_outsource_info WHERE created_at IS NOT NULL
                    UNION ALL
                    SELECT outsourceIdx AS id, CONVERT('outsource' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(outsourceName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, updated_at AS timestamp
                    FROM tb_outsource_info WHERE updated_at IS NOT NULL AND updated_at > created_at
                    UNION ALL
                    SELECT restaurantIdx AS id, CONVERT('restaurant' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(restaurantName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, created_at AS timestamp
                    FROM tb_restaurant_info WHERE created_at IS NOT NULL
                    UNION ALL
                    SELECT restaurantIdx AS id, CONVERT('restaurant' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(restaurantName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, updated_at AS timestamp
                    FROM tb_restaurant_info WHERE updated_at IS NOT NULL AND updated_at > created_at
                    UNION ALL
                    SELECT univIdx AS id, CONVERT('university' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(univName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, created_at AS timestamp
                    FROM tb_universityinfo WHERE created_at IS NOT NULL
                    UNION ALL
                    SELECT univIdx AS id, CONVERT('university' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(univName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, updated_at AS timestamp
                    FROM tb_universityinfo WHERE updated_at IS NOT NULL AND updated_at > created_at
                    UNION ALL
                    SELECT b.boardIdx AS id, CONVERT('freeboard_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, b.boardRegDate AS timestamp
                    FROM tb_freeboard b WHERE b.boardRegDate IS NOT NULL AND b.isDeleted = 0
                    UNION ALL
                    SELECT b.boardIdx AS id, CONVERT('freeboard_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        NULL AS entityName, b.boardModDate AS timestamp
                    FROM tb_freeboard b WHERE b.boardModDate IS NOT NULL AND b.isDeleted = 0
                    UNION ALL
                    SELECT b.boardIdx AS id, CONVERT('church_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        CONVERT(e.churchName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                        STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                    FROM tb_church_board b LEFT JOIN tb_church_info e ON b.churchIdx = e.churchIdx WHERE b.boardRegDate IS NOT NULL
                    UNION ALL
                    SELECT b.boardIdx AS id, CONVERT('company_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        CONVERT(e.compName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                        STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                    FROM tb_comp_board b LEFT JOIN tb_comp_info e ON b.compIdx = e.compIdx WHERE b.boardRegDate IS NOT NULL AND b.isDeleted = 0
                    UNION ALL
                    SELECT b.boardIdx AS id, CONVERT('outsource_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        CONVERT(e.outsourceName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                        STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                    FROM tb_outsource_board b LEFT JOIN tb_outsource_info e ON b.outsourceIdx = e.outsourceIdx WHERE b.boardRegDate IS NOT NULL
                    UNION ALL
                    SELECT b.boardIdx AS id, CONVERT('restaurant_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        CONVERT(e.restaurantName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                        STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                    FROM tb_restaurant_board b LEFT JOIN tb_restaurant_info e ON b.restaurantIdx = e.restaurantIdx WHERE b.boardRegDate IS NOT NULL
                    UNION ALL
                    SELECT b.boardIdx AS id, CONVERT('university_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                        CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                        CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                        CONVERT(e.univName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                        STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                    FROM tb_univboard b LEFT JOIN tb_universityinfo e ON b.univIdx = e.univIdx WHERE b.boardRegDate IS NOT NULL
                ) activities
                WHERE timestamp IS NOT NULL
                ORDER BY timestamp DESC
                LIMIT ?
            `;

            const results = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(query, limit));
            logger.info(`[getRecentActivities] Recent activities retrieved: ${results.length} items`);
            return results;
        } catch (error) {
            logger.error(`[getRecentActivities] Error: ${error.message}`);
            throw error;
        }
    }
}
