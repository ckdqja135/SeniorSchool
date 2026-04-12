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

// 식당 최근 후기 5개 조회
exports.getRecentRestaurantComments = async (req, res, next) => {
    try {
        const { restaurantIdx } = req.params;
        
        if (!restaurantIdx) {
            return res.status(400).json({ error: 'restaurantIdx is required' });
        }

        const comments = await restaurantService.getRecentRestaurantComments(restaurantIdx);
        res.status(200).json(comments);
    } catch (error) {
        logger.error(`[getRecentRestaurantComments] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 후기 TOP10 조회 (조회수 기준)
exports.getTopRestaurantComments = async (req, res, next) => {
    try {
        const boards = await restaurantService.getTopRestaurantComments();
        res.status(200).json(boards);
    } catch (error) {
        logger.error(`[getTopRestaurantComments] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 후기 상세 조회
exports.getRestaurantBoardDetail = async (req, res, next) => {
    try {
        const { boardIdx } = req.params;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const board = await restaurantService.getRestaurantBoardDetail(boardIdx);
        res.status(200).json(board);
    } catch (error) {
        if (error.message === 'Board not found') {
            return res.status(404).json({ error: 'Board not found' });
        }
        logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 게시판 좋아요 조회
exports.getRestaurantBoardLike = async (req, res, next) => {
    try {
        const { boardIdx } = req.query;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const likeInfo = await restaurantService.getRestaurantBoardLike(boardIdx);
        res.status(200).json(likeInfo);
    } catch (error) {
        if (error.message === 'Board not found') {
            return res.status(404).json({ error: 'Board not found' });
        }
        logger.error(`[getRestaurantBoardLike] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 자동 완성 검색
exports.autoComplete = async (req, res, next) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            logger.warn("[autoComplete] Missing keyword in request");
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const decodedKeyword = decodeURIComponent(keyword);
        const restaurants = await restaurantService.autoComplete(decodedKeyword);

        return res.status(200).json(restaurants);
    } catch (error) {
        logger.error(`[autoComplete] Error: ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 랜덤 식당 추천
exports.getRandomRestaurant = async (req, res, next) => {
    try {
        const { type } = req.query;
        const restaurant = await restaurantService.getRandomRestaurant(type);

        if (!restaurant) {
            return res.status(404).json({ error: 'No restaurant found' });
        }

        res.status(200).json(restaurant);
    } catch (error) {
        logger.error(`[getRandomRestaurant] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 카테고리 목록 조회
exports.getRestaurantTypes = async (req, res, next) => {
    try {
        const types = await restaurantService.getRestaurantTypes();
        res.status(200).json(types);
    } catch (error) {
        logger.error(`[getRestaurantTypes] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

