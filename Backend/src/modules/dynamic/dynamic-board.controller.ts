// Backend/controller/dynamic/dynamicBoardController.js 포팅 (퍼블릭 게시판).
// 라우트 선언 순서 = 원본 (recent/top-viewed를 :id보다 먼저, insert/:id/like는 POST).
import { Controller, Get, Post, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DynamicBoardService } from './dynamic-board.service';
import { SlugResolverGuard } from './slug-resolver.guard';
import { logger } from '../../logger/winston.logger';

@Controller('services/:slug/boards')
@UseGuards(SlugResolverGuard)
export class DynamicBoardController {
    constructor(private readonly boardService: DynamicBoardService) {}

    @Get()
    async listBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.listBoards((req as any).dynamicTables, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.board.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Get('recent')
    async getRecentBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.getRecentBoards((req as any).dynamicTables, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.board.recent] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Get('top-viewed')
    async getTopViewedBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.getTopViewedBoards((req as any).dynamicTables, req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.board.topViewed] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Get(':id')
    async getBoardDetail(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.getBoardDetail((req as any).dynamicTables, id);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.board.detail] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Post('insert')
    async insertBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.insertBoard((req as any).dynamicTables, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.board.insert] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Post(':id/like')
    async toggleBoardLike(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.toggleBoardLike((req as any).dynamicTables, id);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.board.like] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
