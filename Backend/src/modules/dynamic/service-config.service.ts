// Backend/service/admin/serviceConfigService.js의 Prisma 포팅.
// 서비스 생성은 보상 트랜잭션 사가:
//   Phase A) service_configs + service_field_configs INSERT (트랜잭션)
//   Phase B) dynamic_<slug>_{entities,boards,comments,requests} CREATE TABLE (auto-commit, tx 밖)
//   실패 시) 생성된 테이블 DROP + config/field 레코드 삭제 (보상)
// 원본이 Sequelize 관계(include 'fields')를 쓰던 부분은 스키마에 관계가 없어 별도 조회 후 부착한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { validateSlug, getDynamicTableNames } from '../../common/utils/slug-validator.util';
import {
    buildCreateEntitiesSQL,
    buildCreateBoardsSQL,
    buildCreateCommentsSQL,
    buildCreateRequestsSQL,
} from '../../common/utils/dynamic-query-builder.util';
import { invalidateCache } from './slug-resolver.guard';
import { logger } from '../../logger/winston.logger';

// ── 응답 변환 (DB → 프론트 기대 형식) ──
const STATUS_MAP: Record<string, number> = { active: 1, inactive: 0, deleted: -1 };
const STATUS_REVERSE: Record<string, string> = { 1: 'active', 0: 'inactive', '-1': 'deleted' };

function formatField(raw: any) {
    return {
        fieldIdx: raw.fieldId,
        fieldKey: raw.fieldKey,
        fieldLabel: raw.fieldLabel,
        fieldType: raw.fieldType,
        isRequired: !!raw.isRequired,
        showInList: !!raw.showInList,
        showInDetail: !!raw.showInDetail,
        showInSearch: !!raw.isSearchable,
        sortOrder: raw.sortOrder,
    };
}

function formatService(raw: any) {
    const result: any = {
        serviceIdx: raw.serviceId,
        serviceSlug: raw.slug,
        serviceName: raw.name,
        serviceDisplay: raw.displayName || raw.name,
        serviceEmoji: raw.emoji,
        serviceColor: raw.color,
        templateType: raw.templateType,
        serviceStatus: STATUS_MAP[raw.status] !== undefined ? STATUS_MAP[raw.status] : 1,
        serviceOrder: raw.sortOrder,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
    if (raw.fields) {
        result.fields = raw.fields.map(formatField);
    }
    return result;
}

// 프론트 입력 → DB 필드 변환
function normalizeInput(data: any) {
    return {
        slug: data.serviceSlug || data.slug,
        name: data.serviceName || data.name,
        displayName: data.serviceDisplay || data.displayName,
        emoji: data.serviceEmoji || data.emoji,
        color: data.serviceColor || data.color,
        templateType: data.templateType,
        sortOrder: data.serviceOrder !== undefined ? data.serviceOrder : data.sortOrder,
        customFields: data.customFields || [],
    };
}

// ── 템플릿별 기본 필드 정의 (원본과 동일) ──
const TEMPLATE_FIELDS: Record<string, any[]> = {
    basic: [
        { fieldKey: 'name', fieldLabel: '이름', fieldType: 'text', fieldLength: 60, isRequired: 1, isSearchable: 1, sortOrder: 1 },
        { fieldKey: 'location', fieldLabel: '위치', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 2 },
        { fieldKey: 'type', fieldLabel: '유형', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 3 },
        { fieldKey: 'established', fieldLabel: '설립일', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 4 },
        { fieldKey: 'leader', fieldLabel: '대표자', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 5 },
        { fieldKey: 'url', fieldLabel: '홈페이지', fieldType: 'url', fieldLength: 200, isRequired: 0, isSearchable: 0, sortOrder: 6 },
        { fieldKey: 'addr', fieldLabel: '주소', fieldType: 'text', fieldLength: 200, isRequired: 0, isSearchable: 1, sortOrder: 7 },
    ],
    company: [
        { fieldKey: 'name', fieldLabel: '회사명', fieldType: 'text', fieldLength: 60, isRequired: 1, isSearchable: 1, sortOrder: 1 },
        { fieldKey: 'location', fieldLabel: '위치', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 2 },
        { fieldKey: 'type', fieldLabel: '회사 유형', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 3 },
        { fieldKey: 'ceo', fieldLabel: '대표이사', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 4 },
        { fieldKey: 'industry', fieldLabel: '업종', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 5 },
        { fieldKey: 'employee_count', fieldLabel: '직원 수', fieldType: 'number', isRequired: 0, isSearchable: 0, sortOrder: 6 },
        { fieldKey: 'avg_salary', fieldLabel: '평균 연봉', fieldType: 'number', isRequired: 0, isSearchable: 0, sortOrder: 7 },
        { fieldKey: 'addr', fieldLabel: '주소', fieldType: 'text', fieldLength: 200, isRequired: 0, isSearchable: 1, sortOrder: 8 },
    ],
    restaurant: [
        { fieldKey: 'name', fieldLabel: '맛집명', fieldType: 'text', fieldLength: 60, isRequired: 1, isSearchable: 1, sortOrder: 1 },
        { fieldKey: 'location', fieldLabel: '위치', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 2 },
        { fieldKey: 'food_type', fieldLabel: '음식 종류', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 1, sortOrder: 3 },
        { fieldKey: 'owner', fieldLabel: '대표자', fieldType: 'text', fieldLength: 45, isRequired: 0, isSearchable: 0, sortOrder: 4 },
        { fieldKey: 'image', fieldLabel: '이미지', fieldType: 'image', fieldLength: 200, isRequired: 0, isSearchable: 0, sortOrder: 5 },
        { fieldKey: 'addr', fieldLabel: '주소', fieldType: 'text', fieldLength: 200, isRequired: 0, isSearchable: 1, sortOrder: 6 },
    ],
};

@Injectable()
export class ServiceConfigService {
    constructor(private readonly prisma: PrismaService) {}

    // serviceId별 필드 조회 (원본 include 'fields' 대체 — 스키마에 관계 없음). fieldId 오름차순(PK 순).
    private async getFields(serviceId: bigint) {
        return this.prisma.serviceFieldConfig.findMany({
            where: { serviceId },
            orderBy: { fieldId: 'asc' },
        });
    }

    // 서비스 목록 조회 (fields 포함)
    async listServices(query: any = {}) {
        try {
            const where: any = {};
            if (query.status) where.status = query.status;
            else where.status = { in: ['active', 'inactive'] };

            const services = await this.prisma.serviceConfig.findMany({
                where,
                orderBy: [{ sortOrder: 'asc' }, { serviceId: 'asc' }],
            });

            const data = [];
            for (const svc of services) {
                const fields = await this.getFields(svc.serviceId);
                data.push(formatService({ ...svc, fields }));
            }

            logger.info(`[serviceConfig.list] ${services.length} services found`);
            return { status: 200, data };
        } catch (error) {
            logger.error(`[serviceConfig.list] Error: ${error.message}`);
            throw error;
        }
    }

    // 서비스 상세 + 필드 설정 조회
    async getServiceBySlug(slug: string) {
        try {
            const service = await this.prisma.serviceConfig.findFirst({ where: { slug } });

            if (!service) {
                return { status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` };
            }

            const fields = await this.getFields(service.serviceId);
            return { status: 200, data: formatService({ ...service, fields }) };
        } catch (error) {
            logger.error(`[serviceConfig.get] Error: ${error.message}`);
            throw error;
        }
    }

    // 서비스 생성 (보상 트랜잭션 사가)
    async createService(data: any) {
        const input = normalizeInput(data);
        const { slug, name, displayName, emoji, color, templateType = 'basic', sortOrder = 0, customFields } = input;

        // 1. slug 검증
        const validation = validateSlug(slug);
        if (!validation.valid) {
            return { status: 400, message: validation.error };
        }

        // 2. 중복 체크
        const existing = await this.prisma.serviceConfig.findFirst({ where: { slug } });
        if (existing) {
            return { status: 409, message: `slug '${slug}'는 이미 사용 중입니다.` };
        }

        let serviceConfig: any = null;
        const tables = getDynamicTableNames(slug);
        const createdTables: string[] = [];

        try {
            // Phase A: 설정 INSERT (트랜잭션)
            serviceConfig = await this.prisma.$transaction(async (tx) => {
                const svc = await tx.serviceConfig.create({
                    data: { slug, name, displayName, emoji, color, templateType, sortOrder },
                });

                const templateFields = TEMPLATE_FIELDS[templateType] || TEMPLATE_FIELDS.basic;
                const allFields = [...templateFields, ...customFields].map((f: any, i: number) => ({
                    serviceId: svc.serviceId,
                    fieldKey: f.fieldKey,
                    fieldLabel: f.fieldLabel,
                    fieldType: f.fieldType || 'text',
                    fieldLength: f.fieldLength || null,
                    isRequired: f.isRequired || 0,
                    isSearchable: f.isSearchable || (f.showInSearch ? 1 : 0),
                    showInList: f.showInList !== undefined ? (f.showInList ? 1 : 0) : 1,
                    showInDetail: f.showInDetail !== undefined ? (f.showInDetail ? 1 : 0) : 1,
                    showInAdmin: f.showInAdmin !== undefined ? (f.showInAdmin ? 1 : 0) : 1,
                    sortOrder: f.sortOrder || (templateFields.length + i + 1),
                }));

                await tx.serviceFieldConfig.createMany({ data: allFields });
                return svc;
            });
            logger.info(`[serviceConfig.create] Phase A complete: slug=${slug}, serviceId=${serviceConfig.serviceId}`);

            // Phase B: DDL (auto-commit, tx 밖)
            const fieldConfigs = await this.prisma.serviceFieldConfig.findMany({
                where: { serviceId: serviceConfig.serviceId },
            });

            const ddlStatements = [
                { name: 'entities', sql: buildCreateEntitiesSQL(tables.entities, templateType, fieldConfigs) },
                { name: 'boards', sql: buildCreateBoardsSQL(tables.boards) },
                { name: 'comments', sql: buildCreateCommentsSQL(tables.comments) },
                { name: 'requests', sql: buildCreateRequestsSQL(tables.requests) },
            ];

            for (const stmt of ddlStatements) {
                await this.prisma.$executeRawUnsafe(stmt.sql);
                createdTables.push(stmt.name);
                logger.info(`[serviceConfig.create] Table created: dynamic_${slug}_${stmt.name}`);
            }

            invalidateCache(slug);

            // 생성된 서비스 + 필드 조회 후 프론트 형식으로 반환
            const fields = await this.getFields(serviceConfig.serviceId);
            logger.info(`[serviceConfig.create] Service created successfully: slug=${slug}`);
            return { status: 201, data: formatService({ ...serviceConfig, fields }) };
        } catch (error) {
            logger.error(`[serviceConfig.create] Error: ${error.message}`);

            // 보상 트랜잭션: 생성된 테이블 DROP
            for (const tblName of createdTables) {
                try {
                    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${(tables as any)[tblName]}`);
                    logger.info(`[serviceConfig.create] Compensation: dropped ${(tables as any)[tblName]}`);
                } catch (dropErr) {
                    logger.error(`[serviceConfig.create] Compensation drop failed: ${dropErr.message}`);
                }
            }

            // config/field 레코드 삭제
            if (serviceConfig) {
                try {
                    await this.prisma.serviceFieldConfig.deleteMany({ where: { serviceId: serviceConfig.serviceId } });
                    await this.prisma.serviceConfig.deleteMany({ where: { serviceId: serviceConfig.serviceId } });
                    logger.info(`[serviceConfig.create] Compensation: config records deleted`);
                } catch (delErr) {
                    logger.error(`[serviceConfig.create] Compensation delete failed: ${delErr.message}`);
                }
            }

            throw error;
        }
    }

    // 서비스 설정 수정
    async updateService(slug: string, data: any) {
        try {
            const service = await this.prisma.serviceConfig.findFirst({ where: { slug } });
            if (!service) {
                return { status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` };
            }

            // 프론트 필드명 + DB 필드명 모두 허용
            const updateData: any = {};
            if (data.serviceName !== undefined || data.name !== undefined) updateData.name = data.serviceName || data.name;
            if (data.serviceDisplay !== undefined || data.displayName !== undefined) updateData.displayName = data.serviceDisplay || data.displayName;
            if (data.serviceEmoji !== undefined || data.emoji !== undefined) updateData.emoji = data.serviceEmoji || data.emoji;
            if (data.serviceColor !== undefined || data.color !== undefined) updateData.color = data.serviceColor || data.color;
            if (data.serviceOrder !== undefined || data.sortOrder !== undefined) updateData.sortOrder = data.serviceOrder !== undefined ? data.serviceOrder : data.sortOrder;
            if (data.serviceStatus !== undefined) {
                updateData.status = STATUS_REVERSE[String(data.serviceStatus)] || data.serviceStatus;
            } else if (data.status !== undefined) {
                updateData.status = data.status;
            }

            await this.prisma.serviceConfig.updateMany({ where: { serviceId: service.serviceId }, data: updateData });
            invalidateCache(slug);

            logger.info(`[serviceConfig.update] slug=${slug} updated`);
            return { status: 200, message: '서비스 설정이 수정되었습니다.' };
        } catch (error) {
            logger.error(`[serviceConfig.update] Error: ${error.message}`);
            throw error;
        }
    }

    // 서비스 비활성화 (soft delete)
    async deleteService(slug: string) {
        try {
            const service = await this.prisma.serviceConfig.findFirst({ where: { slug } });
            if (!service) {
                return { status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` };
            }

            await this.prisma.serviceConfig.updateMany({ where: { serviceId: service.serviceId }, data: { status: 'deleted' } });
            invalidateCache(slug);

            logger.info(`[serviceConfig.delete] slug=${slug} soft-deleted`);
            return { status: 200, message: '서비스가 비활성화되었습니다.' };
        } catch (error) {
            logger.error(`[serviceConfig.delete] Error: ${error.message}`);
            throw error;
        }
    }
}
