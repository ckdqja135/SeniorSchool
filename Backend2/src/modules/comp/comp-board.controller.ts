// Backend/routes/compBoard.router.js + controller/compBoardController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CompBoardService } from './comp-board.service';
import { logger } from '../../logger/winston.logger';

// 평점 검증 함수 (0.5 ~ 5.0, 0.5 단위) — 원본 controller/compBoardController.js의 parseBoardRating
const parseBoardRating = (rating: any) => {
    if (rating === undefined || rating === null || rating === '') {
        return null;
    }

    const numericRating = parseFloat(rating);
    if (
        Number.isNaN(numericRating) ||
        numericRating < 0.5 ||
        numericRating > 5.0 ||
        !Number.isInteger(numericRating * 2)
    ) {
        const error: any = new Error('INVALID_RATING');
        error.code = 'INVALID_RATING';
        throw error;
    }

    return numericRating;
};

@Controller('comp/board')
export class CompBoardController {
    constructor(private readonly compBoardService: CompBoardService) {}

    // 게시판 목록
    @Get()
    async getBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const compIdx = req.query.compIdx as string;
            const { id, title, content } = req.query as Record<string, string>;

            if (!compIdx) {
                return res.status(400).json({ error: 'compIdx is required' });
            }

            // 검색 매개변수 구성
            const searchParams: Record<string, string> = {};
            if (id) searchParams.id = id;
            if (title) searchParams.title = title;
            if (content) searchParams.content = content;

            const boards = await this.compBoardService.getBoards(compIdx, searchParams);
            res.status(200).json(boards);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 상세보기
    @Get('detail')
    async getBoardDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const boardIdx = req.query.boardIdx as string;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const detailBoard = await this.compBoardService.getBoardDetail(boardIdx);
            res.status(200).json(detailBoard);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 등록
    @Post('insert')
    async insertBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = {
                ...req.body,
                boardRating: parseBoardRating(req.body.boardRating)
            };
            const result = await this.compBoardService.insertBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            if (error.code === 'INVALID_RATING') {
                return res.status(400).json({
                    success: false,
                    error: '평점은 0.5부터 5.0 사이의 0.5 단위 값이어야 합니다.'
                });
            }
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 수정
    @Put('correct')
    async correctBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = {
                ...req.body,
                boardRating: parseBoardRating(req.body.boardRating)
            };
            const result = await this.compBoardService.correctBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            if (error.code === 'INVALID_RATING') {
                return res.status(400).json({
                    success: false,
                    error: '평점은 0.5부터 5.0 사이의 0.5 단위 값이어야 합니다.'
                });
            }
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 삭제
    @Delete('delete')
    async deleteBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.compBoardService.deleteBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 좋아요 토글
    @Post('like')
    async toggleBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx, isLiked } = req.body;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            if (typeof isLiked !== 'boolean') {
                return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
            }

            const result = await this.compBoardService.toggleBoardLike(boardIdx, isLiked);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 좋아요 조회
    @Get('like/:boardId')
    async getBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardId } = req.params;

            if (!boardId) {
                return res.status(400).json({ error: 'boardId is required' });
            }

            const likeCount = await this.compBoardService.getBoardLike(boardId);
            res.status(200).json({ likeCount });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 최근순으로 게시된 게시글 목록 조회 (회사 정보 포함)
    @Get('recent')
    async getRecentBoardsWithCompInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.compBoardService.getRecentBoardsWithCompInfo();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getRecentBoardsWithCompInfo] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
