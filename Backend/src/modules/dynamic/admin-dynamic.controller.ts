// Backend/routes/admin/serviceConfig.router.js의 slug 기반 어드민 관리 라우트 포팅
// (controller/admin/dynamicEntityController.js, dynamicBoardController.js, dynamicRequestController.js).
// 원본 순서: authenticateToken → isAdmin → slugResolver → 핸들러.
// 가드 순서로 재현: @UseGuards(JwtAuthGuard, AdminGuard, SlugResolverGuard).
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DynamicEntityService } from './dynamic-entity.service';
import { DynamicBoardService } from './dynamic-board.service';
import { DynamicRequestService } from './dynamic-request.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SlugResolverGuard } from './slug-resolver.guard';
import { logger } from '../../logger/winston.logger';

@Controller('admin/services/:slug')
@UseGuards(JwtAuthGuard, AdminGuard, SlugResolverGuard)
export class AdminDynamicController {
    constructor(
        private readonly entityService: DynamicEntityService,
        private readonly boardService: DynamicBoardService,
        private readonly requestService: DynamicRequestService,
    ) {}

    // ── 엔티티 관리 ──

    // 어드민 엔티티 검색 — 원본은 listEntities를 그대로 재사용
    @Get('search')
    async searchEntities(@Req() req: Request, @Res() res: Response) {
        try {
            const r = req as any;
            const result = await this.entityService.listEntities(r.dynamicTables, r.fieldConfigs, r.serviceConfig, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicEntity.search] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Post('entities')
    async createEntity(@Req() req: Request, @Res() res: Response) {
        try {
            const r = req as any;
            const result = await this.entityService.createEntity(r.dynamicTables, r.fieldConfigs, r.serviceConfig, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicEntity.create] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Put('entities/:id')
    async updateEntity(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const r = req as any;
            const result = await this.entityService.updateEntity(r.dynamicTables, r.fieldConfigs, r.serviceConfig, id, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicEntity.update] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Delete('entities/:id')
    async deleteEntity(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.entityService.deleteEntity((req as any).dynamicTables, id);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicEntity.delete] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // ── 게시판 관리 ──

    @Get('board')
    async listBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.listBoards((req as any).dynamicTables, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicBoard.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Delete('board/:id')
    async deleteBoard(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.deleteBoard((req as any).dynamicTables, id);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicBoard.delete] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // ── 추가 요청 관리 ──

    @Get('requests')
    async listRequests(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.requestService.listRequests((req as any).dynamicTables, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicRequest.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Put('requests/:id')
    async updateRequestStatus(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.requestService.updateRequestStatus((req as any).dynamicTables, id, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.dynamicRequest.updateStatus] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
