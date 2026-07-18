// Backend/service/admin/freeBoardService.js의 Prisma 포팅.
// 주의(원본 Sequelize 모델): tags는 JSON 타입(읽을 때 자동 파싱), isDeleted는 BOOLEAN.
//   Prisma는 tags String?(LongText)/isDeleted Int(tinyint)로 introspect → 응답에서 파싱/Boolean 변환.
// boardIdx/boardLike/boardHits BIGINT → 전역 replacer가 문자열화.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';

@Injectable()
export class AdminFreeBoardService {
    constructor(private readonly prisma: PrismaService) {}

    // 원본 Sequelize JSON/BOOLEAN 컬럼의 읽기 형태 재현 (키 순서 보존)
    private serializeRow(row: any): any {
        return {
            ...row,
            tags: this.parseTags(row.tags),
            isDeleted: Boolean(row.isDeleted),
        };
    }

    private parseTags(tags: any): any {
        if (tags == null) return null;
        try {
            return JSON.parse(tags);
        } catch {
            return tags;
        }
    }

    async listPosts(query: any) {
        try {
            const page = parseInt(query.page ?? 1);
            const limit = parseInt(query.limit ?? 10);
            const includeDeleted = query.includeDeleted === '1' || query.includeDeleted === 1;

            const where: Record<string, any> = {};
            if (!includeDeleted) where.isDeleted = 0;

            const offset = (page - 1) * limit;

            const count = await this.prisma.freeBoard.count({ where });
            const rows = await this.prisma.freeBoard.findMany({
                where,
                orderBy: [{ boardRegDate: 'desc' }, { boardIdx: 'desc' }],
                take: limit,
                skip: offset,
            });

            return {
                status: 200,
                totalCount: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                posts: rows.map((r: any) => this.serializeRow(r)),
            };
        } catch (error) {
            logger.error(`[admin.freeboard.list] Error: ${error.message}`);
            throw error;
        }
    }

    async createPost(postData: any) {
        try {
            const required = ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'category'];

            const validate = (item: any): string | null => {
                for (const key of required) {
                    if (!item[key] || (typeof item[key] === 'string' && item[key].trim() === '')) {
                        return key;
                    }
                }
                return null;
            };

            const buildData = (item: any) => ({
                boardTitle: item.boardTitle,
                boardContent: item.boardContent,
                boardID: item.boardID,
                boardPW: item.boardPW,
                category: item.category,
                tags: item.tags != null ? JSON.stringify(item.tags) : null,
                boardRegDate: item.boardRegDate ? new Date(item.boardRegDate) : new Date(),
                boardModDate: item.boardModDate ? new Date(item.boardModDate) : null,
                boardLike: item.boardLike ?? 0,
                boardHits: item.boardHits ?? 0,
                isDeleted: item.isDeleted ? 1 : 0,
            });

            // 배열 입력 (일괄 생성)
            if (Array.isArray(postData)) {
                const results: any[] = [];
                for (const item of postData) {
                    const missing = validate(item);
                    if (missing) return { status: 400, message: `필수값 누락: ${missing}` };
                    const created = await this.prisma.freeBoard.create({ data: buildData(item) });
                    results.push(this.serializeRow(created));
                }
                logger.info(`[admin.freeboard.create] bulk count=${results.length}`);
                return { status: 201, data: results };
            }

            // 단건 입력
            const missing = validate(postData);
            if (missing) return { status: 400, message: `필수값 누락: ${missing}` };

            const created = await this.prisma.freeBoard.create({ data: buildData(postData) });
            logger.info(`[admin.freeboard.create] boardIdx=${created.boardIdx}`);
            return { status: 201, data: this.serializeRow(created) };
        } catch (error) {
            logger.error(`[admin.freeboard.create] Error: ${error.message}`);
            throw error;
        }
    }

    async updatePost(boardIdx: any, updateData: any) {
        try {
            const post = await this.prisma.freeBoard.findUnique({ where: { boardIdx: Number(boardIdx) } });
            if (!post || post.isDeleted) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            const allowed = ['boardTitle', 'boardContent', 'category', 'tags'];
            const payload: Record<string, any> = {};
            for (const key of allowed) {
                if (updateData[key] !== undefined) {
                    payload[key] = key === 'tags' ? (updateData[key] != null ? JSON.stringify(updateData[key]) : null) : updateData[key];
                }
            }
            payload.boardModDate = new Date();

            await this.prisma.freeBoard.updateMany({ where: { boardIdx: Number(boardIdx) }, data: payload });
            logger.info(`[admin.freeboard.update] boardIdx=${boardIdx}`);
            return { status: 200, message: '게시글이 수정되었습니다.' };
        } catch (error) {
            logger.error(`[admin.freeboard.update] Error: ${error.message}`);
            throw error;
        }
    }

    async deletePost(boardIdx: any) {
        try {
            const post = await this.prisma.freeBoard.findUnique({ where: { boardIdx: Number(boardIdx) } });
            if (!post || post.isDeleted) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            await this.prisma.freeBoard.updateMany({ where: { boardIdx: Number(boardIdx) }, data: { isDeleted: 1, boardModDate: new Date() } });
            logger.info(`[admin.freeboard.delete] boardIdx=${boardIdx}`);
            return { status: 200, message: '게시글이 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[admin.freeboard.delete] Error: ${error.message}`);
            throw error;
        }
    }
}
