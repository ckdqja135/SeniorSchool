const restaurantService = require('../../service/admin/restaurantService');
const logger = require('../../utils/logger');
const { handleImageUpload } = require('../../middlewares/uploadMiddleware');
const path = require('path');

exports.createRestaurant = async (req, res, next) => {
    try {
        logger.info(`[createRestaurant] Request received - Body: ${JSON.stringify(req.body)}, File: ${req.file ? req.file.filename : 'none'}`);
        
        // 이미지 처리 로직
        // 1. 파일 업로드가 있는 경우 (multipart/form-data)
        if (req.file) {
            req.body.restaurantImage = `/uploads/restaurants/${req.file.filename}`;
            logger.info(`[createRestaurant] Image file uploaded: ${req.body.restaurantImage}`);
        }
        // 2. 이미지 URL이 직접 전달된 경우 (JSON 요청)
        // req.body.restaurantImage가 이미 있으면 그대로 사용 (이미지 URL 또는 null)
        else if (req.body.restaurantImage !== undefined) {
            // 이미지 URL이 빈 문자열이면 null로 처리
            if (req.body.restaurantImage === '' || req.body.restaurantImage === null) {
                req.body.restaurantImage = null;
            }
            logger.info(`[createRestaurant] Image URL provided: ${req.body.restaurantImage || 'null'}`);
        }
        // 3. 이미지가 없는 경우
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
            const fs = require('fs');
            const filePath = path.join(__dirname, '../../public/uploads/restaurants', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`[createRestaurant] Uploaded file deleted due to error: ${req.file.filename}`);
            }
        }
        next(e);
    }
};

// 식당 검색
exports.searchRestaurant = async (req, res) => {
    try {
        const data = req.query;
        logger.info(`[searchRestaurant] Request query: ${JSON.stringify(data)}`);
        
        const result = await restaurantService.searchRestaurant(data);
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

    try {
        const fs = require('fs');
        const { RestaurantInfo } = require('../../model/index');
        const restaurant = await RestaurantInfo.findByPk(restaurantIdx);
        
        if (!restaurant) {
            return res.status(404).json({ status: 404, message: '식당을 찾을 수 없습니다.' });
        }

        // 이미지 처리 로직
        // 1. 파일 업로드가 있는 경우 (multipart/form-data)
        if (req.file) {
            req.body.restaurantImage = `/uploads/restaurants/${req.file.filename}`;
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
        // 2. 이미지 URL이 직접 전달된 경우 (JSON 요청)
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
        // 3. 이미지 필드가 없는 경우 (기존 이미지 유지)
        // req.body.restaurantImage를 undefined로 두면 서비스에서 업데이트하지 않음

        const result = await restaurantService.updateRestaurant(restaurantIdx, req.body);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateRestaurant] Error: ${error.message}`);
        logger.error(`[updateRestaurant] Stack: ${error.stack}`);
        
        // 업로드된 파일이 있으면 삭제
        if (req.file) {
            const fs = require('fs');
            const filePath = path.join(__dirname, '../../public/uploads/restaurants', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`[updateRestaurant] Uploaded file deleted due to error: ${req.file.filename}`);
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

