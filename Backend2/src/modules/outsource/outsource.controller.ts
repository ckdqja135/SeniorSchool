// Backend/routes/outsource.router.js + controller/outsourceController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { OutsourceService } from './outsource.service';
import { logger } from '../../logger/winston.logger';

@Controller('outsource')
export class OutsourceController {
    constructor(private readonly outsourceService: OutsourceService) {}

    // 외주업체 목록 조회
    @Get()
    async getOutsources(@Req() req: Request, @Res() res: Response) {
        try {
            const { name, type, location, limit } = req.query as Record<string, string>;

            const searchParams: Record<string, string> = {};
            if (name) searchParams.name = name;
            if (type) searchParams.type = type;
            if (location) searchParams.location = location;
            if (limit) searchParams.limit = limit;

            const outsources = await this.outsourceService.getOutsources(searchParams);
            res.status(200).json(outsources);
        } catch (error) {
            logger.error(`[getOutsources] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 상세 조회 (outsourceName, outsourceAddr로 조회 가능)
    @Get('outsource')
    async getOutsourceDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const { outsourceName, outsourceAddr } = req.query as Record<string, string>;

            // outsourceName, outsourceAddr 중 하나는 필수
            if (!outsourceName && !outsourceAddr) {
                return res.status(400).json({ error: 'outsourceName or outsourceAddr is required' });
            }

            const outsource = await this.outsourceService.getOutsourceDetail(null, outsourceName, outsourceAddr);
            res.status(200).json(outsource);
        } catch (error) {
            logger.error(`[getOutsourceDetail] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 조회수 기준 TOP 조회
    @Get('top-viewed')
    async getTopViewedOutsources(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.outsourceService.getTopViewedOutsources();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getTopViewedOutsources] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 수정
    @Put(':outsourceIdx')
    async updateOutsource(@Req() req: Request, @Res() res: Response) {
        try {
            const { outsourceIdx } = req.params;
            const outsourceData = req.body;

            if (!outsourceIdx) {
                return res.status(400).json({ error: 'outsourceIdx is required' });
            }

            const result = await this.outsourceService.updateOutsource(outsourceIdx, outsourceData);
            res.status(200).json({ success: true, message: 'Outsource updated successfully', data: result });
        } catch (error) {
            logger.error(`[updateOutsource] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 삭제
    @Delete(':outsourceIdx')
    async deleteOutsource(@Req() req: Request, @Res() res: Response) {
        try {
            const { outsourceIdx } = req.params;

            if (!outsourceIdx) {
                return res.status(400).json({ error: 'outsourceIdx is required' });
            }

            const result = await this.outsourceService.deleteOutsource(outsourceIdx);
            res.status(200).json({ success: true, message: 'Outsource deleted successfully' });
        } catch (error) {
            logger.error(`[deleteOutsource] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 외주업체 추가 요청 생성 (일반 사용자용)
    // 원본 컨트롤러는 에러 시 next(error) → 전역 에러 핸들러(500 { message }) — 재던지기로 AllExceptionsFilter가 동일 응답을 만든다.
    @Post('requests')
    async createOutsourceRequest(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.outsourceService.createOutsourceRequest(req.body);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(409).json(result); // 409 Conflict for duplicate request
            }
        } catch (error) {
            logger.error(`[createOutsourceRequest] Error: ${error.message}`);
            throw error;
        }
    }
}
