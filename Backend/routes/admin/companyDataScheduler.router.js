/**
 * 회사 데이터 스케줄러 관리 API
 */

const express = require('express');
const router = express.Router();
const scheduler = require('../../scheduler/companyDataScheduler');
const logger = require('../../utils/logger');

/**
 * GET /admin/scheduler/status
 * 스케줄러 상태 조회
 */
router.get('/status', (req, res) => {
    try {
        const status = scheduler.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error(`[Scheduler API] Status error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '스케줄러 상태 조회 실패',
            error: error.message
        });
    }
});

/**
 * POST /admin/scheduler/run-now
 * 즉시 업데이트 실행
 */
router.post('/run-now', async (req, res) => {
    try {
        const status = scheduler.getStatus();
        
        if (status.isRunning) {
            return res.status(400).json({
                success: false,
                message: '이미 업데이트가 진행 중입니다.'
            });
        }

        // 비동기로 실행 (응답은 즉시 반환)
        scheduler.runUpdateNow().catch(error => {
            logger.error(`[Scheduler API] Run-now error: ${error.message}`);
        });

        res.json({
            success: true,
            message: '회사 데이터 업데이트가 시작되었습니다. 로그를 확인하세요.'
        });
    } catch (error) {
        logger.error(`[Scheduler API] Run-now error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '업데이트 실행 실패',
            error: error.message
        });
    }
});

module.exports = router;

