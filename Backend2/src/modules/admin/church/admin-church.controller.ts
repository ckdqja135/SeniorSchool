// Backend/controller/admin/churchController.js + routes/admin/church.router.js 포팅.
// 가드 매핑(원본 그대로):
//   - church.router의 대부분 라우트: authenticateToken, isAdmin → 클래스 레벨 @UseGuards(JwtAuthGuard, AdminGuard)
//   - 예외: POST /request (교회 추가 요청 생성)는 원본에서 무가드(일반 사용자 접근 가능) → 별도 무가드 컨트롤러로 분리
// 라우트 선언 순서(원본 라우터 순서 유지): DELETE /bulk 를 DELETE /:churchIdx 보다 먼저 선언해
//   /bulk 가 /:churchIdx 파라미터 라우트에 흡수되지 않도록 한다.
// 에러 전파 스타일은 메서드별로 원본 컨트롤러를 그대로 재현:
//   - searchChurch/getChurchDetail/updateChurch/deleteChurch/deleteChurches/getChurchStats: try/catch → 500 {status,message}
//   - createChurch/createChurchRequest/getChurchRequests/updateChurchRequestStatus: next(e) = 전역 예외 필터로 전파(throw)
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { logger } from '../../../logger/winston.logger';
import { AdminChurchService } from './admin-church.service';

@Controller('admin/church')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminChurchController {
    constructor(private readonly service: AdminChurchService) {}

    // 교회 생성 — 원본 컨트롤러: 성공 201, 에러 next(e) 전파
    @Post('createChurch')
    async createChurch(@Req() req: Request, @Res() res: Response) {
        const result = await this.service.createChurch(req.body);
        return res.status(201).json(result);
    }

    // 교회 검색
    @Get('searchChurch')
    async searchChurch(@Req() req: Request, @Res() res: Response) {
        try {
            const data = req.query;
            logger.info(`[searchChurch] Request query: ${JSON.stringify(data)}`);

            const result = await this.service.searchChurch(data);
            logger.info(`[searchChurch] Success: ${result.totalCount} results found`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[searchChurch] Error: ${error.message}`);
            logger.error(`[searchChurch] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 교회 상세보기 (원본 라우트: GET /church — churchIdx 파라미터 없음 → req.params.churchIdx는 undefined)
    @Get('church')
    async getChurchDetail(@Req() req: Request, @Res() res: Response) {
        const { churchIdx } = req.params as any;

        try {
            const result = await this.service.getChurchDetail(churchIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getChurchDetail] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 교회 수정
    @Put(':churchIdx')
    async updateChurch(@Param('churchIdx') churchIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.updateChurch(churchIdx, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[updateChurch] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 교회 일괄 삭제 (body: { churchIdxList: [...] }) — DELETE /:churchIdx 보다 먼저 선언
    @Delete('bulk')
    async deleteChurches(@Req() req: Request, @Res() res: Response) {
        const { churchIdxList } = req.body;

        if (!Array.isArray(churchIdxList) || churchIdxList.length === 0) {
            return res.status(400).json({ status: 400, message: 'churchIdxList 배열이 필요합니다.' });
        }

        try {
            const result = await this.service.deleteChurches(churchIdxList);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[deleteChurches] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 교회 삭제
    @Delete(':churchIdx')
    async deleteChurch(@Param('churchIdx') churchIdx: string, @Res() res: Response) {
        try {
            const result = await this.service.deleteChurch(churchIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[deleteChurch] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 교회 통계 조회
    @Get('stats/overview')
    async getChurchStats(@Res() res: Response) {
        try {
            const result = await this.service.getChurchStats();
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getChurchStats] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 교회 추가 요청 목록 조회 (관리자만) — 원본: 에러 next(e) 전파
    @Get('request')
    async getChurchRequests(@Req() req: Request, @Res() res: Response) {
        try {
            const searchParams = req.query;
            const result = await this.service.getChurchRequests(searchParams);

            logger.info(`[getChurchRequests] 교회 요청 목록 조회 성공: ${result.totalCount}개`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getChurchRequests] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 추가 요청 상태 업데이트 (관리자만) — 원본: 에러 next(e) 전파
    @Put('request/:requestIdx/status')
    async updateChurchRequestStatus(@Param('requestIdx') requestIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const { status, adminNote } = req.body;

            const result = await this.service.updateChurchRequestStatus(requestIdx, status, adminNote);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[updateChurchRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 추가 요청 생성 — 원본 라우터에서 유일하게 무가드(일반 사용자도 접근 가능).
    // 클래스 레벨 @UseGuards를 @Public()으로 무력화 → 인증 없이 접근. 성공 201, 중복 409, 에러 next(e) 전파.
    @Public()
    @Post('request')
    async createChurchRequest(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.createChurchRequest(req.body);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(409).json(result); // 409 Conflict for duplicate request
            }
        } catch (error) {
            logger.error(`[createChurchRequest] Error: ${error.message}`);
            throw error;
        }
    }
}
