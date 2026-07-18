// Backend/routes/churchBoard.router.js + controller/churchBoardController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChurchBoardService } from './church-board.service';
import { logger } from '../../logger/winston.logger';

@Controller('church/board')
export class ChurchBoardController {
    constructor(private readonly churchBoardService: ChurchBoardService) {}

    // 교회 게시판 목록
    @Get()
    async getChurchBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const churchIdx = req.query.churchIdx as string;
            const { id, title, content } = req.query as Record<string, string>;

            if (!churchIdx) {
                return res.status(400).json({ error: 'churchIdx is required' });
            }

            // 검색 매개변수 구성
            const searchParams: Record<string, string> = {};
            if (id) searchParams.id = id;
            if (title) searchParams.title = title;
            if (content) searchParams.content = content;

            const boards = await this.churchBoardService.getChurchBoards(churchIdx, searchParams);
            res.status(200).json(boards);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 게시판 상세보기
    @Get('detail')
    async getChurchBoardDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const boardIdx = req.query.boardIdx as string;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const detailBoard = await this.churchBoardService.getChurchBoardDetail(boardIdx);
            res.status(200).json(detailBoard);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 게시판 등록
    @Post('insert')
    async insertChurchBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.churchBoardService.insertChurchBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 게시판 수정
    @Put('correct')
    async correctChurchBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.churchBoardService.correctChurchBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 게시판 삭제
    @Delete('delete')
    async deleteChurchBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.churchBoardService.deleteChurchBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 게시판 좋아요 토글
    @Post('like')
    async toggleChurchBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx, isLiked } = req.body;

            logger.info(`[toggleChurchBoardLike Controller] Request received - boardIdx: ${boardIdx}, isLiked: ${isLiked}, IP: ${req.ip}`);

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            if (typeof isLiked !== 'boolean') {
                return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
            }

            const result = await this.churchBoardService.toggleChurchBoardLike(boardIdx, isLiked);
            res.status(200).json({
                success: true,
                boardIdx: String(boardIdx),
                isLiked: isLiked,
                likeCount: String(result.likeCount)
            });
        } catch (error) {
            logger.error(`[toggleChurchBoardLike Controller] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 게시판 좋아요 조회
    @Get('like/:boardId')
    async getChurchBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardId } = req.params;

            if (!boardId) {
                return res.status(400).json({ error: 'boardId is required' });
            }

            const likeCount = await this.churchBoardService.getChurchBoardLike(boardId);
            res.status(200).json({ likeCount });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * 최근순으로 게시된 교회 게시글 목록 조회 (교회 정보 포함)
     */
    @Get('recent')
    async getRecentChurchBoardsWithChurchInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.churchBoardService.getRecentChurchBoardsWithChurchInfo();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getRecentChurchBoardsWithChurchInfo] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * 전체 교회의 게시판 조회수 기준 인기 후기 TOP10 조회
     */
    @Get('top-viewed')
    async getTopViewedChurchBoardsByChurch(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.churchBoardService.getTopViewedChurchBoardsByChurch();

            logger.info(`[getTopViewedChurchBoardsByChurch] 전체 교회의 인기 후기 TOP10 조회 성공: ${result.totalCount}개`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getTopViewedChurchBoardsByChurch] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }
}
