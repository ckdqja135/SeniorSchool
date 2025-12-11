const restaurantService = require('../../service/admin/restaurantService');
const logger = require('../../utils/logger');
const { handleImageUpload } = require('../../middlewares/uploadMiddleware');
const path = require('path');

exports.createRestaurant = async (req, res, next) => {
    try {
        // 이미지 파일이 업로드된 경우 경로 추가
        if (req.file) {
            req.body.restaurantImage = `/uploads/restaurants/${req.file.filename}`;
        }

        const result = await restaurantService.createRestaurant(req.body);
        res.status(201).json(result);
    } catch (e) {
        // 업로드된 파일이 있으면 삭제
        if (req.file) {
            const fs = require('fs');
            const filePath = path.join(__dirname, '../../public/uploads/restaurants', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
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
        // 이미지 파일이 업로드된 경우 경로 추가
        if (req.file) {
            req.body.restaurantImage = `/uploads/restaurants/${req.file.filename}`;
            
            // 기존 이미지 파일 삭제 (있는 경우)
            const { RestaurantInfo } = require('../../model/index');
            const restaurant = await RestaurantInfo.findByPk(restaurantIdx);
            if (restaurant && restaurant.restaurantImage) {
                const fs = require('fs');
                const oldImagePath = path.join(__dirname, '../../public', restaurant.restaurantImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        const result = await restaurantService.updateRestaurant(restaurantIdx, req.body);
        res.status(result.status).json(result);
    } catch (error) {
        // 업로드된 파일이 있으면 삭제
        if (req.file) {
            const fs = require('fs');
            const filePath = path.join(__dirname, '../../public/uploads/restaurants', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        logger.error(`[updateRestaurant] Error: ${error.message}`);
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
