// Backend/routes/admin/report.router.js + controller/admin/reportController.js 포팅.
// 가드: POST /createReport는 무가드(일반 사용자 신고 등록) → @Public(). 나머지 4개는 authenticateToken+isAdmin.
// 각 메서드는 원본처럼 자체 try/catch로 고유 500 메시지를 반환한다.
import { Controller, Get, Post, Put, Delete, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { logger } from '../../../logger/winston.logger';
import { AdminReportService } from './admin-report.service';

@Controller('admin/report')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReportController {
    constructor(private readonly service: AdminReportService) {}

    // 신고 게시판 등록 (무가드 — 일반 사용자)
    @Public()
    @Post('createReport')
    async createReport(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.createReport(req.body);
            res.status(201).json(result);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ message: '신고 등록 실패' });
        }
    }

    // 신고 리스트
    @Get('getReports')
    async getReports(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.getReports(req.query);
            res.status(200).json(result);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ message: '신고 조회 실패' });
        }
    }

    // 신고 상세
    @Get('getReportDetail')
    async getReportDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.getReportDetail(req.query);
            res.status(200).json(result);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ message: '상세 조회 실패' });
        }
    }

    // 신고 상태 업데이트
    @Put('updateReportStatus')
    async updateReportStatus(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.updateReportStatus(req.body);
            res.status(200).json(result);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ message: '신고 상태 업데이트 실패' });
        }
    }

    // 신고 게시판 삭제
    @Delete('deleteReportBoard')
    async deleteReportBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.deleteReportBoard(req.body);
            res.status(200).json(result);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ message: '신고 게시판 삭제 실패' });
        }
    }
}
