// Backend/controller/dynamic/dynamicCommentController.js 포팅 (퍼블릭 댓글).
import { Controller, Get, Post, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DynamicCommentService } from './dynamic-comment.service';
import { SlugResolverGuard } from './slug-resolver.guard';
import { logger } from '../../logger/winston.logger';

@Controller('services/:slug/comments')
@UseGuards(SlugResolverGuard)
export class DynamicCommentController {
    constructor(private readonly commentService: DynamicCommentService) {}

    @Get(':boardId')
    async listComments(@Param('boardId') boardId: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.commentService.listComments((req as any).dynamicTables, boardId);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.comment.list] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Post()
    async createComment(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.commentService.createComment((req as any).dynamicTables, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.comment.create] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    @Delete(':id')
    async deleteComment(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.commentService.deleteComment((req as any).dynamicTables, id, req.body.password);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[dynamic.comment.delete] ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
