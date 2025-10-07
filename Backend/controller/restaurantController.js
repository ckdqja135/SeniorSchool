const restaurantService = require('../service/restaurantService');
const logger = require('../utils/logger');

// 식당 목록 조회
exports.getRestaurants = async (req, res, next) => {
    try {
        const { name, type, location, limit } = req.query;
        
        const searchParams = {};
        if (name) searchParams.name = name;
        if (type) searchParams.type = type;
        if (location) searchParams.location = location;
        if (limit) searchParams.limit = limit;

        const restaurants = await restaurantService.getRestaurants(searchParams);
        res.status(200).json(restaurants);
    } catch (error) {
        logger.error(`[getRestaurants] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 상세 조회
exports.getRestaurantDetail = async (req, res, next) => {
    try {
        const { restaurantName, restaurantAddr } = req.query;
        
        // restaurantName, restaurantAddr 중 하나는 필수
        if (!restaurantName && !restaurantAddr) {
            return res.status(400).json({ error: 'restaurantName or restaurantAddr is required' });
        }

        const restaurant = await restaurantService.getRestaurantDetail(null, restaurantName, restaurantAddr);
        res.status(200).json(restaurant);
    } catch (error) {
        logger.error(`[getRestaurantDetail] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// 식당 추가 요청 생성
exports.createRestaurantRequest = async (req, res, next) => {
    try {
        const result = await restaurantService.createRestaurantRequest(req.body);
        
        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(409).json(result); // 409 Conflict for duplicate request
        }
    } catch (error) {
        logger.error(`[createRestaurantRequest] Error: ${error.message}`);
        next(error);
    }
};

// 식당 조회수 TOP10 조회
exports.getTopViewedRestaurants = async (req, res, next) => {
    try {
        const result = await restaurantService.getTopViewedRestaurants();
        res.status(200).json(result);
    } catch (error) {
        logger.error(`[getTopViewedRestaurants] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

