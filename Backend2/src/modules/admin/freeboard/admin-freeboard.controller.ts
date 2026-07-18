// Backend/routes/admin/freeBoard.router.js + controller/admin/freeBoardController.js 포팅.
// 4개 라우트 전부 authenticateToken+isAdmin → 클래스 레벨 @UseGuards. 컨트롤러는 catch→500 {status,message}.
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { logger } from '../../../logger/winston.logger';
import { AdminFreeBoardService } from './admin-freeboard.service';

@Controller('admin/freeboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFreeBoardController {
    constructor(private readonly service: AdminFreeBoardService) {}

    @Get()
    async getPosts(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.listPosts(req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.freeboard.controller.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Post()
    async createPost(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.createPost(req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.freeboard.controller.create] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Put(':boardIdx')
    async updatePost(@Param('boardIdx') boardIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.updatePost(boardIdx, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.freeboard.controller.update] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Delete(':boardIdx')
    async deletePost(@Param('boardIdx') boardIdx: string, @Res() res: Response) {
        try {
            const result = await this.service.deletePost(boardIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[admin.freeboard.controller.delete] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
