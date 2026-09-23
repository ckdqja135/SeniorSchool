// Backend/routes/freeBoard.router.js + controller/freeBoardController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
// 라우트 선언 순서가 곧 매칭 우선순위다 — '/recent','/stats'를 '/:id'보다 먼저 선언한다(원본 순서와 동일).
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { FreeBoardService } from './freeboard.service';
import { logger } from '../../logger/winston.logger';

@Controller('freeboard')
export class FreeBoardController {
    constructor(private readonly freeBoardService: FreeBoardService) {}

    // 자유게시판 목록 조회
    @Get()
    async getFreeBoardList(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.freeBoardService.getFreeBoardList(req.query);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 목록 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 최근 게시물 조회 (/:id보다 먼저 정의)
    @Get('recent')
    async getRecentFreeBoards(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.freeBoardService.getRecentFreeBoards();
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`최근 게시물 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 통계 조회 (/:id보다 먼저 정의)
    @Get('stats')
    async getStats(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.freeBoardService.getStats();
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`통계 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 상세 조회
    @Get(':id')
    async getFreeBoardDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const { id } = req.params;
            const result = await this.freeBoardService.getFreeBoardDetail(id);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 상세 조회 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 게시글 작성 (일괄 등록)
    @Post()
    async bulkCreateFreeBoards(@Req() req: Request, @Res() res: Response) {
        try {
            // 배열 형태로 직접 받기
            const boards = Array.isArray(req.body) ? req.body : req.body.boards;

            if (!boards || !Array.isArray(boards)) {
                return res.status(400).json({
                    status: 400,
                    message: 'boards 배열이 필요합니다.'
                });
            }

            if (boards.length === 0) {
                return res.status(400).json({
                    status: 400,
                    message: '등록할 게시글이 없습니다.'
                });
            }

            const result = await this.freeBoardService.bulkCreateFreeBoards(boards);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`일괄 게시글 등록 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 게시글 수정
    @Put(':id')
    async updateFreeBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const { id } = req.params;
            const { boardTitle, boardContent, category, tags, boardID, boardPW, boardPassword } = req.body;
            const password = typeof boardPW === 'string' && boardPW.length > 0 ? boardPW : boardPassword;

            // 필수 필드 검증
            if (!boardTitle || !boardContent || !category || !boardID || !password) {
                return res.status(400).json({
                    status: 400,
                    message: '필수 필드가 누락되었습니다.'
                });
            }

            const result = await this.freeBoardService.updateFreeBoard(id, {
                boardTitle,
                boardContent,
                category,
                tags
            }, boardID, password);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 게시글 수정 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 자유게시판 게시글 삭제
    @Delete(':id')
    async deleteFreeBoard(@Req() req: Request, @Res() res: Response) {
        try {
            const { id } = req.params;
            const { boardID, boardPW, boardPassword } = req.body;
            const password = typeof boardPW === 'string' && boardPW.length > 0 ? boardPW : boardPassword;

            // 필수 필드 검증
            if (!boardID || !password) {
                return res.status(400).json({
                    status: 400,
                    message: '작성자 ID와 비밀번호가 필요합니다.'
                });
            }

            const result = await this.freeBoardService.deleteFreeBoard(id, boardID, password);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`자유게시판 게시글 삭제 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 작성
    @Post(':id/comments')
    async createComment(@Req() req: Request, @Res() res: Response) {
        try {
            const { id } = req.params;
            const { commentContent, commentParent, commentPassword, commentWriter } = req.body;

            // 필수 필드 검증
            if (!commentContent) {
                return res.status(400).json({
                    status: 400,
                    message: '댓글 내용이 필요합니다.'
                });
            }

            // writerId가 없으면 commentWriter 사용, 둘 다 없으면 기본값
            const userId = commentWriter;
            const password = commentPassword;

            const result = await this.freeBoardService.createComment(id, {
                commentContent,
                commentParent,
                writerId: userId,
                writerPw: password
            });

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 작성 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 수정
    @Put('comments/:commentId')
    async updateComment(@Req() req: Request, @Res() res: Response) {
        try {
            const { commentId } = req.params;
            const { commentContent, writerId, writerPw } = req.body;

            // 필수 필드 검증
            if (!commentContent || !writerId || !writerPw) {
                return res.status(400).json({
                    status: 400,
                    message: '필수 필드가 누락되었습니다.'
                });
            }

            const result = await this.freeBoardService.updateComment(commentId, {
                commentContent
            }, writerId, writerPw);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 수정 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 삭제
    @Delete('comments/:commentId')
    async deleteComment(@Req() req: Request, @Res() res: Response) {
        try {
            const { commentId } = req.params;
            const { writerId, writerPw } = req.body;

            // 필수 필드 검증
            if (!writerId || !writerPw) {
                return res.status(400).json({
                    status: 400,
                    message: '작성자 ID와 비밀번호가 필요합니다.'
                });
            }

            const result = await this.freeBoardService.deleteComment(commentId, writerId, writerPw);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 삭제 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 게시글 좋아요
    @Post(':id/like')
    async toggleBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { id } = req.params;
            const { isLiked } = req.body;
            const desiredLike = typeof isLiked === 'boolean' ? isLiked : true; // 기본값: 증가

            const result = await this.freeBoardService.toggleBoardLike(id, desiredLike);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`게시글 좋아요 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 댓글 좋아요
    @Post('comments/:commentId/like')
    async toggleCommentLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { commentId } = req.params;
            const { isLiked } = req.body;
            const desiredLike = typeof isLiked === 'boolean' ? isLiked : true; // 기본값: 증가

            const result = await this.freeBoardService.toggleCommentLike(commentId, desiredLike);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`댓글 좋아요 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }

    // 조회수 증가
    @Post(':id/hit')
    async incrementHits(@Req() req: Request, @Res() res: Response) {
        try {
            const { id } = req.params;
            const result = await this.freeBoardService.incrementHits(id);
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`조회수 증가 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }
}
