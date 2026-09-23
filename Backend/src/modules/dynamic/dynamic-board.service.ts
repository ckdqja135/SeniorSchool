// Backend/service/dynamic/dynamicBoardService.js의 Prisma 포팅.
// raw SQL + ? 바인딩, SELECT 결과는 serializeRows(BIGINT/DECIMAL→문자열).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { hashPassword } from '../../common/utils/hash-password.util';
import { DynamicTableNames } from '../../common/utils/slug-validator.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class DynamicBoardService {
    constructor(private readonly prisma: PrismaService) {}

    private async selectRows(sql: string, params: any[]): Promise<any[]> {
        return serializeRows(await this.prisma.$queryRawUnsafe<any[]>(sql, ...params));
    }

    private async insertReturningId(sql: string, params: any[]): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(sql, ...params);
            const rows = await tx.$queryRawUnsafe<any[]>('SELECT LAST_INSERT_ID() AS id');
            return Number(rows[0].id);
        });
    }

    // 게시글 목록 (페이지네이션) — 응답 키는 posts (원본과 동일)
    async listBoards(tables: DynamicTableNames, query: any) {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const offset = (page - 1) * limit;
            const entityIdx = query.entityIdx || query.entity_idx;

            let whereSql = 'WHERE `is_deleted` = 0';
            const params: any[] = [];

            if (entityIdx) {
                whereSql += ' AND `entity_idx` = ?';
                params.push(entityIdx);
            }
            if (query.category) {
                whereSql += ' AND `board_category` = ?';
                params.push(query.category);
            }

            const countSql = `SELECT COUNT(*) AS total FROM ${tables.boards} ${whereSql}`;
            const [countResult] = await this.selectRows(countSql, params);

            const dataSql = `SELECT * FROM ${tables.boards} ${whereSql} ORDER BY \`board_reg_date\` DESC, \`board_idx\` DESC LIMIT ? OFFSET ?`;
            const rows = await this.selectRows(dataSql, [...params, limit, offset]);

            const total = countResult.total;
            return {
                status: 200,
                totalCount: total,
                totalPages: Math.ceil(Number(total) / limit),
                currentPage: page,
                posts: rows,
            };
        } catch (error) {
            logger.error(`[dynamicBoard.list] Error: ${error.message}`);
            throw error;
        }
    }

    // 게시글 상세 (조회수 증가 — 조회 후 증가하므로 반환값은 증가 전) + 댓글
    async getBoardDetail(tables: DynamicTableNames, boardId: any) {
        try {
            const rows = await this.selectRows(
                `SELECT * FROM ${tables.boards} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0`,
                [boardId],
            );

            if (rows.length === 0) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            await this.prisma.$executeRawUnsafe(
                `UPDATE ${tables.boards} SET \`board_hits\` = \`board_hits\` + 1 WHERE \`board_idx\` = ?`,
                boardId,
            );

            const comments = await this.selectRows(
                `SELECT * FROM ${tables.comments} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0 ORDER BY \`reg_date\` ASC`,
                [boardId],
            );

            return { status: 200, data: { ...rows[0], comments } };
        } catch (error) {
            logger.error(`[dynamicBoard.detail] Error: ${error.message}`);
            throw error;
        }
    }

    // 최근 게시글
    async getRecentBoards(tables: DynamicTableNames, query: any) {
        try {
            const limit = parseInt(query.limit) || 5;
            const rows = await this.selectRows(
                `SELECT * FROM ${tables.boards} WHERE \`is_deleted\` = 0 ORDER BY \`board_reg_date\` DESC LIMIT ?`,
                [limit],
            );

            return { status: 200, data: rows };
        } catch (error) {
            logger.error(`[dynamicBoard.recent] Error: ${error.message}`);
            throw error;
        }
    }

    // 인기 게시글 (조회수 기준)
    async getTopViewedBoards(tables: DynamicTableNames, query: any) {
        try {
            const limit = parseInt(query.limit) || 10;
            const rows = await this.selectRows(
                `SELECT * FROM ${tables.boards} WHERE \`is_deleted\` = 0 ORDER BY \`board_hits\` DESC LIMIT ?`,
                [limit],
            );

            return { status: 200, data: rows };
        } catch (error) {
            logger.error(`[dynamicBoard.topViewed] Error: ${error.message}`);
            throw error;
        }
    }

    // 게시글 작성
    async insertBoard(tables: DynamicTableNames, data: any) {
        try {
            const { boardTitle, boardContent, entityIdx, boardID, boardPW, boardCategory, boardRating } = data;

            if (!boardTitle || !boardID || !boardPW) {
                return { status: 400, message: '필수값 누락: boardTitle, boardID, boardPW' };
            }

            const hashedPW = hashPassword(boardPW);
            const regDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

            const sql = `INSERT INTO ${tables.boards} (\`board_title\`, \`board_content\`, \`entity_idx\`, \`board_reg_date\`, \`board_like\`, \`board_hits\`, \`board_id\`, \`board_pw\`, \`board_category\`, \`board_rating\`, \`is_deleted\`) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 0)`;
            const params = [boardTitle, boardContent || null, entityIdx || null, regDate, boardID, hashedPW, boardCategory || null, boardRating || null];

            const result = await this.insertReturningId(sql, params);
            logger.info(`[dynamicBoard.insert] board_idx=${result}`);
            return { status: 201, data: { boardIdx: result } };
        } catch (error) {
            logger.error(`[dynamicBoard.insert] Error: ${error.message}`);
            throw error;
        }
    }

    // 좋아요 토글
    // 주의: 원본은 board_like(BIGINT)를 bigNumberStrings로 문자열로 받아 `문자열 + 1` 문자열 연결이 된다
    //       (예: 좋아요 0 → "0" + 1 = "01"). serializeRows도 board_like를 문자열화하므로 그대로 재현된다.
    async toggleBoardLike(tables: DynamicTableNames, boardId: any) {
        try {
            const rows = await this.selectRows(
                `SELECT \`board_idx\`, \`board_like\` FROM ${tables.boards} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0`,
                [boardId],
            );

            if (rows.length === 0) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            await this.prisma.$executeRawUnsafe(
                `UPDATE ${tables.boards} SET \`board_like\` = \`board_like\` + 1 WHERE \`board_idx\` = ?`,
                boardId,
            );

            return { status: 200, data: { boardLike: rows[0].board_like + 1 } };
        } catch (error) {
            logger.error(`[dynamicBoard.like] Error: ${error.message}`);
            throw error;
        }
    }

    // 게시글 삭제 (어드민, soft delete)
    async deleteBoard(tables: DynamicTableNames, boardId: any) {
        try {
            const rows = await this.selectRows(
                `SELECT \`board_idx\` FROM ${tables.boards} WHERE \`board_idx\` = ?`,
                [boardId],
            );

            if (rows.length === 0) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            await this.prisma.$executeRawUnsafe(
                `UPDATE ${tables.boards} SET \`is_deleted\` = 1 WHERE \`board_idx\` = ?`,
                boardId,
            );

            logger.info(`[dynamicBoard.delete] board_idx=${boardId}`);
            return { status: 200, message: '게시글이 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[dynamicBoard.delete] Error: ${error.message}`);
            throw error;
        }
    }
}
