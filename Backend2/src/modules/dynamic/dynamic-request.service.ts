// Backend/service/dynamic/dynamicRequestService.js의 Prisma 포팅.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { DynamicTableNames } from '../../common/utils/slug-validator.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class DynamicRequestService {
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

    // 추가 요청 생성 (퍼블릭)
    async createRequest(tables: DynamicTableNames, data: any) {
        try {
            const { requestName, requestData, requesterId } = data;

            if (!requestName) {
                return { status: 400, message: '필수값 누락: requestName' };
            }

            const sql = `INSERT INTO ${tables.requests} (\`request_name\`, \`request_data\`, \`requester_id\`) VALUES (?, ?, ?)`;
            const params = [requestName, requestData ? JSON.stringify(requestData) : null, requesterId || null];

            const result = await this.insertReturningId(sql, params);
            logger.info(`[dynamicRequest.create] request_idx=${result}`);
            return { status: 201, data: { requestIdx: result } };
        } catch (error) {
            logger.error(`[dynamicRequest.create] Error: ${error.message}`);
            throw error;
        }
    }

    // 요청 목록 (어드민)
    async listRequests(tables: DynamicTableNames, query: any) {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const offset = (page - 1) * limit;

            let whereSql = '';
            const params: any[] = [];

            if (query.status) {
                whereSql = 'WHERE `request_status` = ?';
                params.push(query.status);
            }

            const countSql = `SELECT COUNT(*) AS total FROM ${tables.requests} ${whereSql}`;
            const [countResult] = await this.selectRows(countSql, params);

            const dataSql = `SELECT * FROM ${tables.requests} ${whereSql} ORDER BY \`request_date\` DESC LIMIT ? OFFSET ?`;
            const rows = await this.selectRows(dataSql, [...params, limit, offset]);

            const total = countResult.total;
            return {
                status: 200,
                totalCount: total,
                totalPages: Math.ceil(Number(total) / limit),
                currentPage: page,
                data: rows,
            };
        } catch (error) {
            logger.error(`[dynamicRequest.list] Error: ${error.message}`);
            throw error;
        }
    }

    // 요청 상태 변경 (어드민)
    async updateRequestStatus(tables: DynamicTableNames, requestId: any, data: any) {
        try {
            let { requestStatus, adminNote } = data;

            // 프론트에서 숫자로 보내는 경우 변환 (0=pending, 1=completed, 2=rejected)
            const STATUS_NUM_MAP: Record<number, string> = { 0: 'pending', 1: 'completed', 2: 'rejected' };
            if (typeof requestStatus === 'number' || /^\d+$/.test(requestStatus)) {
                requestStatus = STATUS_NUM_MAP[Number(requestStatus)] || requestStatus;
            }

            if (!requestStatus || !['completed', 'rejected', 'pending'].includes(requestStatus)) {
                return { status: 400, message: '유효하지 않은 상태값입니다.' };
            }

            const rows = await this.selectRows(
                `SELECT \`request_idx\` FROM ${tables.requests} WHERE \`request_idx\` = ?`,
                [requestId],
            );

            if (rows.length === 0) {
                return { status: 404, message: '요청을 찾을 수 없습니다.' };
            }

            let sql = `UPDATE ${tables.requests} SET \`request_status\` = ?, \`processed_date\` = NOW()`;
            const params: any[] = [requestStatus];

            if (adminNote !== undefined) {
                sql += ', `admin_note` = ?';
                params.push(adminNote);
            }

            sql += ' WHERE `request_idx` = ?';
            params.push(requestId);

            await this.prisma.$executeRawUnsafe(sql, ...params);
            logger.info(`[dynamicRequest.updateStatus] request_idx=${requestId}, status=${requestStatus}`);
            return { status: 200, message: '요청 상태가 변경되었습니다.' };
        } catch (error) {
            logger.error(`[dynamicRequest.updateStatus] Error: ${error.message}`);
            throw error;
        }
    }
}
