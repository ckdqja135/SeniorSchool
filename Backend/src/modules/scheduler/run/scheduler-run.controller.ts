/**
 * 스케줄러 수동 실행 API (/admin/scheduler-run).
 * 기존 /admin/scheduler (OpenDart 전용 status·run-now)는 그대로 두고, 전체 잡을 다루는 새 경로다.
 */
import { Controller, Get, Post, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { MenuAccessGuard } from '../../../common/guards/menu-access.guard';
import { logger } from '../../../logger/winston.logger';
import { SchedulerRunService } from './scheduler-run.service';

@Controller('admin/scheduler-run')
@UseGuards(JwtAuthGuard, AdminGuard, MenuAccessGuard)
export class SchedulerRunController {
    constructor(private readonly service: SchedulerRunService) {}

    /** 실행할 수 있는 스케줄러 목록 + 각 잡의 마지막 실행 */
    @Get('jobs')
    async jobs(@Res() res: Response) {
        try {
            return res.status(200).json({ success: true, data: await this.service.listJobs() });
        } catch (error: any) {
            logger.error(`[SchedulerRunController:jobs] ${error.message}`);
            return res.status(500).json({ success: false, message: '스케줄러 목록 조회 실패' });
        }
    }

    /** 고른 스케줄러를 큐에 넣는다 (순서대로 하나씩 실행) */
    @Post('run')
    async run(@Req() req: Request, @Res() res: Response) {
        try {
            const { keys, periodFrom, periodTo } = req.body || {};
            if (!Array.isArray(keys) || keys.length === 0) {
                return res.status(400).json({ success: false, message: '실행할 스케줄러를 선택해주세요.' });
            }
            const added = this.service.enqueue(keys, { periodFrom, periodTo }, 'manual');
            if (added.length === 0) {
                return res.status(200).json({ success: true, message: '이미 대기 중이거나 실행 중입니다.', data: [] });
            }
            return res.status(200).json({
                success: true,
                message: `${added.length}개 작업을 대기열에 넣었습니다.`,
                data: added.map((a) => ({ id: a.id, jobKey: a.jobKey, jobLabel: a.jobLabel })),
            });
        } catch (error: any) {
            logger.error(`[SchedulerRunController:run] ${error.message}`);
            return res.status(500).json({ success: false, message: `실행 실패: ${error.message}` });
        }
    }

    /** 진행 상황 (폴링) */
    @Get('progress')
    async progress(@Res() res: Response) {
        try {
            return res.status(200).json({ success: true, ...(await this.service.getProgress()) });
        } catch (error: any) {
            logger.error(`[SchedulerRunController:progress] ${error.message}`);
            return res.status(500).json({ success: false, message: '진행 상황 조회 실패' });
        }
    }

    /** 대기 중인 항목 취소 (실행 중인 건 취소 불가) */
    @Delete('queue/:id')
    async cancel(@Param('id') id: string, @Res() res: Response) {
        try {
            const r = this.service.cancel(id);
            return res.status(r.ok ? 200 : 400).json({ success: r.ok, message: r.message });
        } catch (error: any) {
            logger.error(`[SchedulerRunController:cancel] ${error.message}`);
            return res.status(500).json({ success: false, message: '취소 실패' });
        }
    }

    /** 실행 현황 표 + 집계 */
    @Get('runs')
    async runs(@Req() req: Request, @Res() res: Response) {
        try {
            const limit = Math.min(Number(req.query.limit) || 100, 300);
            const offset = Number(req.query.offset) || 0;
            return res.status(200).json({ success: true, ...(await this.service.listRuns(limit, offset)) });
        } catch (error: any) {
            logger.error(`[SchedulerRunController:runs] ${error.message}`);
            return res.status(500).json({ success: false, message: '실행 기록 조회 실패' });
        }
    }
}
