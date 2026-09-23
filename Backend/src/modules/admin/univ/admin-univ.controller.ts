// Backend/controller/admin/univController.js 포팅.
// 가드 매핑(레거시 Backend/routes/admin/univ.router.js 그대로):
//   createUniv / searchUniv / univ/:univIdx / deleteUniv / putUnivData
//     / GET request / PUT request/:requestIdx/status : authenticateToken + isAdmin (JwtAuthGuard + AdminGuard)
//   POST /request : 무가드 (일반 사용자도 대학교 요청 제출 가능) → @Public()으로 가드 통과.
//     (클래스 레벨 @UseGuards가 걸려 있어도 @Public() 핸들러는 가드가 Reflector로 감지해 스킵)
// 에러 처리(레거시 컨트롤러 메서드별로 상이하게 재현):
//   createUniv / deleteUniv / putUnivData / (create/get)UnivRequest / updateStatus : next(e) → 전역 필터로 전파(throw)
//   searchUniv / getUnivDetail : 컨트롤러가 catch해 500 {status,message}로 응답.
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { logger } from '../../../logger/winston.logger';
import { AdminUnivService } from './admin-univ.service';

@Controller('admin/univ')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUnivController {
    constructor(private readonly univService: AdminUnivService) {}

    // 학교 생성 (에러 → 전역 필터)
    @Post('createUniv')
    async createUniv(@Req() req: Request, @Res() res: Response) {
        const result = await this.univService.createUniv(req.body);
        // 배열인 경우 길이, 단일 객체인 경우 1로 처리
        const insertCount = Array.isArray(result) ? result.length : 1;
        return res.status(201).json({
            insert: insertCount,
            success: true,
        });
    }

    // 학교 검색 (컨트롤러 catch → 500)
    @Get('searchUniv')
    async searchUniv(@Req() req: Request, @Res() res: Response) {
        try {
            const data = req.query;
            logger.info(`[searchUniv] Request query: ${JSON.stringify(data)}`);

            const result = await this.univService.searchUniv(data);
            logger.info(`[searchUniv] Success: ${result.totalCount} results found`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[searchUniv] Error: ${error.message}`);
            logger.error(`[searchUniv] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 학교 상세보기 (컨트롤러 catch → 500)
    @Get('univ/:univIdx')
    async getUnivDetail(@Param('univIdx') univIdx: string, @Res() res: Response) {
        try {
            const result = await this.univService.getUnivDetail(univIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getUnivDetail] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 학교 데이터 삭제 (에러 → 전역 필터)
    @Delete('deleteUniv')
    async deleteUniv(@Req() req: Request, @Res() res: Response) {
        const result = await this.univService.deleteUniv(req.body);
        return res.status(200).json(result);
    }

    // 학교 데이터 수정 (에러 → 전역 필터)
    @Put('putUnivData')
    async putUnivData(@Req() req: Request, @Res() res: Response) {
        const result = await this.univService.putUnivData(req.body);
        return res.status(200).json(result);
    }

    // 대학교 요청 생성 — 무가드(@Public, 일반 사용자 접근 가능). 성공 시 result.success로 201/409 분기.
    // 에러: 로깅 후 전역 필터로 전파.
    @Public()
    @Post('request')
    async createUnivRequest(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.univService.createUnivRequest(req.body);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(409).json(result); // 409 Conflict for duplicate request
            }
        } catch (error) {
            logger.error(`[createUnivRequest] Error: ${error.message}`);
            throw error;
        }
    }

    // 대학교 요청 목록 조회 (관리자) — 에러: 로깅 후 전역 필터로 전파
    @Get('request')
    async getUnivRequests(@Req() req: Request, @Res() res: Response) {
        try {
            const searchParams = req.query;
            const result = await this.univService.getUnivRequests(searchParams);

            logger.info(`[getUnivRequests] 대학교 요청 목록 조회 성공: ${result.totalCount}개`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getUnivRequests] Error: ${error.message}`);
            throw error;
        }
    }

    // 대학교 요청 상태 업데이트 (관리자) — 에러: 로깅 후 전역 필터로 전파
    @Put('request/:requestIdx/status')
    async updateUnivRequestStatus(@Param('requestIdx') requestIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const { status, adminNote } = req.body;

            if (!requestIdx) {
                return res.status(400).json({
                    success: false,
                    error: 'requestIdx is required',
                });
            }

            if (!status || !['pending', 'completed'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'status must be "pending" or "completed"',
                });
            }

            const result = await this.univService.updateUnivRequestStatus(requestIdx, status, adminNote);

            logger.info(`[updateUnivRequestStatus] 대학교 요청 상태 업데이트 성공: ${requestIdx} -> ${status}${adminNote ? ` (메모: ${adminNote})` : ''}`);

            return res.status(200).json(result);
        } catch (error) {
            logger.error(`[updateUnivRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }
}
