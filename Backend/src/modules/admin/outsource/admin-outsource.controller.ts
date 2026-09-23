// Backend/routes/admin/outsource.router.js + controller/admin/outsourceController.js 포팅.
// 라우트 선언 순서/메서드/상태코드/한글 메시지를 원본과 1:1로 보존한다.
// 가드: 원본은 POST /request 만 무가드(일반 사용자도 요청 등록 가능)이고 나머지는 authenticateToken+isAdmin.
//   → 클래스 레벨 @UseGuards(JwtAuthGuard, AdminGuard) + POST /request 만 @Public() 로 예외 처리.
// 에러 처리 스타일(원본 outsourceController와 동일):
//   - createOutsource: try/catch 없이 next(e) 전파 → 전역 예외 필터 (throw)
//   - 그 외: 컨트롤러에서 catch 하여 500 { status: 500, message: '서버 오류가 발생했습니다.' }
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { logger } from '../../../logger/winston.logger';
import { AdminOutsourceService } from './admin-outsource.service';

@Controller('admin/outsource')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOutsourceController {
    constructor(private readonly service: AdminOutsourceService) {}

    // 외주업체 생성 — 원본: 성공 201, 에러는 next(e)로 전역 필터에 전파
    @Post('createOutsource')
    async createOutsource(@Req() req: Request, @Res() res: Response) {
        const result = await this.service.createOutsource(req.body);
        return res.status(201).json(result);
    }

    // 외주업체 검색 — 원본 컨트롤러에서 쿼리 파라미터 매핑 후 서비스 호출
    @Get('searchOutsource')
    async searchOutsource(@Req() req: Request, @Res() res: Response) {
        try {
            const { outsourceName, outsourceType, outsourceLocation, page, rowsPerPage } = req.query as any;

            // 파라미터 매핑 (API 파라미터 -> 서비스 파라미터)
            const searchParams = {
                name: outsourceName, // outsourceName -> name
                type: outsourceType, // outsourceType -> type
                location: outsourceLocation, // outsourceLocation -> location
                page: page || 1,
                limit: rowsPerPage || 10, // rowsPerPage -> limit
            };

            logger.info(`[searchOutsource] Request query: ${JSON.stringify(req.query)}`);
            logger.info(`[searchOutsource] Mapped params: ${JSON.stringify(searchParams)}`);

            const result = await this.service.searchOutsource(searchParams);
            logger.info(`[searchOutsource] Success: ${result.totalCount} results found`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[searchOutsource] Error: ${error.message}`);
            logger.error(`[searchOutsource] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 상세보기 — 원본은 req.params.outsourceIdx를 읽으나 '/outsource' 라우트엔 파라미터가 없어 항상 undefined → 404
    @Get('outsource')
    async getOutsourceDetail(@Req() req: Request, @Res() res: Response) {
        const { outsourceIdx } = req.params as any;

        try {
            const result = await this.service.getOutsourceDetail(outsourceIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getOutsourceDetail] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 데이터 수정
    @Put(':outsourceIdx')
    async updateOutsource(@Param('outsourceIdx') outsourceIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.updateOutsource(outsourceIdx, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[updateOutsource] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 데이터 삭제
    @Delete(':outsourceIdx')
    async deleteOutsource(@Param('outsourceIdx') outsourceIdx: string, @Res() res: Response) {
        try {
            const result = await this.service.deleteOutsource(outsourceIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[deleteOutsource] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 통계 조회
    @Get('stats/overview')
    async getOutsourceStats(@Res() res: Response) {
        try {
            const result = await this.service.getOutsourceStats();
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getOutsourceStats] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 추가 요청 생성 (일반 사용자도 접근 가능) — 원본에서 유일하게 무가드
    @Public()
    @Post('request')
    async createOutsourceRequest(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.createOutsourceRequest(req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[createOutsourceRequest] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 추가 요청 목록 조회 (관리자만)
    @Get('request')
    async getOutsourceRequests(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.getOutsourceRequests(req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getOutsourceRequests] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 추가 요청 단일 조회 (관리자만)
    @Get('request/:requestIdx')
    async getOutsourceRequest(@Param('requestIdx') requestIdx: string, @Res() res: Response) {
        try {
            const result = await this.service.getOutsourceRequest(requestIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getOutsourceRequest] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 외주업체 추가 요청 상태 업데이트 (관리자만)
    @Put('request/:requestIdx/status')
    async updateOutsourceRequestStatus(@Param('requestIdx') requestIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.updateOutsourceRequestStatus(requestIdx, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[updateOutsourceRequestStatus] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
