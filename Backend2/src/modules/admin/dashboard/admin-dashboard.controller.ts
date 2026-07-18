// Backend/routes/admin/dashboard.router.js + controller/admin/dashboardController.js 포팅.
// 주의: 원본 dashboard.router에는 authenticateToken/isAdmin 가드가 전혀 없다(무가드).
//   계약 보존을 위해 그대로 무가드로 둔다. (보안상 admin 가드가 필요하면 별도 결정 필요 — DEVIATIONS 참조)
import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from '../../../logger/winston.logger';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
export class AdminDashboardController {
    constructor(private readonly service: AdminDashboardService) {}

    // 대시보드 개요 통계
    @Get('overview')
    async getDashboardOverview(@Res() res: Response) {
        try {
            logger.info('[getDashboardOverview] Request received');
            const result = await this.service.getDashboardOverview();
            logger.info('[getDashboardOverview] Success');
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error(`[getDashboardOverview] Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: '대시보드 개요 조회 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    }

    // 월별 통계
    @Get('monthly-stats')
    async getMonthlyStats(@Res() res: Response) {
        try {
            logger.info('[getMonthlyStats] Request received');
            const result = await this.service.getMonthlyStats();
            logger.info(`[getMonthlyStats] Success: ${result.length} months retrieved`);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error(`[getMonthlyStats] Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: '월별 통계 조회 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    }

    // 최근 활동
    @Get('recent-activities')
    async getRecentActivities(@Req() req: Request, @Res() res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            logger.info(`[getRecentActivities] Request received - limit: ${limit}`);
            const result = await this.service.getRecentActivities(limit);
            logger.info(`[getRecentActivities] Success: ${result.length} activities retrieved`);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error(`[getRecentActivities] Error: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: '최근 활동 조회 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    }
}
