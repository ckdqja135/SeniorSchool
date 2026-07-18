// Backend/controller/admin/restaurantController.js + routes/admin/restaurant.router.js 포팅 (/admin/restaurant).
// 라우트 전부 authenticateToken + isAdmin → 클래스 레벨 @UseGuards(JwtAuthGuard, AdminGuard).
// createRestaurant/updateRestaurant는 handleImageUpload → @UseInterceptors(RestaurantImageUploadInterceptor).
// 에러 처리(원본 컨트롤러 그대로):
//  - createRestaurant: catch → 업로드/ base64 파일 정리 후 next(e)(throw) → 전역 필터 500 { message }.
//  - 그 외: catch → res.status(500).json({ status:500, message:'서버 오류가 발생했습니다.' }).
// 라우트 등록 순서는 원본 router와 동일(구체 경로 먼저, /:restaurantIdx 뒤).
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { RestaurantImageUploadInterceptor } from '../../../common/interceptors/restaurant-image-upload.interceptor';
import { logger } from '../../../logger/winston.logger';
import { AdminRestaurantService } from './admin-restaurant.service';

// base64 이미지를 파일로 저장하는 헬퍼 (restaurantController.js saveBase64Image 포팅)
function saveBase64Image(base64String: string, uploadDir: string): string {
    try {
        // base64 데이터 URL 형식 확인 (data:image/jpeg;base64,...)
        const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
        const matches = base64String.match(base64Pattern);

        if (!matches) {
            throw new Error('유효하지 않은 base64 이미지 형식입니다.');
        }

        const imageType = matches[1]; // jpeg, png, gif, webp
        const base64Data = base64String.replace(base64Pattern, '');

        // base64 디코딩
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 파일명 생성
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = imageType === 'jpeg' ? 'jpg' : imageType;
        const filename = `restaurant_${uniqueSuffix}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        // 파일 저장
        fs.writeFileSync(filePath, imageBuffer);

        logger.info(`[saveBase64Image] Base64 image saved: ${filename}`);
        return `/uploads/restaurants/${filename}`;
    } catch (error) {
        logger.error(`[saveBase64Image] Error: ${error.message}`);
        throw error;
    }
}

@Controller('admin/restaurant')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminRestaurantController {
    constructor(private readonly service: AdminRestaurantService) {}

    // 식당 생성 (이미지 업로드 지원)
    @Post('createRestaurant')
    @UseInterceptors(RestaurantImageUploadInterceptor)
    async createRestaurant(@Req() req: Request, @Res() res: Response) {
        let savedImagePath: string | null = null;
        const uploadDir = path.join(process.cwd(), 'public/uploads/restaurants');
        const file = (req as any).file;

        try {
            logger.info(`[createRestaurant] Request received - Body: ${JSON.stringify(req.body)}, File: ${file ? file.filename : 'none'}`);

            // 이미지 처리 로직
            // 1. 파일 업로드가 있는 경우 (multipart/form-data)
            if (file) {
                req.body.restaurantImage = `/uploads/restaurants/${file.filename}`;
                savedImagePath = req.body.restaurantImage;
                logger.info(`[createRestaurant] Image file uploaded: ${req.body.restaurantImage}`);
            }
            // 2. base64 이미지가 전달된 경우 (JSON 요청)
            else if (req.body.restaurantImage && typeof req.body.restaurantImage === 'string' && req.body.restaurantImage.startsWith('data:image/')) {
                try {
                    req.body.restaurantImage = saveBase64Image(req.body.restaurantImage, uploadDir);
                    savedImagePath = req.body.restaurantImage;
                    logger.info(`[createRestaurant] Base64 image saved: ${req.body.restaurantImage}`);
                } catch (base64Error) {
                    logger.error(`[createRestaurant] Base64 image processing failed: ${base64Error.message}`);
                    return res.status(400).json({
                        status: 400,
                        message: '이미지 처리 중 오류가 발생했습니다: ' + base64Error.message,
                    });
                }
            }
            // 3. 이미지 URL이 직접 전달된 경우 (JSON 요청)
            else if (req.body.restaurantImage !== undefined) {
                if (req.body.restaurantImage === '' || req.body.restaurantImage === null) {
                    req.body.restaurantImage = null;
                }
                logger.info(`[createRestaurant] Image URL provided: ${req.body.restaurantImage || 'null'}`);
            }
            // 4. 이미지가 없는 경우
            else {
                req.body.restaurantImage = null;
                logger.info(`[createRestaurant] No image provided`);
            }

            const result = await this.service.createRestaurant(req.body);
            logger.info(`[createRestaurant] Restaurant created successfully: ${(result as any).data?.restaurantIdx || 'batch insert'}`);
            return res.status(201).json(result);
        } catch (e) {
            logger.error(`[createRestaurant] Error: ${e.message}`);
            logger.error(`[createRestaurant] Stack: ${e.stack}`);

            // 업로드된 파일이 있으면 삭제
            if (file) {
                const filePath = path.join(process.cwd(), 'public/uploads/restaurants', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.info(`[createRestaurant] Uploaded file deleted due to error: ${file.filename}`);
                }
            }
            // base64로 저장된 이미지가 있으면 삭제
            if (savedImagePath) {
                const filePath = path.join(process.cwd(), 'public', savedImagePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.info(`[createRestaurant] Base64 image file deleted due to error: ${savedImagePath}`);
                }
            }
            throw e; // == next(e)
        }
    }

    // 식당 검색
    @Get('searchRestaurant')
    async searchRestaurant(@Req() req: Request, @Res() res: Response) {
        try {
            const query = req.query as any;
            logger.info(`[searchRestaurant] Request query: ${JSON.stringify(query)}`);

            // 프론트엔드 쿼리 파라미터를 서비스에서 기대하는 형식으로 매핑
            const searchParams = {
                name: query.restaurantName || query.name,
                type: query.restaurantType || query.type,
                location: query.restaurantLocation || query.location,
                page: query.page || 1,
                limit: query.rowsPerPage || query.limit || 10,
            };

            logger.info(`[searchRestaurant] Mapped search params: ${JSON.stringify(searchParams)}`);

            const result = await this.service.searchRestaurant(searchParams);
            logger.info(`[searchRestaurant] Success: ${result.totalCount} results found`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[searchRestaurant] Error: ${error.message}`);
            logger.error(`[searchRestaurant] Stack trace: ${error.stack}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 식당 상세보기 (라우트에 :restaurantIdx 없음 → req.params.restaurantIdx는 항상 undefined → 항상 404 DEAD PATH)
    @Get('restaurant')
    async getRestaurantDetail(@Req() req: Request, @Res() res: Response) {
        const { restaurantIdx } = req.params as any;

        try {
            const result = await this.service.getRestaurantDetail(restaurantIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getRestaurantDetail] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 식당 데이터 수정 (이미지 업로드 지원)
    @Put(':restaurantIdx')
    @UseInterceptors(RestaurantImageUploadInterceptor)
    async updateRestaurant(@Param('restaurantIdx') restaurantIdx: string, @Req() req: Request, @Res() res: Response) {
        let savedImagePath: string | null = null;
        const uploadDir = path.join(process.cwd(), 'public/uploads/restaurants');
        const file = (req as any).file;

        try {
            const restaurant = await this.service.getRestaurantById(restaurantIdx);

            if (!restaurant) {
                return res.status(404).json({ status: 404, message: '식당을 찾을 수 없습니다.' });
            }

            // 이미지 처리 로직
            // 1. 파일 업로드가 있는 경우 (multipart/form-data)
            if (file) {
                req.body.restaurantImage = `/uploads/restaurants/${file.filename}`;
                savedImagePath = req.body.restaurantImage;
                logger.info(`[updateRestaurant] Image file uploaded: ${req.body.restaurantImage}`);

                // 기존 이미지 파일 삭제 (있는 경우)
                if (restaurant.restaurantImage) {
                    const oldImagePath = path.join(process.cwd(), 'public', restaurant.restaurantImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        logger.info(`[updateRestaurant] Old image deleted: ${restaurant.restaurantImage}`);
                    }
                }
            }
            // 2. base64 이미지가 전달된 경우 (JSON 요청)
            else if (req.body.restaurantImage && typeof req.body.restaurantImage === 'string' && req.body.restaurantImage.startsWith('data:image/')) {
                try {
                    req.body.restaurantImage = saveBase64Image(req.body.restaurantImage, uploadDir);
                    savedImagePath = req.body.restaurantImage;
                    logger.info(`[updateRestaurant] Base64 image saved: ${req.body.restaurantImage}`);

                    // 기존 이미지 파일 삭제 (있는 경우)
                    if (restaurant.restaurantImage) {
                        const oldImagePath = path.join(process.cwd(), 'public', restaurant.restaurantImage);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                            logger.info(`[updateRestaurant] Old image deleted: ${restaurant.restaurantImage}`);
                        }
                    }
                } catch (base64Error) {
                    logger.error(`[updateRestaurant] Base64 image processing failed: ${base64Error.message}`);
                    return res.status(400).json({
                        status: 400,
                        message: '이미지 처리 중 오류가 발생했습니다: ' + base64Error.message,
                    });
                }
            }
            // 3. 이미지 URL이 직접 전달된 경우 (JSON 요청)
            else if (req.body.restaurantImage !== undefined) {
                // 이미지가 변경되었고, 기존 이미지가 있으면 삭제
                if (req.body.restaurantImage !== restaurant.restaurantImage && restaurant.restaurantImage) {
                    const oldImagePath = path.join(process.cwd(), 'public', restaurant.restaurantImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        logger.info(`[updateRestaurant] Old image deleted: ${restaurant.restaurantImage}`);
                    }
                }

                // 이미지 URL이 빈 문자열이면 null로 처리
                if (req.body.restaurantImage === '' || req.body.restaurantImage === null) {
                    req.body.restaurantImage = null;
                }
                logger.info(`[updateRestaurant] Image URL provided: ${req.body.restaurantImage || 'null'}`);
            }
            // 4. 이미지 필드가 없는 경우 (기존 이미지 유지 — restaurantImage를 건드리지 않음)

            const result = await this.service.updateRestaurant(restaurantIdx, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[updateRestaurant] Error: ${error.message}`);
            logger.error(`[updateRestaurant] Stack: ${error.stack}`);

            // 업로드된 파일이 있으면 삭제
            if (file) {
                const filePath = path.join(process.cwd(), 'public/uploads/restaurants', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.info(`[updateRestaurant] Uploaded file deleted due to error: ${file.filename}`);
                }
            }
            // base64로 저장된 이미지가 있으면 삭제
            if (savedImagePath) {
                const filePath = path.join(process.cwd(), 'public', savedImagePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    logger.info(`[updateRestaurant] Base64 image file deleted due to error: ${savedImagePath}`);
                }
            }
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 식당 데이터 삭제
    @Delete(':restaurantIdx')
    async deleteRestaurant(@Param('restaurantIdx') restaurantIdx: string, @Res() res: Response) {
        try {
            const result = await this.service.deleteRestaurant(restaurantIdx);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[deleteRestaurant] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 식당 통계 조회
    @Get('stats/overview')
    async getRestaurantStats(@Res() res: Response) {
        try {
            const result = await this.service.getRestaurantStats();
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getRestaurantStats] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 식당 추가 요청 목록 조회 (관리자만)
    @Get('request')
    async getRestaurantRequests(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.getRestaurantRequests(req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getRestaurantRequests] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }

    // 식당 추가 요청 상태 업데이트 (관리자만)
    @Put('request/:requestIdx/status')
    async updateRestaurantRequestStatus(@Param('requestIdx') requestIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.service.updateRestaurantRequestStatus(requestIdx, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[updateRestaurantRequestStatus] Error: ${error.message}`);
            return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
        }
    }
}
