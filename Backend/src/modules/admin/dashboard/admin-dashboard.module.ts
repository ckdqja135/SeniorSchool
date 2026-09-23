// 어드민 대시보드 (/admin/dashboard) — 대형 raw SQL 집계. 원본대로 무가드.
import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
    controllers: [AdminDashboardController],
    providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
