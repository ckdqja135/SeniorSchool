const restaurantService = require('../../service/admin/restaurantService');
const logger = require('../../utils/logger');
const { handleImageUpload } = require('../../middlewares/uploadMiddleware');
const path = require('path');
const fs = require('fs');

// base64 이미지를 파일로 저장하는 헬퍼 함수
const saveBase64Image = (base64String, uploadDir) => {
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
};

exports.createRestaurant = async (req, res, next) => {
    let savedImagePath = null;
    const uploadDir = path.join(__dirname, '../../public/uploads/restaurants');
    
    try {
        logger.info(`[createRestaurant] Request received - Body: ${JSON.stringify(req.body)}, File: ${req.file ? req.file.filename : 'none'}`);
        
        // 이미지 처리 로직
        // 1. 파일 업로드가 있는 경우 (multipart/form-data)
        if (req.file) {
            req.body.restaurantImage = `/uploads/restaurants/${req.file.filename}`;
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
                    message: '이미지 처리 중 오류가 발생했습니다: ' + base64Error.message 
                });
            }
        }
        // 3. 이미지 URL이 직접 전달된 경우 (JSON 요청)
        else if (req.body.restaurantImage !== undefined) {
            // 이미지 URL이 빈 문자열이면 null로 처리
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

        const result = await restaurantService.createRestaurant(req.body);
        logger.info(`[createRestaurant] Restaurant created successfully: ${result.data?.restaurantIdx || 'batch insert'}`);
        res.status(201).json(result);
    } catch (e) {
        logger.error(`[createRestaurant] Error: ${e.message}`);
        logger.error(`[createRestaurant] Stack: ${e.stack}`);
        
        // 업로드된 파일이 있으면 삭제
        if (req.file) {
            const filePath = path.join(__dirname, '../../public/uploads/restaurants', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`[createRestaurant] Uploaded file deleted due to error: ${req.file.filename}`);
            }
        }
        // base64로 저장된 이미지가 있으면 삭제
        if (savedImagePath) {
            const filePath = path.join(__dirname, '../../public', savedImagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`[createRestaurant] Base64 image file deleted due to error: ${savedImagePath}`);
            }
        }
        next(e);
    }
};

// 식당 검색
exports.searchRestaurant = async (req, res) => {
    try {
        const query = req.query;
        logger.info(`[searchRestaurant] Request query: ${JSON.stringify(query)}`);
        
        // 프론트엔드 쿼리 파라미터를 서비스에서 기대하는 형식으로 매핑
        const searchParams = {
            name: query.restaurantName || query.name, // restaurantName 또는 name 지원
            type: query.restaurantType || query.type, // restaurantType 또는 type 지원
            location: query.restaurantLocation || query.location, // restaurantLocation 또는 location 지원
            page: query.page || 1,
            limit: query.rowsPerPage || query.limit || 10 // rowsPerPage 또는 limit 지원
        };
        
        logger.info(`[searchRestaurant] Mapped search params: ${JSON.stringify(searchParams)}`);
        
        const result = await restaurantService.searchRestaurant(searchParams);
        logger.info(`[searchRestaurant] Success: ${result.totalCount} results found`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[searchRestaurant] Error: ${error.message}`);
        logger.error(`[searchRestaurant] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 식당 상세보기
exports.getRestaurantDetail = async (req, res) => {
    const { restaurantIdx } = req.params;

    try {
        const result = await restaurantService.getRestaurantDetail(restaurantIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getRestaurantDetail] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 식당 수정
exports.updateRestaurant = async (req, res) => {
    const { restaurantIdx } = req.params;
    let savedImagePath = null;
    const uploadDir = path.join(__dirname, '../../public/uploads/restaurants');

    try {
        const { RestaurantInfo } = require('../../model/index');
        const restaurant = await RestaurantInfo.findByPk(restaurantIdx);
        
        if (!restaurant) {
            return res.status(404).json({ status: 404, message: '식당을 찾을 수 없습니다.' });
        }

        // 이미지 처리 로직
        // 1. 파일 업로드가 있는 경우 (multipart/form-data)
        if (req.file) {
            req.body.restaurantImage = `/uploads/restaurants/${req.file.filename}`;
            savedImagePath = req.body.restaurantImage;
            logger.info(`[updateRestaurant] Image file uploaded: ${req.body.restaurantImage}`);
            
            // 기존 이미지 파일 삭제 (있는 경우)
            if (restaurant.restaurantImage) {
                const oldImagePath = path.join(__dirname, '../../public', restaurant.restaurantImage);
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
                    const oldImagePath = path.join(__dirname, '../../public', restaurant.restaurantImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        logger.info(`[updateRestaurant] Old image deleted: ${restaurant.restaurantImage}`);
                    }
                }
            } catch (base64Error) {
                logger.error(`[updateRestaurant] Base64 image processing failed: ${base64Error.message}`);
                return res.status(400).json({ 
                    status: 400, 
                    message: '이미지 처리 중 오류가 발생했습니다: ' + base64Error.message 
                });
            }
        }
        // 3. 이미지 URL이 직접 전달된 경우 (JSON 요청)
        else if (req.body.restaurantImage !== undefined) {
            // 이미지가 변경되었고, 기존 이미지가 있으면 삭제
            if (req.body.restaurantImage !== restaurant.restaurantImage && restaurant.restaurantImage) {
                const oldImagePath = path.join(__dirname, '../../public', restaurant.restaurantImage);
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
        // 4. 이미지 필드가 없는 경우 (기존 이미지 유지)
        // req.body.restaurantImage를 undefined로 두면 서비스에서 업데이트하지 않음

        const result = await restaurantService.updateRestaurant(restaurantIdx, req.body);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateRestaurant] Error: ${error.message}`);
        logger.error(`[updateRestaurant] Stack: ${error.stack}`);
        
        // 업로드된 파일이 있으면 삭제
        if (req.file) {
            const filePath = path.join(__dirname, '../../public/uploads/restaurants', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`[updateRestaurant] Uploaded file deleted due to error: ${req.file.filename}`);
            }
        }
        // base64로 저장된 이미지가 있으면 삭제
        if (savedImagePath) {
            const filePath = path.join(__dirname, '../../public', savedImagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`[updateRestaurant] Base64 image file deleted due to error: ${savedImagePath}`);
            }
        }
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 식당 삭제
exports.deleteRestaurant = async (req, res) => {
    const { restaurantIdx } = req.params;

    try {
        const result = await restaurantService.deleteRestaurant(restaurantIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[deleteRestaurant] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 식당 통계 조회
exports.getRestaurantStats = async (req, res) => {
    try {
        const result = await restaurantService.getRestaurantStats();
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getRestaurantStats] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

/**
 * 식당 추가 요청 관리
 */

// 식당 추가 요청 목록 조회 (관리자만)
exports.getRestaurantRequests = async (req, res) => {
    try {
        const result = await restaurantService.getRestaurantRequests(req.query);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getRestaurantRequests] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 식당 추가 요청 상태 업데이트 (관리자만)
exports.updateRestaurantRequestStatus = async (req, res) => {
    const { requestIdx } = req.params;

    try {
        const result = await restaurantService.updateRestaurantRequestStatus(requestIdx, req.body);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateRestaurantRequestStatus] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

