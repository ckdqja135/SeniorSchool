const { sequelize } = require('../../model');
const logger = require('../../utils/logger');

/**
 * 대시보드 개요 통계 조회
 * 총 게시글 수, 등록된 업체 수, 신고된 게시글 수, 이번 주 활동 수
 */
exports.getDashboardOverview = async () => {
    try {
        // 1. 총 게시글 수 (모든 게시판)
        const totalPostsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM tb_freeboard WHERE isDeleted = 0) +
                (SELECT COUNT(*) FROM tb_church_board) +
                (SELECT COUNT(*) FROM tb_comp_board WHERE isDeleted = 0) +
                (SELECT COUNT(*) FROM tb_outsource_board) +
                (SELECT COUNT(*) FROM tb_restaurant_board) +
                (SELECT COUNT(*) FROM tb_univboard) AS totalPosts
        `;

        // 2. 등록된 업체 수 (모든 업체)
        const totalCompaniesQuery = `
            SELECT 
                (SELECT COUNT(*) FROM tb_church_info WHERE churchStatus = 1) +
                (SELECT COUNT(*) FROM tb_comp_info WHERE compStatus = 1) +
                (SELECT COUNT(*) FROM tb_outsource_info WHERE outsourceStatus = 1) +
                (SELECT COUNT(*) FROM tb_restaurant_info WHERE restaurantStatus = 1) +
                (SELECT COUNT(*) FROM tb_universityinfo WHERE univStatus = 1) AS totalCompanies
        `;

        // 3. 신고된 게시글 수
        const reportedPostsQuery = `
            SELECT COUNT(*) AS reportedPosts
            FROM tb_report_board
            WHERE reportStatus = 'pending'
        `;

        // 4. 이번 주 활동 수 (이번 주 게시글 + 업체 등록)
        const thisWeekActivityQuery = `
            SELECT 
                (
                    -- 이번 주 게시글
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
                    -- 이번 주 업체 등록
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

        // 병렬로 쿼리 실행
        const [totalPostsResult, totalCompaniesResult, reportedPostsResult, thisWeekActivityResult] = await Promise.all([
            sequelize.query(totalPostsQuery, { type: sequelize.QueryTypes.SELECT }),
            sequelize.query(totalCompaniesQuery, { type: sequelize.QueryTypes.SELECT }),
            sequelize.query(reportedPostsQuery, { type: sequelize.QueryTypes.SELECT }),
            sequelize.query(thisWeekActivityQuery, { type: sequelize.QueryTypes.SELECT })
        ]);

        const result = {
            totalPosts: parseInt(totalPostsResult[0].totalPosts) || 0,
            totalCompanies: parseInt(totalCompaniesResult[0].totalCompanies) || 0,
            reportedPosts: parseInt(reportedPostsResult[0].reportedPosts) || 0,
            thisWeekActivity: parseInt(thisWeekActivityResult[0].thisWeekActivity) || 0
        };

        logger.info(`[getDashboardOverview] Dashboard overview retrieved successfully`);
        return result;

    } catch (error) {
        logger.error(`[getDashboardOverview] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 월별 통계 조회
 * 최근 12개월 게시글 작성 수, 업체 등록 수
 */
exports.getMonthlyStats = async () => {
    try {
        const query = `
            SELECT 
                DATE_FORMAT(months.month_date, '%Y-%m') AS month,
                COALESCE(posts.post_count, 0) AS postCount,
                COALESCE(companies.company_count, 0) AS companyCount
            FROM (
                -- 최근 12개월 생성
                SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m-01') AS month_date
                FROM (
                    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 
                    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 
                    UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
                ) numbers
            ) months
            LEFT JOIN (
                -- 게시글 월별 집계
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
                -- 업체 월별 집계
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

        const results = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT
        });

        logger.info(`[getMonthlyStats] Monthly statistics retrieved: ${results.length} months`);
        return results;

    } catch (error) {
        logger.error(`[getMonthlyStats] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 최근 활동 조회
 * 업체 정보 업데이트, 업체 추가, 후기 게시글 작성, 업데이트
 */
exports.getRecentActivities = async (limit = 20) => {
    try {
        const query = `
            SELECT * FROM (
                -- 업체 추가 (Church)
                SELECT
                    churchIdx AS id,
                    CONVERT('church' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(churchName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    created_at AS timestamp
                FROM tb_church_info
                WHERE created_at IS NOT NULL

                UNION ALL

                -- 업체 업데이트 (Church)
                SELECT
                    churchIdx AS id,
                    CONVERT('church' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(churchName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    updated_at AS timestamp
                FROM tb_church_info
                WHERE updated_at IS NOT NULL
                AND updated_at > created_at

                UNION ALL

                -- 업체 추가 (Company)
                SELECT
                    compIdx AS id,
                    CONVERT('company' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(compName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    created_at AS timestamp
                FROM tb_comp_info
                WHERE created_at IS NOT NULL

                UNION ALL

                -- 업체 업데이트 (Company)
                SELECT
                    compIdx AS id,
                    CONVERT('company' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(compName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    updated_at AS timestamp
                FROM tb_comp_info
                WHERE updated_at IS NOT NULL
                AND updated_at > created_at

                UNION ALL

                -- 업체 추가 (Outsource)
                SELECT
                    outsourceIdx AS id,
                    CONVERT('outsource' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(outsourceName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    created_at AS timestamp
                FROM tb_outsource_info
                WHERE created_at IS NOT NULL

                UNION ALL

                -- 업체 업데이트 (Outsource)
                SELECT
                    outsourceIdx AS id,
                    CONVERT('outsource' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(outsourceName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    updated_at AS timestamp
                FROM tb_outsource_info
                WHERE updated_at IS NOT NULL
                AND updated_at > created_at

                UNION ALL

                -- 업체 추가 (Restaurant)
                SELECT
                    restaurantIdx AS id,
                    CONVERT('restaurant' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(restaurantName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    created_at AS timestamp
                FROM tb_restaurant_info
                WHERE created_at IS NOT NULL

                UNION ALL

                -- 업체 업데이트 (Restaurant)
                SELECT
                    restaurantIdx AS id,
                    CONVERT('restaurant' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(restaurantName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    updated_at AS timestamp
                FROM tb_restaurant_info
                WHERE updated_at IS NOT NULL
                AND updated_at > created_at

                UNION ALL

                -- 업체 추가 (University)
                SELECT
                    univIdx AS id,
                    CONVERT('university' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('add' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(univName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    created_at AS timestamp
                FROM tb_universityinfo
                WHERE created_at IS NOT NULL

                UNION ALL

                -- 업체 업데이트 (University)
                SELECT
                    univIdx AS id,
                    CONVERT('university' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(univName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    updated_at AS timestamp
                FROM tb_universityinfo
                WHERE updated_at IS NOT NULL
                AND updated_at > created_at

                UNION ALL

                -- 게시글 작성 (FreeBoard)
                SELECT
                    b.boardIdx AS id,
                    CONVERT('freeboard_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    b.boardRegDate AS timestamp
                FROM tb_freeboard b
                WHERE b.boardRegDate IS NOT NULL
                AND b.isDeleted = 0

                UNION ALL

                -- 게시글 수정 (FreeBoard)
                SELECT
                    b.boardIdx AS id,
                    CONVERT('freeboard_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('update' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    NULL AS entityName,
                    b.boardModDate AS timestamp
                FROM tb_freeboard b
                WHERE b.boardModDate IS NOT NULL
                AND b.isDeleted = 0

                UNION ALL

                -- 게시글 작성 (Church Board)
                SELECT
                    b.boardIdx AS id,
                    CONVERT('church_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    CONVERT(e.churchName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                    STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                FROM tb_church_board b
                LEFT JOIN tb_church_info e ON b.churchIdx = e.churchIdx
                WHERE b.boardRegDate IS NOT NULL

                UNION ALL

                -- 게시글 작성 (Company Board)
                SELECT
                    b.boardIdx AS id,
                    CONVERT('company_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    CONVERT(e.compName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                    STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                FROM tb_comp_board b
                LEFT JOIN tb_comp_info e ON b.compIdx = e.compIdx
                WHERE b.boardRegDate IS NOT NULL
                AND b.isDeleted = 0

                UNION ALL

                -- 게시글 작성 (Outsource Board)
                SELECT
                    b.boardIdx AS id,
                    CONVERT('outsource_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    CONVERT(e.outsourceName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                    STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                FROM tb_outsource_board b
                LEFT JOIN tb_outsource_info e ON b.outsourceIdx = e.outsourceIdx
                WHERE b.boardRegDate IS NOT NULL

                UNION ALL

                -- 게시글 작성 (Restaurant Board)
                SELECT
                    b.boardIdx AS id,
                    CONVERT('restaurant_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    CONVERT(e.restaurantName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                    STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                FROM tb_restaurant_board b
                LEFT JOIN tb_restaurant_info e ON b.restaurantIdx = e.restaurantIdx
                WHERE b.boardRegDate IS NOT NULL

                UNION ALL

                -- 게시글 작성 (University Board)
                SELECT
                    b.boardIdx AS id,
                    CONVERT('university_post' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS type,
                    CONVERT('create' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                    CONVERT(b.boardTitle USING utf8mb4) COLLATE utf8mb4_unicode_ci AS name,
                    CONVERT(e.univName USING utf8mb4) COLLATE utf8mb4_unicode_ci AS entityName,
                    STR_TO_DATE(b.boardRegDate, '%Y-%m-%d') AS timestamp
                FROM tb_univboard b
                LEFT JOIN tb_universityinfo e ON b.univIdx = e.univIdx
                WHERE b.boardRegDate IS NOT NULL
            ) activities
            WHERE timestamp IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT ?
        `;

        const results = await sequelize.query(query, {
            replacements: [limit],
            type: sequelize.QueryTypes.SELECT
        });

        logger.info(`[getRecentActivities] Recent activities retrieved: ${results.length} items`);
        return results;

    } catch (error) {
        logger.error(`[getRecentActivities] Error: ${error.message}`);
        throw error;
    }
};

