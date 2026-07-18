// Backend/routes/outsourceComment.router.js + controller/outsourceCommentController.js의 포팅
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { OutsourceCommentService } from './outsource-comment.service';
import { logger } from '../../logger/winston.logger';

@Controller('outsource/comment')
export class OutsourceCommentController {
    constructor(private readonly outsourceCommentService: OutsourceCommentService) {}

    // 외주업체 댓글 조회
    @Get()
    async getOutsourceComments(@Req() req: Request, @Res() res: Response) {
        try {
            const boardIdx = req.query.boardIdx as string;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const comments = await this.outsourceCommentService.getOutsourceComments(boardIdx);
            res.status(200).json(comments);
        } catch (error) {
            logger.error(`[getOutsourceComments] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 댓글 추가
    @Post('insert')
    async insertOutsourceComment(@Req() req: Request, @Res() res: Response) {
        try {
            const commentData = req.body;

            // 필수 필드 검증 (프론트엔드 필드명에 맞춰 수정)
            if (!commentData.boardIdx || !commentData.writerId || !commentData.writerPw || !commentData.commentContent) {
                return res.status(400).json({ error: 'Required fields missing: boardIdx, writerId, writerPw, commentContent' });
            }

            const result = await this.outsourceCommentService.insertOutsourceComment(commentData);
            res.status(201).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[insertOutsourceComment] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 댓글 수정
    @Put('modify')
    async modifyOutsourceComment(@Req() req: Request, @Res() res: Response) {
        try {
            const commentData = req.body;

            // 필수 필드 검증
            if (!commentData.commentIdx || !commentData.commentWriter || !commentData.commentPw) {
                return res.status(400).json({ error: 'Required fields missing: commentIdx, commentWriter, commentPw' });
            }

            const result = await this.outsourceCommentService.modifyOutsourceComment(commentData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[modifyOutsourceComment] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 댓글 삭제
    @Delete('delete')
    async deleteOutsourceComment(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[deleteOutsourceComment Controller] Request received`);
            logger.info(`[deleteOutsourceComment Controller] Request body: ${JSON.stringify(req.body)}`);

            const commentData = req.body;

            // 필수 필드 검증 - commentWriter 필수 조건 제거
            if (!commentData.commentIdx || !commentData.commentPw) {
                logger.error(`[deleteOutsourceComment Controller] Required fields missing: commentIdx, commentPw`);
                return res.status(400).json({ error: 'Required fields missing: commentIdx, commentPw' });
            }

            logger.info(`[deleteOutsourceComment Controller] Calling service...`);
            const result = await this.outsourceCommentService.deleteOutsourceComment(commentData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[deleteOutsourceComment Controller] Error: ${error.message}`);
            logger.error(`[deleteOutsourceComment Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
