// Backend/controller/dynamic/dynamicServiceController.js 포팅 — 퍼블릭 서비스 목록.
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { DynamicServiceService } from './dynamic-service.service';
import { logger } from '../../logger/winston.logger';

@Controller('services')
export class DynamicServiceController {
    constructor(private readonly dynamicServiceService: DynamicServiceService) {}

    // 퍼블릭 서비스 목록 조회 (active 상태만)
    @Get()
    async listActiveServices(@Res() res: Response) {
        try {
            const data = await this.dynamicServiceService.listActiveServices();
            return res.status(200).json({ status: 200, data });
        } catch (error) {
            logger.error(`[public.services.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
