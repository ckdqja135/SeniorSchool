// Backend/routes/admin/serviceConfig.router.js + controller/admin/serviceConfigController.js 포팅.
// 서비스 설정 CRUD (/admin/services). 원본: authenticateToken + isAdmin → JwtAuthGuard + AdminGuard.
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ServiceConfigService } from './service-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { logger } from '../../logger/winston.logger';

@Controller('admin/services')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminServiceConfigController {
    constructor(private readonly serviceConfigService: ServiceConfigService) {}

    @Get()
    async listServices(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.serviceConfigService.listServices(req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.serviceConfig.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Post()
    async createService(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.serviceConfigService.createService(req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.serviceConfig.create] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Get(':slug')
    async getService(@Param('slug') slug: string, @Res() res: Response) {
        try {
            const result = await this.serviceConfigService.getServiceBySlug(slug);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.serviceConfig.get] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Put(':slug')
    async updateService(@Param('slug') slug: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.serviceConfigService.updateService(slug, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.serviceConfig.update] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Delete(':slug')
    async deleteService(@Param('slug') slug: string, @Res() res: Response) {
        try {
            const result = await this.serviceConfigService.deleteService(slug);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.serviceConfig.delete] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
