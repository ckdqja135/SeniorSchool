// Backend/routes/comment.router.js + controller/commentController.js의 포팅 (레거시 호환 /comment).
// 주의: 삭제는 원본에서 DELETE가 아니라 PUT /delete 다.
import { Controller, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CommentService } from './comment.service';
import { logger } from '../../logger/winston.logger';

@Controller('comment')
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    // 댓글 조회
    @Get()
    async getComments(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx } = req.query as Record<string, string>;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const comments = await this.commentService.getComments(boardIdx);
            return res.status(200).json(comments);
        } catch (error) {
            logger.error(`[getComments] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 댓글 추가
    @Post('insert')
    async insertComment(@Req() req: Request, @Res() res: Response) {
        try {
            const {
                commentWriter,
                commentPw,
                commentContent,
                boardIdx,
                parentIdx,
                depth,
                commentLike
            } = req.body;

            // 입력값 파싱 및 유효성 검사
            const commentData = {
                commentWriter,
                commentPw,
                commentContent,
                boardIdx: parseInt(boardIdx),
                parentIdx: parseInt(parentIdx),
                depth: parseInt(depth),
                commentLike: parseInt(commentLike)
            };

            await this.commentService.insertComment(commentData);
            return res.status(200).json({ success: true, message: 'Comment inserted successfully' });
        } catch (error) {
            logger.error(`[insertComment] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 댓글 수정
    @Put('modify')
    async modifyComment(@Req() req: Request, @Res() res: Response) {
        try {
            const { commentPw, commentIdx, commentContent } = req.body;

            const isUpdated = await this.commentService.modifyComment({ commentPw, commentIdx, commentContent });

            if (isUpdated) {
                return res.status(200).json({ success: true, message: 'Comment updated successfully' });
            } else {
                return res.status(404).json({ error: 'Comment not found or password incorrect' });
            }
        } catch (error) {
            logger.error(`[modifyComment] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 댓글 삭제 (원본: PUT /delete)
    @Put('delete')
    async deleteComment(@Req() req: Request, @Res() res: Response) {
        try {
            const { commentPw, commentIdx } = req.body;

            const isDeleted = await this.commentService.deleteComment({ commentPw, commentIdx });

            if (isDeleted) {
                return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
            } else {
                return res.status(404).json({ error: 'Comment not found or password incorrect' });
            }
        } catch (error) {
            logger.error(`[deleteComment] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
