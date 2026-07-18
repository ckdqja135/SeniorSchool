// Backend/middlewares/uploadMiddleware.js의 handleImageUpload 포팅.
// JSON 요청(base64 이미지)은 multer를 건너뛰고, MulterError는 기존 400 바디({error: ...})로 응답한다.
// (FileInterceptor를 쓰지 않는 이유: 에러 응답 형태가 달라져 API 계약이 깨짐)
import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../logger/winston.logger';

// 업로드 디렉토리 설정
const uploadDir = path.join(process.cwd(), 'public/uploads/restaurants');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`[uploadMiddleware] Created upload directory: ${uploadDir}`);
}

// 파일 저장 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 파일명: restaurant_{timestamp}-{random}.{ext}
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `restaurant_${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// 파일 필터 (이미지 파일만 허용)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다. (jpeg, jpg, png, gif, webp)'));
    }
};

// multer 설정
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB 제한
    },
    fileFilter: fileFilter
});

// 단일 이미지 업로드 미들웨어
const uploadSingleImage = upload.single('restaurantImage');

@Injectable()
export class RestaurantImageUploadInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();

        // JSON 요청인 경우 (base64 이미지 처리) 미들웨어 건너뛰기
        if (req.is('application/json') || req.headers['content-type']?.includes('application/json')) {
            return next.handle();
        }

        // multipart/form-data 요청인 경우에만 multer 처리
        await new Promise<void>((resolve, reject) => {
            uploadSingleImage(req, res, (err: any) => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return reject(new HttpException({ error: '파일 크기는 5MB를 초과할 수 없습니다.' }, 400));
                        }
                        return reject(new HttpException({ error: err.message }, 400));
                    }
                    return reject(new HttpException({ error: err.message }, 400));
                }
                resolve();
            });
        });

        return next.handle();
    }
}
