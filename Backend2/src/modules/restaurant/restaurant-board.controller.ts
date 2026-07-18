// Backend/routes/restaurantBoard.router.js + controller/restaurantBoardController.js의 포팅.
// 마운트 경로는 'restaurant/boards' (복수형). 응답 상태코드/바디를 원본과 동일하게 @Res()로 직접 반환.
// 라우터 선언 순서(recent → 목록 → detail/:boardIdx → insert → correct → delete → like → like/:boardId)를 유지.
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { RestaurantBoardService } from './restaurant-board.service';
import { logger } from '../../logger/winston.logger';

@Controller('restaurant/boards')
export class RestaurantBoardController {
    constructor(private readonly restaurantBoardService: RestaurantBoardService) {}

    // 최근순으로 게시된 식당 게시글 목록 조회 (식당 정보 포함)
    @Get('recent')
    async getRecentRestaurantBoardsWithRestaurantInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.restaurantBoardService.getRecentRestaurantBoardsWithRestaurantInfo();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getRecentRestaurantBoardsWithRestaurantInfo] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 게시판 목록
    @Get()
    async getRestaurantBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const restaurantIdx = req.query.restaurantIdx as string;
            const { id, title, content } = req.query as Record<string, string>;

            if (!restaurantIdx) {
                return res.status(400).json({ error: 'restaurantIdx is required' });
            }

            // 검색 매개변수 구성
            const searchParams: Record<string, string> = {};
            if (id) searchParams.id = id;
            if (title) searchParams.title = title;
            if (content) searchParams.content = content;

            const boards = await this.restaurantBoardService.getRestaurantBoards(restaurantIdx, searchParams);
            res.status(200).json(boards);
        } catch (error) {
            logger.error(`[getRestaurantBoards] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 게시판 상세보기
    @Get('detail/:boardIdx')
    async getRestaurantBoardDetail(@Req() req: Request, @Res() res: Response) {
        try {
            // 경로 파라미터 또는 쿼리 파라미터에서 boardIdx 가져오기
            const boardIdx = req.params.boardIdx || (req.query.boardIdx as string);

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const detailBoard = await this.restaurantBoardService.getRestaurantBoardDetail(boardIdx);
            res.status(200).json(detailBoard);
        } catch (error) {
            logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 게시판 등록
    @Post('insert')
    async insertRestaurantBoard(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[insertRestaurantBoard Controller] Request received`);
            logger.info(`[insertRestaurantBoard Controller] Request body: ${JSON.stringify(req.body)}`);

            const boardData = req.body;

            if (!boardData) {
                logger.error(`[insertRestaurantBoard Controller] boardData is null or undefined`);
                return res.status(400).json({ error: 'Request body is required' });
            }

            logger.info(`[insertRestaurantBoard Controller] Calling service...`);
            const result = await this.restaurantBoardService.insertRestaurantBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[insertRestaurantBoard Controller] Error: ${error.message}`);
            logger.error(`[insertRestaurantBoard Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 게시판 수정
    @Put('correct')
    async correctRestaurantBoard(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[correctRestaurantBoard Controller] Request received`);
            logger.info(`[correctRestaurantBoard Controller] Request body: ${JSON.stringify(req.body)}`);

            const boardData = req.body;

            if (!boardData) {
                logger.error(`[correctRestaurantBoard Controller] boardData is null or undefined`);
                return res.status(400).json({ error: 'Request body is required' });
            }

            logger.info(`[correctRestaurantBoard Controller] Calling service...`);
            const result = await this.restaurantBoardService.correctRestaurantBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[correctRestaurantBoard Controller] Error: ${error.message}`);
            logger.error(`[correctRestaurantBoard Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 게시판 삭제
    @Delete('delete')
    async deleteRestaurantBoard(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[deleteRestaurantBoard Controller] Request received`);
            logger.info(`[deleteRestaurantBoard Controller] Request body: ${JSON.stringify(req.body)}`);

            const boardData = req.body;

            if (!boardData) {
                logger.error(`[deleteRestaurantBoard Controller] boardData is null or undefined`);
                return res.status(400).json({ error: 'Request body is required' });
            }

            logger.info(`[deleteRestaurantBoard Controller] Calling service...`);
            const result = await this.restaurantBoardService.deleteRestaurantBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[deleteRestaurantBoard Controller] Error: ${error.message}`);
            logger.error(`[deleteRestaurantBoard Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 게시판 좋아요 토글
    @Post('like')
    async toggleRestaurantBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx, isLiked } = req.body;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            if (typeof isLiked !== 'boolean') {
                return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
            }

            const result = await this.restaurantBoardService.toggleRestaurantBoardLike(boardIdx, isLiked);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            logger.error(`[toggleRestaurantBoardLike] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 게시판 좋아요 조회
    @Get('like/:boardId')
    async getRestaurantBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardId } = req.params;

            if (!boardId) {
                return res.status(400).json({ error: 'boardId is required' });
            }

            const likeCount = await this.restaurantBoardService.getRestaurantBoardLike(boardId);
            res.status(200).json({ likeCount });
        } catch (error) {
            logger.error(`[getRestaurantBoardLike] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
