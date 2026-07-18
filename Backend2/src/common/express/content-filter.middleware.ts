/**
 * 콘텐츠 필터 미들웨어 — Backend/middlewares/contentFilterMiddleware.js의 verbatim 포팅
 * POST/PUT/PATCH 요청의 사용자 입력 필드를 검사하여 부적절한 콘텐츠 차단
 */
import { Request, Response, NextFunction } from 'express';
import { validateContent } from '../utils/content-filter.util';
import { logger } from '../../logger/winston.logger';

// 검사 대상 필드
const TARGET_FIELDS = ['boardTitle', 'boardContent', 'commentContent'];

export const contentFilterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // GET, DELETE 등은 통과
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  if (!req.body) {
    return next();
  }

  for (const field of TARGET_FIELDS) {
    const value = req.body[field];
    if (!value || typeof value !== 'string') continue;

    const result = validateContent(value);
    if (!result.isClean) {
      logger.warn(`[ContentFilter] Blocked ${req.method} ${req.originalUrl} - field: ${field}, category: ${result.category}`);
      return res.status(400).json({
        status: 400,
        message: result.reason,
        field,
      });
    }
  }

  next();
};
