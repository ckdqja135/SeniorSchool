// Backend/routes/report.router.js + controller/reportController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ReportService } from './report.service';
import { logger } from '../../logger/winston.logger';

@Controller('report')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    /**
     * 신고하기 API
     * POST /report
     * Body: { boardIdx, serviceType, reportReason, reporterId? }
     */
    @Post()
    async createReport(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx, serviceType, reportReason, reporterId } = req.body;

            // 필수값 검증
            if (!boardIdx || !serviceType || !reportReason) {
                return res.status(400).json({
                    success: false,
                    message: '필수값이 누락되었습니다. (boardIdx, serviceType, reportReason)',
                });
            }

            // 서비스 타입 검증
            const validServiceTypes = ['univ', 'company', 'church', 'restaurant', 'outsource', 'interview', 'freeboard'];
            if (!validServiceTypes.includes(serviceType)) {
                return res.status(400).json({
                    success: false,
                    message: '유효하지 않은 서비스 타입입니다.',
                });
            }

            const data = await this.reportService.createReport({ boardIdx, serviceType, reportReason, reporterId });

            res.status(201).json({
                success: true,
                message: '신고가 성공적으로 등록되었습니다.',
                data,
            });
        } catch (error) {
            logger.error(`[createReport] Error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: '신고 등록 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    }
}
