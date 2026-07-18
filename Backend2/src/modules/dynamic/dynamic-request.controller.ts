// Backend/controller/dynamic/dynamicRequestController.js 포팅 (퍼블릭 추가 요청).
import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DynamicRequestService } from './dynamic-request.service';
import { SlugResolverGuard } from './slug-resolver.guard';
import { logger } from '../../logger/winston.logger';

@Controller('services/:slug/requests')
@UseGuards(SlugResolverGuard)
export class DynamicRequestController {
    constructor(private readonly requestService: DynamicRequestService) {}

    @Post()
    async createRequest(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.requestService.createRequest((req as any).dynamicTables, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.request.create] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
