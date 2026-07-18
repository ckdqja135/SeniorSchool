// Backend/service/dynamic/dynamicEntityService.js의 Prisma 포팅.
// 검증된 slug로 만든 백틱 테이블명(req.dynamicTables)에 raw SQL. VALUE는 전부 ? 바인딩.
// SELECT 결과의 BIGINT/DECIMAL은 serializeRows로 구 스택(문자열)과 맞춘다.
// INSERT의 insertId는 원본이 Sequelize 메타(숫자)라, $executeRawUnsafe + LAST_INSERT_ID()를
// 한 트랜잭션(커넥션 고정)에서 조회해 재현한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeRows, serializeRow } from '../../common/utils/serialize-row.util';
import {
    buildSelectSQL,
    buildCountSQL,
    buildInsertSQL,
    buildUpdateSQL,
} from '../../common/utils/dynamic-query-builder.util';
import { DynamicTableNames } from '../../common/utils/slug-validator.util';
import { logger } from '../../logger/winston.logger';

// 허용된 엔티티 컬럼 화이트리스트 생성 (원본 getAllowedColumns)
function getAllowedColumns(fieldConfigs: any[], templateType: string): string[] {
    const base = [
        'name', 'location', 'type', 'established', 'leader',
        'lat_x', 'lat_y', 'url', 'lot_addr', 'addr', 'map_img', 'status', 'view_count',
    ];

    if (templateType === 'company') {
        base.push('ceo', 'industry', 'employee_count', 'avg_salary', 'capital',
            'sales', 'operating_profit', 'net_income', 'total_assets', 'total_liabilities', 'total_equity');
    } else if (templateType === 'restaurant') {
        base.push('owner', 'image', 'average_rating', 'rating_count', 'food_type');
    }

    for (const f of fieldConfigs) {
        const key = f.fieldKey || f.field_key;
        if (!base.includes(key)) base.push(key);
    }

    return base;
}

@Injectable()
export class DynamicEntityService {
    constructor(private readonly prisma: PrismaService) {}

    private async selectRows(sql: string, params: any[]): Promise<any[]> {
        return serializeRows(await this.prisma.$queryRawUnsafe<any[]>(sql, ...params));
    }

    // INSERT 후 LAST_INSERT_ID를 같은 트랜잭션(커넥션)에서 조회 → 숫자로 반환 (원본 Sequelize insertId 재현)
    private async insertReturningId(sql: string, params: any[]): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(sql, ...params);
            const rows = await tx.$queryRawUnsafe<any[]>('SELECT LAST_INSERT_ID() AS id');
            return Number(rows[0].id);
        });
    }

    // 엔티티 목록 (페이지네이션 + 필터)
    async listEntities(tables: DynamicTableNames, fieldConfigs: any[], serviceConfig: any, query: any) {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const where: Record<string, any> = { status: 1 };

            if (query.location) where.location = query.location;
            if (query.type) where.type = query.type;

            const { sql: countSql, params: countParams } = buildCountSQL(tables.entities, where);
            const { sql, params } = buildSelectSQL(tables.entities, { page, limit, where });

            const [countResult] = await this.selectRows(countSql, countParams);
            const rows = await this.selectRows(sql, params);

            const total = countResult.total;
            return {
                status: 200,
                totalCount: total,
                totalPages: Math.ceil(Number(total) / limit),
                currentPage: page,
                currentCount: rows.length,
                data: rows,
            };
        } catch (error) {
            logger.error(`[dynamicEntity.list] Error: ${error.message}`);
            throw error;
        }
    }

    // 엔티티 상세 (조회수 증가 — 원본: 조회 후 증가하므로 반환값은 증가 전)
    async getEntityDetail(tables: DynamicTableNames, entityId: any) {
        try {
            const rows = await this.selectRows(
                `SELECT * FROM ${tables.entities} WHERE \`entity_idx\` = ?`,
                [entityId],
            );

            if (rows.length === 0) {
                return { status: 404, message: '엔티티를 찾을 수 없습니다.' };
            }

            await this.prisma.$executeRawUnsafe(
                `UPDATE ${tables.entities} SET \`view_count\` = \`view_count\` + 1 WHERE \`entity_idx\` = ?`,
                entityId,
            );

            return { status: 200, data: rows[0] };
        } catch (error) {
            logger.error(`[dynamicEntity.detail] Error: ${error.message}`);
            throw error;
        }
    }

    // 인기 TOP N
    async getTopViewed(tables: DynamicTableNames, query: any) {
        try {
            const limit = parseInt(query.limit) || 10;
            const rows = await this.selectRows(
                `SELECT * FROM ${tables.entities} WHERE \`status\` = 1 ORDER BY \`view_count\` DESC LIMIT ?`,
                [limit],
            );

            return { status: 200, data: rows };
        } catch (error) {
            logger.error(`[dynamicEntity.topViewed] Error: ${error.message}`);
            throw error;
        }
    }

    // 자동완성 검색
    async autoSearch(tables: DynamicTableNames, query: any) {
        try {
            const keyword = query.keyword;
            if (!keyword || keyword.trim().length === 0) {
                return { status: 200, data: [] };
            }

            const rows = await this.selectRows(
                `SELECT \`entity_idx\`, \`name\`, \`location\` FROM ${tables.entities} WHERE \`status\` = 1 AND \`name\` LIKE ? ORDER BY \`name\` ASC LIMIT 10`,
                [`%${keyword}%`],
            );

            return { status: 200, data: rows };
        } catch (error) {
            logger.error(`[dynamicEntity.autoSearch] Error: ${error.message}`);
            throw error;
        }
    }

    // 엔티티 생성 (어드민)
    async createEntity(tables: DynamicTableNames, fieldConfigs: any[], serviceConfig: any, data: any) {
        try {
            const allowed = getAllowedColumns(fieldConfigs, serviceConfig.templateType || serviceConfig.template_type);
            const { sql, params } = buildInsertSQL(tables.entities, data, allowed);

            const result = await this.insertReturningId(sql, params);
            logger.info(`[dynamicEntity.create] entity_idx=${result}`);
            return { status: 201, data: { entityIdx: result } };
        } catch (error) {
            logger.error(`[dynamicEntity.create] Error: ${error.message}`);
            throw error;
        }
    }

    // 엔티티 수정 (어드민)
    async updateEntity(tables: DynamicTableNames, fieldConfigs: any[], serviceConfig: any, entityId: any, data: any) {
        try {
            const rows = await this.selectRows(
                `SELECT \`entity_idx\` FROM ${tables.entities} WHERE \`entity_idx\` = ?`,
                [entityId],
            );
            if (rows.length === 0) {
                return { status: 404, message: '엔티티를 찾을 수 없습니다.' };
            }

            const allowed = getAllowedColumns(fieldConfigs, serviceConfig.templateType || serviceConfig.template_type);
            const { sql, params } = buildUpdateSQL(tables.entities, data, 'entity_idx', entityId, allowed);

            await this.prisma.$executeRawUnsafe(sql, ...params);
            logger.info(`[dynamicEntity.update] entity_idx=${entityId}`);
            return { status: 200, message: '엔티티가 수정되었습니다.' };
        } catch (error) {
            logger.error(`[dynamicEntity.update] Error: ${error.message}`);
            throw error;
        }
    }

    // 엔티티 삭제 (어드민, soft delete)
    async deleteEntity(tables: DynamicTableNames, entityId: any) {
        try {
            const rows = await this.selectRows(
                `SELECT \`entity_idx\` FROM ${tables.entities} WHERE \`entity_idx\` = ?`,
                [entityId],
            );
            if (rows.length === 0) {
                return { status: 404, message: '엔티티를 찾을 수 없습니다.' };
            }

            await this.prisma.$executeRawUnsafe(
                `UPDATE ${tables.entities} SET \`status\` = 0 WHERE \`entity_idx\` = ?`,
                entityId,
            );

            logger.info(`[dynamicEntity.delete] entity_idx=${entityId}`);
            return { status: 200, message: '엔티티가 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[dynamicEntity.delete] Error: ${error.message}`);
            throw error;
        }
    }
}
