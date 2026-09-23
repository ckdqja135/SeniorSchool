// Backend/routes/comp.router.js + controller/compController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
import { Controller, Delete, Get, Post, Put, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CompService } from './comp.service';
import { logger } from '../../logger/winston.logger';

@Controller('comp')
export class CompController {
    constructor(private readonly compService: CompService) {}

    /**
     * 회사 조회수 기준 인기 회사 TOP10 조회
     */
    @Get('top-viewed')
    async getTopViewedCompanies(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.compService.getTopViewedCompanies();

            logger.info(`[getTopViewedCompanies] 인기 회사 TOP10 조회 성공: ${result.totalCount}개`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getTopViewedCompanies] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 회사 추가 요청 생성
     */
    @Post('requests')
    async createCompRequest(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.compService.createCompRequest(req.body);

            logger.info(`[createCompRequest] 회사 추가 요청 생성 성공: ${result.data.requestIdx}`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[createCompRequest] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 면접 후기 조회 (목록)
     */
    @Get('interviews')
    async getInterviews(@Req() req: Request, @Res() res: Response) {
        try {
            const compIdx = req.query.compIdx ? parseInt(req.query.compIdx as string) : null;
            const pagination = {
                page: req.query.page,
                rowsPerPage: req.query.rowsPerPage
            };

            const result = await this.compService.getInterviews(compIdx, pagination);

            logger.info(`[getInterviews] 면접 후기 조회 성공: ${result.pagination?.totalCount}개`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getInterviews] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 면접 후기 상세 조회
     */
    @Get('interviews/:interviewIdx')
    async getInterviewDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const interviewIdx = parseInt(req.params.interviewIdx);
            const result = await this.compService.getInterviewDetail(interviewIdx);

            logger.info(`[getInterviewDetail] 면접 후기 상세 조회 성공: ${interviewIdx}`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getInterviewDetail] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 면접 후기 생성
     */
    @Post('interviews')
    async createInterview(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.compService.createInterview(req.body);

            logger.info(`[createInterview] 면접 후기 생성 성공: ${result.data?.interviewIdx}`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[createInterview] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 면접 후기 수정
     */
    @Put('interviews/:interviewIdx')
    async updateInterview(@Req() req: Request, @Res() res: Response) {
        try {
            const interviewIdx = parseInt(req.params.interviewIdx);
            const { writerPw, ...updateData } = req.body;

            if (!writerPw) {
                return res.status(400).json({
                    status: 400,
                    error: '비밀번호는 필수입니다.',
                    message: '작성자 비밀번호를 입력해주세요.'
                });
            }

            const result = await this.compService.updateInterview(interviewIdx, updateData, writerPw);

            logger.info(`[updateInterview] 면접 후기 수정 성공: ${interviewIdx}`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[updateInterview] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 면접 후기 삭제
     */
    @Delete('interviews/:interviewIdx')
    async deleteInterview(@Req() req: Request, @Res() res: Response) {
        try {
            const interviewIdx = parseInt(req.params.interviewIdx);
            const { writerPw } = req.body;

            if (!writerPw) {
                return res.status(400).json({
                    status: 400,
                    error: '비밀번호는 필수입니다.',
                    message: '작성자 비밀번호를 입력해주세요.'
                });
            }

            const result = await this.compService.deleteInterview(interviewIdx, writerPw);

            logger.info(`[deleteInterview] 면접 후기 삭제 성공: ${interviewIdx}`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[deleteInterview] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 연봉 후기 조회 (목록)
     */
    @Get('salaries')
    async getSalaries(@Req() req: Request, @Res() res: Response) {
        try {
            const compIdx = req.query.compIdx ? parseInt(req.query.compIdx as string) : null;
            const pagination = {
                page: req.query.page,
                rowsPerPage: req.query.rowsPerPage
            };

            const result = await this.compService.getSalaries(compIdx, pagination);

            logger.info(`[getSalaries] 연봉 후기 조회 성공: ${result.pagination?.totalCount}개`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getSalaries] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 연봉 후기 생성
     */
    @Post('salaries')
    async createSalary(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.compService.createSalary(req.body);

            logger.info(`[createSalary] 연봉 후기 생성 성공: ${result.data?.salaryIdx}`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[createSalary] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }

    /**
     * 회사 평점 평균 조회
     */
    @Get('companies/:compIdx/rating')
    async getCompanyAverageRating(@Req() req: Request, @Res() res: Response) {
        try {
            const compIdx = parseInt(req.params.compIdx, 10);

            if (!compIdx || Number.isNaN(compIdx)) {
                return res.status(400).json({
                    status: 400,
                    error: '유효하지 않은 회사 인덱스입니다.',
                    message: 'compIdx는 숫자여야 합니다.'
                });
            }

            const result = await this.compService.getCompanyAverageRating(compIdx);

            logger.info(`[getCompanyAverageRating] 회사 평점 평균 조회 성공: ${compIdx}`);

            res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getCompanyAverageRating] Error: ${error.message}`);
            res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message
            });
        }
    }
}
