// Backend/app.js:60-74의 404/에러 핸들러 계약을 복제하는 전역 예외 필터.
// - 포팅된 컨트롤러/가드가 던지는 HttpException(객체 페이로드)은 그대로 전송 (레거시 응답 형태 방출 통로)
// - 미등록 라우트(Nest 기본 NotFoundException) → { status: 404, message: '요청한 API가 존재하지 않습니다.' }
// - 그 외 → winston 로깅 후 500 { message } (production이면 고정 메시지)
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from '../../logger/winston.logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        // Nest 라우터가 던지는 기본 NotFoundException (= 미등록 라우트) → 기존 404 형태
        if (exception instanceof NotFoundException) {
            const payload: any = exception.getResponse();
            const isDefaultShape = payload && typeof payload === 'object' && payload.error === 'Not Found'
                && typeof payload.message === 'string' && payload.message.startsWith('Cannot ');
            if (isDefaultShape) {
                return res.status(404).json({
                    status: 404,
                    message: '요청한 API가 존재하지 않습니다.'
                });
            }
        }

        // 포팅 코드가 던진 HttpException: 페이로드를 그대로 전송
        if (exception instanceof HttpException) {
            const payload = exception.getResponse();
            const status = exception.getStatus();
            if (typeof payload === 'string') {
                return res.status(status).json({ message: payload });
            }
            return res.status(status).json(payload);
        }

        // 그 외 에러: app.js 에러 핸들러와 동일
        const err = exception as any;
        logger.error(`[${req.method}] ${req.url} - ${err?.message}\n${err?.stack}`);
        const status = err?.status || 500;
        const isProduction = process.env.NODE_ENV === 'production';
        return res.status(status).json({ message: isProduction ? '서버 오류가 발생했습니다.' : err?.message });
    }
}
