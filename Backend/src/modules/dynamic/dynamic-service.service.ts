// Backend/controller/dynamic/dynamicServiceController.js의 listActiveServices 로직.
// 퍼블릭 서비스 목록(active) — 프론트 기대 형식으로 매핑.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class DynamicServiceService {
    constructor(private readonly prisma: PrismaService) {}

    async listActiveServices() {
        // serviceId(BIGINT)는 전역 json replacer가 문자열화 → serviceIdx도 문자열 (원본 bigNumberStrings와 동일)
        const services = await this.prisma.serviceConfig.findMany({
            where: { status: 'active' },
            select: {
                serviceId: true, slug: true, name: true, displayName: true,
                emoji: true, color: true, templateType: true, sortOrder: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { serviceId: 'asc' }],
        });

        return services.map((raw) => ({
            serviceIdx: raw.serviceId,
            serviceSlug: raw.slug,
            serviceName: raw.name,
            serviceDisplay: raw.displayName || raw.name,
            serviceEmoji: raw.emoji,
            serviceColor: raw.color,
            templateType: raw.templateType,
            serviceStatus: 1,
            serviceOrder: raw.sortOrder,
        }));
    }
}
