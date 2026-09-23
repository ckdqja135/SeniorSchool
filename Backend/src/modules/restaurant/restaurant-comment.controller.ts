// Backend/routes/restaurantComment.router.js + controller/restaurantCommentController.js의 포팅.
// 마운트 경로는 'restaurant/comment' (단수형). 응답 상태코드/바디를 원본과 동일하게 @Res()로 직접 반환.
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { RestaurantCommentService } from './restaurant-comment.service';
import { logger } from '../../logger/winston.logger';

@Controller('restaurant/comment')
export class RestaurantCommentController {
    constructor(private readonly restaurantCommentService: RestaurantCommentService) {}

    // 식당 댓글 조회
    @Get()
    async getRestaurantComments(@Req() req: Request, @Res() res: Response) {
        try {
            const boardIdx = req.query.boardIdx as string;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const comments = await this.restaurantCommentService.getRestaurantComments(boardIdx);
            res.status(200).json(comments);
        } catch (error) {
            logger.error(`[getRestaurantComments] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 댓글 추가
    @Post('insert')
    async insertRestaurantComment(@Req() req: Request, @Res() res: Response) {
        try {
            const {
                writerId,
                writerPw,
                commentContent,
                boardIdx,
                parentIdx,
                commentParent, // 프론트엔드에서 보내는 필드명
                commentDepth,
            } = req.body;

            // 입력값 파싱 및 유효성 검사
            // commentParent: 대댓글인 경우 부모 댓글 인덱스, 일반 댓글인 경우 null (서비스에서 최근 댓글 인덱스 + 1로 설정됨)
            let parsedCommentParent: number | null = null;
            if (commentParent !== undefined && commentParent !== null && commentParent !== '') {
                parsedCommentParent = parseInt(commentParent);
            } else if (parentIdx !== undefined && parentIdx !== null && parentIdx !== '') {
                parsedCommentParent = parseInt(parentIdx);
            }

            const commentData = {
                writerId,
                writerPw,
                commentContent,
                boardIdx: parseInt(boardIdx),
                commentParent: parsedCommentParent,
                commentDepth: commentDepth !== undefined ? parseInt(commentDepth) : 0,
            };

            // 필수 필드 검증
            if (!commentData.boardIdx || !commentData.writerId || !commentData.writerPw || !commentData.commentContent) {
                return res.status(400).json({ error: 'Required fields missing: boardIdx, writerId, writerPw, commentContent' });
            }

            const result = await this.restaurantCommentService.insertRestaurantComment(commentData);
            res.status(201).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[insertRestaurantComment] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 댓글 수정
    @Put('modify')
    async modifyRestaurantComment(@Req() req: Request, @Res() res: Response) {
        try {
            const commentData = req.body;

            // 필수 필드 검증
            if (!commentData.commentIdx || !commentData.commentWriter || !commentData.commentPw) {
                return res.status(400).json({ error: 'Required fields missing: commentIdx, commentWriter, commentPw' });
            }

            const result = await this.restaurantCommentService.modifyRestaurantComment(commentData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[modifyRestaurantComment] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 댓글 삭제
    @Delete('delete')
    async deleteRestaurantComment(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[deleteRestaurantComment Controller] Request received`);
            logger.info(`[deleteRestaurantComment Controller] Request body: ${JSON.stringify(req.body)}`);

            const commentData = req.body;

            // 필수 필드 검증 - commentWriter 필수 조건 제거
            if (!commentData.commentIdx || !commentData.commentPw) {
                logger.error(`[deleteRestaurantComment Controller] Required fields missing: commentIdx, commentPw`);
                return res.status(400).json({ error: 'Required fields missing: commentIdx, commentPw' });
            }

            logger.info(`[deleteRestaurantComment Controller] Calling service...`);
            const result = await this.restaurantCommentService.deleteRestaurantComment(commentData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[deleteRestaurantComment Controller] Error: ${error.message}`);
            logger.error(`[deleteRestaurantComment Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
