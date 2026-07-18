// Backend/routes/admin/pageView.router.js + controller/admin/pageViewController.js 포팅.
// POST /track은 무가드(공개 방문기록) → @Public(). 나머지 통계 4개는 authenticateToken+isAdmin.
import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { logger } from '../../../logger/winston.logger';
import { AdminPageViewService } from './admin-pageview.service';

@Controller('admin/pageview')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPageViewController {
    constructor(private readonly service: AdminPageViewService) {}

    // 방문 기록 저장 (공개)
    @Public()
    @Post('track')
    async track(@Req() req: Request, @Res() res: Response) {
        try {
            const { path, referrer } = req.body;
            if (!path) return res.status(400).json({ success: false, message: 'path is required' });

            const xff = req.headers['x-forwarded-for'] as string | undefined;
            const ip = xff?.split(',')[0]?.trim() || req.ip;
            const userAgent = (req.headers['user-agent'] as string) || null;
            const referer = referrer || (req.headers['referer'] as string) || null;

            await this.service.trackPageView({ path, ip: ip || null, userAgent, referer });
            return res.status(200).json({ success: true });
        } catch (error) {
            logger.error(`[pageView.track] ${error.message}`);
            return res.status(500).json({ success: false });
        }
    }

    // 경로별 방문 통계
    @Get('path-stats')
    async getPathStats(@Req() req: Request, @Res() res: Response) {
        try {
            const { startDate, endDate, limit } = req.query as any;
            const data = await this.service.getPathStats({ startDate, endDate, limit });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            logger.error(`[pageView.getPathStats] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // Referer별 통계
    @Get('referer-stats')
    async getRefererStats(@Req() req: Request, @Res() res: Response) {
        try {
            const { startDate, endDate, limit } = req.query as any;
            const data = await this.service.getRefererStats({ startDate, endDate, limit });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            logger.error(`[pageView.getRefererStats] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // 일별 방문 수
    @Get('daily-stats')
    async getDailyStats(@Req() req: Request, @Res() res: Response) {
        try {
            const { startDate, endDate } = req.query as any;
            const data = await this.service.getDailyStats({ startDate, endDate });
            return res.status(200).json({ success: true, data });
        } catch (error) {
            logger.error(`[pageView.getDailyStats] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // 최근 방문 로그
    @Get('logs')
    async getRecentLogs(@Req() req: Request, @Res() res: Response) {
        try {
            const { page, rowsPerPage, path, startDate, endDate, order } = req.query as any;
            const data = await this.service.getRecentLogs({ page, rowsPerPage, path, startDate, endDate, order });
            return res.status(200).json({ success: true, ...data });
        } catch (error) {
            logger.error(`[pageView.getRecentLogs] ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
