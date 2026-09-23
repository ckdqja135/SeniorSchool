// Backend/service/bestPostsService.js의 Prisma 포팅.
// 6개 게시판 테이블을 UNION ALL로 합쳐 weighted_score(boardLike*2 + boardHits*1) 기준으로 랭킹.
// 원본 Raw SQL을 그대로 이식한다(CONVERT ... USING utf8mb4 COLLATE utf8mb4_unicode_ci, _utf8mb4 리터럴).
// mysqldump import 시 collation이 utf8mb4_0900_ai_ci → utf8mb4_unicode_ci로 정규화되어 그대로 매칭됨.
// 구 스택(mariadb + bigNumberStrings)은 BIGINT/computed weighted_score를 문자열로 반환 → serializeRows로 동일 형태 유지.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class BestPostsService {
    constructor(private readonly prisma: PrismaService) {}

    // 베스트 후기 조회 (전체)
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
            `;

            // Prisma raw query 실행 — 구 스택과 동일한 결과 형태를 위해 serializeRows로 BigInt/Decimal → 문자열 변환
            const results = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(query));

            logger.info(`후기 베스트트 조회 완료 - 총 ${results.length}개`);

            return {
                status: 200,
                data: results,
            };
        } catch (error) {
            logger.error(`후기 베스트트 조회 오류: ${error.message}`);
            throw error;
        }
    }
}
