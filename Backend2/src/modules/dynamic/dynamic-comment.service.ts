// Backend/service/dynamic/dynamicCommentService.js의 Prisma 포팅.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { hashPassword } from '../../common/utils/hash-password.util';
import { DynamicTableNames } from '../../common/utils/slug-validator.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class DynamicCommentService {
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

    // 댓글 목록
    async listComments(tables: DynamicTableNames, boardId: any) {
        try {
            const rows = await this.selectRows(
                `SELECT * FROM ${tables.comments} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0 ORDER BY \`reg_date\` ASC`,
                [boardId],
            );

            return { status: 200, data: rows };
        } catch (error) {
            logger.error(`[dynamicComment.list] Error: ${error.message}`);
            throw error;
        }
    }

    // 댓글 작성
    async createComment(tables: DynamicTableNames, data: any) {
        try {
            const { boardIdx, writerId, writerPw, commentContent, commentParent, commentDepth } = data;

            if (!boardIdx || !writerId || !writerPw || !commentContent) {
                return { status: 400, message: '필수값 누락: boardIdx, writerId, writerPw, commentContent' };
            }

            // 게시글 존재 확인
            const board = await this.selectRows(
                `SELECT \`board_idx\` FROM ${tables.boards} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0`,
                [boardIdx],
            );
            if (board.length === 0) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            const hashedPW = hashPassword(writerPw);

            const sql = `INSERT INTO ${tables.comments} (\`board_idx\`, \`comment_like\`, \`comment_depth\`, \`writer_id\`, \`writer_pw\`, \`comment_parent\`, \`comment_content\`, \`is_deleted\`) VALUES (?, 0, ?, ?, ?, ?, ?, 0)`;
            const params = [boardIdx, commentDepth || 0, writerId, hashedPW, commentParent || null, commentContent];

            const result = await this.insertReturningId(sql, params);
            logger.info(`[dynamicComment.create] comment_idx=${result}`);
            return { status: 201, data: { commentIdx: result } };
        } catch (error) {
            logger.error(`[dynamicComment.create] Error: ${error.message}`);
            throw error;
        }
    }

    // 댓글 삭제 (비밀번호 확인)
    async deleteComment(tables: DynamicTableNames, commentId: any, password: any) {
        try {
            const rows = await this.selectRows(
                `SELECT \`comment_idx\`, \`writer_pw\` FROM ${tables.comments} WHERE \`comment_idx\` = ? AND \`is_deleted\` = 0`,
                [commentId],
            );

            if (rows.length === 0) {
                return { status: 404, message: '댓글을 찾을 수 없습니다.' };
            }

            if (password) {
                const hashedPW = hashPassword(password);
                if (rows[0].writer_pw !== hashedPW) {
                    return { status: 403, message: '비밀번호가 일치하지 않습니다.' };
                }
            }

            await this.prisma.$executeRawUnsafe(
                `UPDATE ${tables.comments} SET \`is_deleted\` = 1 WHERE \`comment_idx\` = ?`,
                commentId,
            );

            logger.info(`[dynamicComment.delete] comment_idx=${commentId}`);
            return { status: 200, message: '댓글이 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[dynamicComment.delete] Error: ${error.message}`);
            throw error;
        }
    }
}
