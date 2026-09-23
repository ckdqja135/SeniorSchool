// Backend/routes/churchComment.router.js + controller/churchCommentController.js의 포팅
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChurchCommentService } from './church-comment.service';
import { logger } from '../../logger/winston.logger';

@Controller('church/comment')
export class ChurchCommentController {
    constructor(private readonly churchCommentService: ChurchCommentService) {}

    // 교회 댓글 조회
    @Get()
    async getChurchComments(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx } = req.query as Record<string, string>;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const comments = await this.churchCommentService.getChurchComments(boardIdx);
            return res.status(200).json(comments);
        } catch (error) {
            logger.error(`[getChurchComments] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 댓글 추가
    @Post('insert')
    async insertChurchComment(@Req() req: Request, @Res() res: Response) {
        try {
            const {
                commentWriter,
                commentID,
                commentPw,
                commentContent,
                boardIdx,
                parentIdx,
                commentParent,  // 프론트엔드에서 보내는 필드명
                depth,
                commentDepth,   // 프론트엔드에서 보내는 필드명
                commentLike
            } = req.body;

            // 입력값 파싱 및 유효성 검사
            const commentData = {
                commentWriter: commentWriter || commentID,  // commentWriter가 없으면 commentID 사용
                commentPw,
                commentContent,
                boardIdx: parseInt(boardIdx),
                parentIdx: parseInt(parentIdx || commentParent) || 0,  // parentIdx가 없으면 commentParent 사용
                depth: parseInt(depth || commentDepth) || 0,  // depth가 없으면 commentDepth 사용
                commentLike: parseInt(commentLike) || 0  // 기본값 0
            };

            await this.churchCommentService.insertChurchComment(commentData);
            return res.status(200).json({ success: true, message: 'Comment inserted successfully' });
        } catch (error) {
            logger.error(`[insertChurchComment] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 댓글 수정
    @Put('modify')
    async modifyChurchComment(@Req() req: Request, @Res() res: Response) {
        try {
            const { commentPw, commentIdx, commentContent } = req.body;

            const isUpdated = await this.churchCommentService.modifyChurchComment({ commentPw, commentIdx, commentContent });

            if (isUpdated) {
                return res.status(200).json({ success: true, message: 'Comment updated successfully' });
            } else {
                return res.status(404).json({ error: 'Comment not found or password incorrect' });
            }
        } catch (error) {
            logger.error(`[modifyChurchComment] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 댓글 삭제
    @Delete('delete')
    async deleteChurchComment(@Req() req: Request, @Res() res: Response) {
        try {
            const { commentPw, commentIdx } = req.body;

            const isDeleted = await this.churchCommentService.deleteChurchComment({ commentPw, commentIdx });

            if (isDeleted) {
                return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
            } else {
                return res.status(404).json({ error: 'Comment not found or password incorrect' });
            }
        } catch (error) {
            logger.error(`[deleteChurchComment] ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
