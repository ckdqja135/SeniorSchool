// Backend/service 레이어가 없던 원본 controller/reportController.js의 DB 로직을 Prisma로 포팅.
// ReportBoard(prisma.reportBoard)는 boardIdx + serviceType 판별자로 동작하는 폴리모픽 테이블(FK 없음).
// ReportBoard.isDeleted는 실제 tinyint(1) → Prisma Boolean 이므로 true/false로 직렬화되어 원본과 동일.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class ReportService {
    constructor(private readonly prisma: PrismaService) {}

    async createReport(input: { boardIdx: any; serviceType: any; reportReason: any; reporterId?: any }) {
        const { boardIdx, serviceType, reportReason, reporterId } = input;

        // 신고 데이터 생성
        const reportData = {
            boardIdx,
            serviceType,
            reportReason,
            reporterId: reporterId || null,
            reportStatus: 'pending',
            isDeleted: false,
        };

        const newReport = await this.prisma.reportBoard.create({ data: reportData as any });

        logger.info(`[createReport] 신고 등록 완료: reportIdx=${newReport.reportIdx}, serviceType=${serviceType}, boardIdx=${boardIdx}`);

        return {
            reportIdx: newReport.reportIdx,
            boardIdx: newReport.boardIdx,
            serviceType: newReport.serviceType,
            reportStatus: newReport.reportStatus,
            reportDate: newReport.reportDate,
        };
    }
}
