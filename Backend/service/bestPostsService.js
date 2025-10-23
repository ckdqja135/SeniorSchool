const { sequelize } = require('../model');
const logger = require('../utils/logger');

class BestPostsService {
    // Top 10 베스트 후기 조회
    async getTop10BestPosts() {
        try {
            const query = `
                SELECT 
                    b.boardIdx,
                    b.boardTitle,
                    b.boardContent,
                    b.boardRegDate,
                    b.boardLike,
                    b.boardHits,
                    b.boardID,
                    (b.boardLike * 2 + b.boardHits * 1) AS weighted_score,
                    b.source_table AS board_type
                FROM (
                    -- 자유게시판
                    SELECT 
                        boardIdx,
                        CONVERT(boardTitle  USING utf8mb4) COLLATE utf8mb4_unicode_ci AS boardTitle,
                        CONVERT(boardContent USING utf8mb4) COLLATE utf8mb4_unicode_ci AS boardContent,
                        boardRegDate,
                        boardLike,
                        boardHits,
                        CONVERT(boardID     USING utf8mb4) COLLATE utf8mb4_unicode_ci AS boardID,
                        _utf8mb4'freeboard' AS source_table
                    FROM tb_freeboard
                    WHERE isDeleted = 0
                    UNION ALL
                    -- 교회게시판
                    SELECT 
                        boardIdx,
                        CONVERT(boardTitle  USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        CONVERT(boardContent USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        boardRegDate,
                        boardLike,
                        boardHits,
                        CONVERT(boardID     USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        _utf8mb4'church'
                    FROM tb_church_board
                    UNION ALL
                    -- 회사게시판
                    SELECT 
                        boardIdx,
                        CONVERT(boardTitle  USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        CONVERT(boardContent USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        boardRegDate,
                        boardLike,
                        boardHits,
                        CONVERT(boardID     USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        _utf8mb4'company'
                    FROM tb_comp_board
                    UNION ALL
                    -- 아웃소싱게시판
                    SELECT 
                        boardIdx,
                        CONVERT(boardTitle  USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        CONVERT(boardContent USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        boardRegDate,
                        boardLike,
                        boardHits,
                        CONVERT(boardID     USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        _utf8mb4'outsource'
                    FROM tb_outsource_board
                    UNION ALL
                    -- 맛집게시판
                    SELECT 
                        boardIdx,
                        CONVERT(boardTitle  USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        CONVERT(boardContent USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        boardRegDate,
                        boardLike,
                        boardHits,
                        CONVERT(boardID     USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        _utf8mb4'restaurant'
                    FROM tb_restaurant_board
                    UNION ALL
                    -- 대학게시판
                    SELECT 
                        boardIdx,
                        CONVERT(boardTitle  USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        CONVERT(boardContent USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        boardRegDate,
                        boardLike,
                        boardHits,
                        CONVERT(boardID     USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                        _utf8mb4'university'
                    FROM tb_univboard
                ) b
                ORDER BY weighted_score DESC, b.boardRegDate DESC
                LIMIT 10
            `;

            // Sequelize로 Raw Query 실행
            const results = await sequelize.query(query, {
                type: sequelize.QueryTypes.SELECT
            });

            logger.info(`후기 베스트트 조회 완료 - 총 ${results.length}개`);

            return {
                status: 200,
                data: results
            };
        } catch (error) {
            logger.error(`후기 베스트트 조회 오류: ${error.message}`);
            throw error;
        }
    }

}

module.exports = new BestPostsService();

