// Backend/routes/bestPosts.router.js + controller/bestPostsController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BestPostsService } from './best-posts.service';
import { logger } from '../../logger/winston.logger';

@Controller('best-posts')
export class BestPostsController {
    constructor(private readonly bestPostsService: BestPostsService) {}

    // 베스트 후기 조회 (전체)
    @Get()
    async getTop10BestPosts(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.bestPostsService.getTop10BestPosts();
            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`베스트 후기 컨트롤러 오류: ${error.message}`);
            res.status(500).json({
                status: 500,
                message: '서버 내부 오류가 발생했습니다.',
            });
        }
    }
}
