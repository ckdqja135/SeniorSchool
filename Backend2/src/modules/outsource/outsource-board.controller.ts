// Backend/routes/outsourceBoard.router.js + controller/outsourceBoardController.js의 포팅.
// routes/index.js:80에 따라 마운트 경로는 'outsource/boards' (복수형).
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { OutsourceBoardService } from './outsource-board.service';
import { logger } from '../../logger/winston.logger';

@Controller('outsource/boards')
export class OutsourceBoardController {
    constructor(private readonly outsourceBoardService: OutsourceBoardService) {}

    // 외주업체 게시판 목록
    @Get()
    async getOutsourceBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const outsourceIdx = req.query.outsourceIdx as string;
            const { id, title, content } = req.query as Record<string, string>;

            if (!outsourceIdx) {
                return res.status(400).json({ error: 'outsourceIdx is required' });
            }

            // 검색 매개변수 구성
            const searchParams: Record<string, string> = {};
            if (id) searchParams.id = id;
            if (title) searchParams.title = title;
            if (content) searchParams.content = content;

            const boards = await this.outsourceBoardService.getOutsourceBoards(outsourceIdx, searchParams);
            res.status(200).json(boards);
        } catch (error) {
            logger.error(`[getOutsourceBoards] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 게시판 상세보기
    @Get('detail')
    async getOutsourceBoardDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const boardIdx = req.query.boardIdx as string;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const detailBoard = await this.outsourceBoardService.getOutsourceBoardDetail(boardIdx);
            res.status(200).json(detailBoard);
        } catch (error) {
            logger.error(`[getOutsourceBoardDetail] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 게시판 등록
    @Post('insert')
    async insertOutsourceBoard(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[insertOutsourceBoard Controller] Request received`);
            logger.info(`[insertOutsourceBoard Controller] Request body: ${JSON.stringify(req.body)}`);

            const boardData = req.body;

            if (!boardData) {
                logger.error(`[insertOutsourceBoard Controller] boardData is null or undefined`);
                return res.status(400).json({ error: 'Request body is required' });
            }

            logger.info(`[insertOutsourceBoard Controller] Calling service...`);
            const result = await this.outsourceBoardService.insertOutsourceBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[insertOutsourceBoard Controller] Error: ${error.message}`);
            logger.error(`[insertOutsourceBoard Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 게시판 수정
    @Put('correct')
    async correctOutsourceBoard(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[correctOutsourceBoard Controller] Request received`);
            logger.info(`[correctOutsourceBoard Controller] Request body: ${JSON.stringify(req.body)}`);

            const boardData = req.body;

            if (!boardData) {
                logger.error(`[correctOutsourceBoard Controller] boardData is null or undefined`);
                return res.status(400).json({ error: 'Request body is required' });
            }

            logger.info(`[correctOutsourceBoard Controller] Calling service...`);
            const result = await this.outsourceBoardService.correctOutsourceBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[correctOutsourceBoard Controller] Error: ${error.message}`);
            logger.error(`[correctOutsourceBoard Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 게시판 삭제
    @Delete('delete')
    async deleteOutsourceBoard(@Req() req: Request, @Res() res: Response) {
        try {
            logger.info(`[deleteOutsourceBoard Controller] Request received`);
            logger.info(`[deleteOutsourceBoard Controller] Request body: ${JSON.stringify(req.body)}`);

            const boardData = req.body;

            if (!boardData) {
                logger.error(`[deleteOutsourceBoard Controller] boardData is null or undefined`);
                return res.status(400).json({ error: 'Request body is required' });
            }

            logger.info(`[deleteOutsourceBoard Controller] Calling service...`);
            const result = await this.outsourceBoardService.deleteOutsourceBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(`[deleteOutsourceBoard Controller] Error: ${error.message}`);
            logger.error(`[deleteOutsourceBoard Controller] Error stack: ${error.stack}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 게시판 좋아요 토글
    @Post('like')
    async toggleOutsourceBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx, isLiked } = req.body;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            if (typeof isLiked !== 'boolean') {
                return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
            }

            const result = await this.outsourceBoardService.toggleOutsourceBoardLike(boardIdx, isLiked);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            logger.error(`[toggleOutsourceBoardLike] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 게시판 좋아요 조회
    @Get('like/:boardId')
    async getOutsourceBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardId } = req.params;

            if (!boardId) {
                return res.status(400).json({ error: 'boardId is required' });
            }

            const likeCount = await this.outsourceBoardService.getOutsourceBoardLike(boardId);
            res.status(200).json({ likeCount });
        } catch (error) {
            logger.error(`[getOutsourceBoardLike] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 최근순으로 게시된 외주업체 게시글 목록 조회 (외주업체 정보 포함)
    @Get('recent')
    async getRecentOutsourceBoardsWithOutsourceInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.outsourceBoardService.getRecentOutsourceBoardsWithOutsourceInfo();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getRecentOutsourceBoardsWithOutsourceInfo] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체별로 후기 조회수 기준 인기 후기 TOP10 조회
    @Get('top-viewed')
    async getTopViewedOutsourceBoardsByOutsource(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.outsourceBoardService.getTopViewedOutsourceBoardsByOutsource();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getTopViewedOutsourceBoardsByOutsource] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
