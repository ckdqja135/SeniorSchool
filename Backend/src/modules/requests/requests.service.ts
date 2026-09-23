// Backend/service/requestsService.js의 Prisma 포팅.
// 5개 도메인의 *_request 테이블(교회/맛집/외주/회사/대학)을 각각 조회해 병합한다.
// 원본 SERVICE_META의 키 순서(church→restaurant→outsource→comp→univ)와 per-table 정렬을
// 그대로 유지해 requestDate 동률 시 안정 정렬 결과가 원본과 동일하도록 한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../logger/winston.logger';

// 원본 SERVICE_META (Object 삽입 순서 = 병합/정렬 순서)
const SERVICE_META = [
    { key: 'church', label: '교회 오빠', nameField: 'churchName' },
    { key: 'restaurant', label: '맛잘알 오빠', nameField: 'restaurantName' },
    { key: 'outsource', label: '외주 오빠', nameField: 'outsourceName' },
    { key: 'comp', label: '회사 오빠', nameField: 'compName' },
    { key: 'univ', label: '학교 오빠', nameField: 'univName' },
] as const;

@Injectable()
export class RequestsService {
    constructor(private readonly prisma: PrismaService) {}

    async getRecentRequests({ limit = 20 }: { limit?: any } = {}) {
        const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
        const perTable = Math.min(safeLimit, 20);

        // key → Prisma delegate 매핑
        const modelMap: Record<string, any> = {
            church: this.prisma.churchRequest,
            restaurant: this.prisma.restaurantRequest,
            outsource: this.prisma.outsourceRequest,
            comp: this.prisma.compRequest,
            univ: this.prisma.univRequest,
        };

        try {
            const results = await Promise.all(
                SERVICE_META.map(async (meta) => {
                    const rows = await modelMap[meta.key].findMany({
                        select: {
                            requestIdx: true,
                            [meta.nameField]: true,
                            requestStatus: true,
                            requestDate: true,
                            processedDate: true,
                            adminNote: true,
                        } as any,
                        orderBy: { requestDate: 'desc' },
                        take: perTable,
                    } as any);

                    return rows.map((r: any) => ({
                        service: meta.key,
                        serviceLabel: meta.label,
                        requestIdx: r.requestIdx,
                        name: r[meta.nameField],
                        requestStatus: r.requestStatus,
                        requestDate: r.requestDate,
                        processedDate: r.processedDate,
                        adminNote: r.adminNote || null,
                    }));
                })
            );

            return results
                .flat()
                .sort((a, b) => new Date(b.requestDate as any).getTime() - new Date(a.requestDate as any).getTime())
                .slice(0, safeLimit);
        } catch (error) {
            logger.error(`[getRecentRequests] Error: ${error.message}`);
            throw error;
        }
    }
}
