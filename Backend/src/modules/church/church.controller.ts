// Backend/routes/church.router.js + controller/churchController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChurchService } from './church.service';
import { logger } from '../../logger/winston.logger';

@Controller('church')
export class ChurchController {
    constructor(private readonly churchService: ChurchService) {}

    // 교회 목록 조회
    @Get()
    async getChurches(@Req() req: Request, @Res() res: Response) {
        try {
            const { name, type, location } = req.query as Record<string, string>;

            const searchParams: Record<string, string> = {};
            if (name) searchParams.name = name;
            if (type) searchParams.type = type;
            if (location) searchParams.location = location;

            const churches = await this.churchService.getChurches(searchParams);
            res.status(200).json(churches);
        } catch (error) {
            logger.error(`[getChurches] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 상세 조회 (churchName, churchAddr로 조회 가능)
    @Get('church')
    async getChurchDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const { churchName, churchAddr } = req.query as Record<string, string>;

            // churchName, churchAddr 중 하나는 필수
            if (!churchName && !churchAddr) {
                return res.status(400).json({ error: 'churchName or churchAddr is required' });
            }

            const church = await this.churchService.getChurchDetail(null, churchName, churchAddr);
            res.status(200).json(church);
        } catch (error) {
            logger.error(`[getChurchDetail] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 수정
    @Put(':churchIdx')
    async updateChurch(@Req() req: Request, @Res() res: Response) {
        try {
            const { churchIdx } = req.params;
            const churchData = req.body;

            if (!churchIdx) {
                return res.status(400).json({ error: 'churchIdx is required' });
            }

            const result = await this.churchService.updateChurch(churchIdx, churchData);
            res.status(200).json({ success: true, message: 'Church updated successfully', data: result });
        } catch (error) {
            logger.error(`[updateChurch] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 삭제
    @Delete(':churchIdx')
    async deleteChurch(@Req() req: Request, @Res() res: Response) {
        try {
            const { churchIdx } = req.params;

            if (!churchIdx) {
                return res.status(400).json({ error: 'churchIdx is required' });
            }

            const result = await this.churchService.deleteChurch(churchIdx);
            res.status(200).json({ success: true, message: 'Church deleted successfully' });
        } catch (error) {
            logger.error(`[deleteChurch] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 추가 요청 생성 (일반 사용자용)
    @Post('requests')
    async createChurchRequest(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.churchService.createChurchRequest(req.body);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(409).json(result); // 409 Conflict for duplicate request
            }
        } catch (error) {
            logger.error(`[createChurchRequest] Error: ${error.message}`);
            // 원본의 next(error) — 전역 에러 핸들러(AllExceptionsFilter)가 500 { message }로 응답
            throw error;
        }
    }

    // 교회 후기 목록
    @Get('boards')
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

            const boards = await this.churchService.getChurchBoards(churchIdx, searchParams);
            res.status(200).json(boards);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 후기 상세보기
    @Get('boards/detail')
    async getChurchBoardDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const boardIdx = req.query.boardIdx as string;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const detailBoard = await this.churchService.getChurchBoardDetail(boardIdx);
            res.status(200).json(detailBoard);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 후기 등록
    @Post('boards/insert')
    async insertChurchBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.churchService.insertChurchBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 후기 수정
    @Put('boards/correct')
    async correctChurchBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.churchService.correctChurchBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 후기 삭제
    @Delete('boards/delete')
    async deleteChurchBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const boardData = req.body;
            const result = await this.churchService.deleteChurchBoard(boardData);
            res.status(200).json({ success: true, message: result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 후기 좋아요 토글
    @Post('boards/like')
    async toggleChurchBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx, isLiked } = req.body;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            if (typeof isLiked !== 'boolean') {
                return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
            }

            const result = await this.churchService.toggleChurchBoardLike(boardIdx, isLiked);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회 후기 좋아요 조회
    @Get('boards/like/:boardId')
    async getChurchBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardId } = req.params;

            if (!boardId) {
                return res.status(400).json({ error: 'boardId is required' });
            }

            const likeCount = await this.churchService.getChurchBoardLike(boardId);
            res.status(200).json({ likeCount });
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 최근순으로 게시된 교회 후기 목록 조회 (교회 정보 포함)
    @Get('boards/recent')
    async getRecentChurchBoardsWithInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.churchService.getRecentChurchBoardsWithInfo();
            res.status(200).json(result);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 교회별로 후기 조회수 기준 인기 후기 TOP10 조회
    @Get('boards/top-viewed')
    async getTopViewedChurchBoardsByChurch(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.churchService.getTopViewedChurchBoardsByChurch();
            res.status(200).json(result);
        } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
