// Backend/routes/board.router.js + controller/boardController.js의 포팅 (레거시 호환 /board).
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
// 라우트 선언 순서 = 원본 라우터 순서 ('/like/:boardId','/recent','/top-viewed' 포함).
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BoardService } from './board.service';
import { logger } from '../../logger/winston.logger';

@Controller('board')
export class BoardController {
    constructor(private readonly boardService: BoardService) {}

    // 게시판 목록
    @Get()
    async getBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const univIdx = req.query.univIdx as string;
            const { id, title, content } = req.query as Record<string, string>;

            if (!univIdx) {
                return res.status(400).json({ error: 'univIdx is required' });
            }

            const searchParams: Record<string, string> = {};
            if (id) searchParams.id = id;
            if (title) searchParams.title = title;
            if (content) searchParams.content = content;

            const boards = await this.boardService.getBoards(univIdx, searchParams);
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

            const detailBoard = await this.boardService.getBoardDetail(boardIdx);
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
            const boardData = req.body;
            const result = await this.boardService.insertBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 수정
    @Put('correct')
    async correctBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.boardService.correctBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 삭제
    @Delete('delete')
    async deleteBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.boardService.deleteBoard(boardData);
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

            const result = await this.boardService.toggleBoardLike(boardIdx, isLiked);
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

            const likeCount = await this.boardService.getBoardLike(boardId);
            res.status(200).json({ likeCount });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 최근순으로 게시된 게시글 목록 조회 (대학교 정보 포함)
    @Get('recent')
    async getRecentBoardsWithUnivInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.getRecentBoardsWithUnivInfo();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getRecentBoardsWithUnivInfo] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 대학교별로 게시판 조회수 기준 인기 후기 TOP10 조회
    @Get('top-viewed')
    async getTopViewedBoardsByUniversity(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.boardService.getTopViewedBoardsByUniversity();

            logger.info(`[getTopViewedBoardsByUniversity] 전체 대학교의 인기 후기 TOP10 조회 성공: ${(result as any).totalCount}개`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getTopViewedBoardsByUniversity] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }
}
