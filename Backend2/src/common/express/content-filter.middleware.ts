/**
 * 콘텐츠 필터 미들웨어
 * POST/PUT/PATCH 요청의 사용자 입력 필드를 validateUserInput(욕설·음담패설·XSS)으로 검사하여 차단
 */
import { Request, Response, NextFunction } from 'express';
import { validateUserInput } from '../utils/content-filter.util';
import { logger } from '../../logger/winston.logger';

export const contentFilterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // GET, DELETE 등은 통과
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const blocked = validateUserInput(req.body);
  if (blocked) {
    const { field, result } = blocked;
    logger.warn(`[ContentFilter] Blocked ${req.method} ${req.originalUrl} - field: ${field}, category: ${result.category}`);
    return res.status(400).json({
      status: 400,
      message: result.reason,
      field,
    });
  }

  next();
};
