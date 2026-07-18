// Backend/controller/dynamic/dynamicEntityController.js 포팅 (퍼블릭 엔티티).
// slugResolver 미들웨어가 req.dynamicTables/fieldConfigs/serviceConfig를 주입한다.
// 라우트 선언 순서 = 원본 (top-viewed/auto-search를 :id보다 먼저).
import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DynamicEntityService } from './dynamic-entity.service';
import { SlugResolverGuard } from './slug-resolver.guard';
import { logger } from '../../logger/winston.logger';

@Controller('services/:slug/entities')
@UseGuards(SlugResolverGuard)
export class DynamicEntityController {
    constructor(private readonly entityService: DynamicEntityService) {}

    @Get()
    async listEntities(@Req() req: Request, @Res() res: Response) {
        try {
            const r = req as any;
            const result = await this.entityService.listEntities(r.dynamicTables, r.fieldConfigs, r.serviceConfig, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.entity.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Get('top-viewed')
    async getTopViewed(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.entityService.getTopViewed((req as any).dynamicTables, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.entity.topViewed] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Get('auto-search')
    async autoSearch(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.entityService.autoSearch((req as any).dynamicTables, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.entity.autoSearch] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Get(':id')
    async getEntityDetail(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.entityService.getEntityDetail((req as any).dynamicTables, id);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.entity.detail] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
