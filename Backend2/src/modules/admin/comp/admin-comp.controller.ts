// Backend/routes/admin/comp.router.js + controller/admin/compController.js 포팅.
// 마운트: routes/admin/index.js 가 /comp 로 mount → 전역 /admin 하위 → @Controller('admin/comp').
// 모든 라우트 authenticateToken + isAdmin → 클래스 레벨 @UseGuards(JwtAuthGuard, AdminGuard).
//
// 에러 스타일(원본 컨트롤러별로 상이 — 그대로 재현):
//  - createComp, updateCompRequestStatus : next(e) → try/catch 없이(또는 로깅 후) throw → 전역 필터 전파.
//  - 그 외(validateBusiness/searchComp/getCompRequests/getCompDetail/putCompData/deleteComp/updateCompStatus)
//    : catch → 500 { status:500, message:'서버 오류가 발생했습니다.' } (validateBusiness 는 ok:false 추가).
//  - 통계(updateCompStatistics/batchUpdateCompStatistics) : catch → 500 { success:false, message, error }.
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { logger } from '../../../logger/winston.logger';
import { AdminCompService } from './admin-comp.service';

@Controller('admin/comp')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCompController {
    constructor(private readonly service: AdminCompService) {}

    // 회사 생성 (원본: next(e) → throw 전파)
    @Post('createComp')
    async createComp(@Req() req: Request, @Res() res: Response) {
        const result = await this.service.createComp(req.body);
        // 배열이면 길이, 단일 객체면 1
        const insertCount = Array.isArray(result) ? result.length : 1;
        return res.status(201).json({ insert: insertCount, success: true });
    }

    // 사업자번호 검증 (등록 전 휴폐업/진위 체크)
    @Post('validateBusiness')
    async validateBusiness(@Req() req: Request, @Res() res: Response) {
        try {
            const { httpStatus, body } = await this.service.validateBusiness(req.body);
            return res.status(httpStatus).json(body);
        } catch (err: any) {
            logger.error(`[validateBusiness] Error: ${err.message}`);
            return res.status(500).json({ status: 500, ok: false, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 회사 검색
    @Get('searchComp')
    async searchComp(@Req() req: Request, @Res() res: Response) {
        try {
            const data = req.query;
            logger.info(`[searchComp] Request query: ${JSON.stringify(data)}`);

            const result = await this.service.searchComp(data);
            logger.info(`[searchComp] Success: ${result.totalCount} results found`);

            return res.status(result.status).json(result);
        } catch (error: any) {
            logger.error(`[searchComp] Error: ${error.message}`);
            logger.error(`[searchComp] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 회사 추가 요청 목록 조회
    @Get('request')
    async getCompRequests(@Req() req: Request, @Res() res: Response) {
        try {
            const data = req.query;
            logger.info(`[getCompRequests] Request query: ${JSON.stringify(data)}`);

            const result = await this.service.getCompRequests(data);
            logger.info(`[getCompRequests] Success: ${result.totalCount} requests found`);

            return res.status(result.status).json(result);
        } catch (error: any) {
            logger.error(`[getCompRequests] Error: ${error.message}`);
            logger.error(`[getCompRequests] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 회사 추가 요청 상태 업데이트 (원본: next(error) → 로깅 후 throw 전파)
    @Put('request/:requestIdx/status')
    async updateCompRequestStatus(@Param('requestIdx') requestIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const { status, adminNote } = req.body;

            logger.info(`[updateCompRequestStatus] Updating requestIdx: ${requestIdx}, status: ${status}`);

            const result = await this.service.updateCompRequestStatus(requestIdx, status, adminNote);
            return res.status(result.status).json(result);
        } catch (error: any) {
            logger.error(`[updateCompRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }

    // 회사 상세보기 (idx 기반)
    @Get('comp/:compIdx')
    async getCompDetail(@Param('compIdx') compIdx: string, @Res() res: Response) {
        try {
            const result = await this.service.getCompDetail(compIdx);
            return res.status(result.status).json(result);
        } catch (error: any) {
            logger.error(`[getCompDetail] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 회사 데이터 삭제
    @Delete('deleteComp/:compIdx')
    async deleteComp(@Param('compIdx') compIdx: string, @Res() res: Response) {
        try {
            logger.info(`[deleteComp] Deleting compIdx: ${compIdx}`);

            const result = await this.service.deleteComp(compIdx);
            return res.status(result.status).json(result);
        } catch (error: any) {
            logger.error(`[deleteComp] Error: ${error.message}`);
            logger.error(`[deleteComp] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 회사 데이터 수정 (RESTful: /comp/:id, 레거시: /putCompData/:id)
    @Put(['comp/:compIdx', 'putCompData/:compIdx'])
    async putCompData(@Param('compIdx') compIdx: string, @Req() req: Request, @Res() res: Response) {
        const updateData = req.body;
        try {
            logger.info(`[putCompData] Updating compIdx: ${compIdx}`);
            logger.info(`[putCompData] Update data: ${JSON.stringify(updateData)}`);

            const result = await this.service.putCompData(compIdx, updateData);
            return res.status(result.status).json(result);
        } catch (error: any) {
            logger.error(`[putCompData] Error: ${error.message}`);
            logger.error(`[putCompData] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 회사 상태 변경 (활성/비활성)
    @Put('comp/:compIdx/status')
    async updateCompStatus(@Param('compIdx') compIdx: string, @Req() req: Request, @Res() res: Response) {
        const { compStatus } = req.body;
        try {
            logger.info(`[updateCompStatus] Updating compIdx: ${compIdx}, status: ${compStatus}`);

            const result = await this.service.updateCompStatus(compIdx, compStatus);
            return res.status(result.status).json(result);
        } catch (error: any) {
            logger.error(`[updateCompStatus] Error: ${error.message}`);
            logger.error(`[updateCompStatus] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 회사 통계 정보 업데이트 (외부 API 연동) — DEAD path (tb_comp_statistics/externalApiService 부재 → 원본도 500)
    @Post('comp/:compIdx/statistics')
    async updateCompStatistics(@Param('compIdx') compIdx: string, @Req() req: Request, @Res() res: Response) {
        const { compName, businessNumber, year, quarter } = req.body;
        try {
            logger.info(`[updateCompStatistics] Updating statistics for compIdx: ${compIdx}`);

            const result = await this.service.updateCompStatistics(
                compIdx,
                compName,
                businessNumber,
                year || new Date().getFullYear(),
                quarter,
            );

            return res.status(result.success ? 200 : 400).json(result);
        } catch (error: any) {
            logger.error(`[updateCompStatistics] Error: ${error.message}`);
            logger.error(`[updateCompStatistics] Stack trace: ${error.stack}`);
            return res.status(500).json({
                success: false,
                message: '서버 오류가 발생했습니다.',
                error: error.message,
            });
        }
    }

    // 여러 회사 통계 정보 일괄 업데이트 — DEAD path (원본은 all-failed 로 200 반환)
    @Post('statistics/batch')
    async batchUpdateCompStatistics(@Req() req: Request, @Res() res: Response) {
        const { companies } = req.body;
        try {
            logger.info(`[batchUpdateCompStatistics] Starting batch update for ${companies.length} companies`);

            const result = await this.service.batchUpdateCompStatistics(companies);

            return res.status(200).json({
                success: true,
                message: '일괄 업데이트가 완료되었습니다.',
                data: result,
            });
        } catch (error: any) {
            logger.error(`[batchUpdateCompStatistics] Error: ${error.message}`);
            logger.error(`[batchUpdateCompStatistics] Stack trace: ${error.stack}`);
            return res.status(500).json({
                success: false,
                message: '서버 오류가 발생했습니다.',
                error: error.message,
            });
        }
    }
}
