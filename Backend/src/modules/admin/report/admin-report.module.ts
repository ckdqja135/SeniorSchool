// 어드민 신고 관리 (/admin/report). POST /createReport만 무가드(@Public), 나머지는 admin.
import { Module } from '@nestjs/common';
import { AdminReportController } from './admin-report.controller';
import { AdminReportService } from './admin-report.service';

@Module({
    controllers: [AdminReportController],
    providers: [AdminReportService],
})
export class AdminReportModule {}
