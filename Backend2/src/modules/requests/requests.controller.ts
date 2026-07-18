// Backend/routes/requests.router.js + controller/requestsController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestsService } from './requests.service';
import { logger } from '../../logger/winston.logger';

@Controller('requests')
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) {}

    // 모든 오빠 서비스의 최근 신청 현황 (공개)
    @Get('recent')
    async getRecentRequests(@Req() req: Request, @Res() res: Response) {
        try {
            const { limit } = req.query as Record<string, string>;
            const data = await this.requestsService.getRecentRequests({ limit });
            res.status(200).json({ status: 200, data, totalCount: data.length });
        } catch (error) {
            logger.error(`[getRecentRequests] Error: ${error.message}`);
            res.status(500).json({ status: 500, message: '신청 현황을 불러오지 못했습니다.' });
        }
    }
}
