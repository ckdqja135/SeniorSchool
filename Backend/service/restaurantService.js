const { RestaurantInfo, RestaurantRequest, RestaurantBoard, RestaurantComment, sequelize } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// 식당 목록 조회
exports.getRestaurants = async (searchParams = {}) => {
    try {
        let whereClause = { restaurantStatus: 1 }; // 활성화된 식당만
        
        const { name, type, location, limit } = searchParams;
        
        if (name && name.trim() !== '') {
            whereClause.restaurantName = {
                [Op.like]: `%${name.trim()}%`
            };
            logger.info(`[getRestaurants] Name search applied: "${name.trim()}"`);
        }
        
        if (type && type.trim() !== '') {
            whereClause.restaurantType = type.trim();
            logger.info(`[getRestaurants] Type search applied: "${type.trim()}"`);
        }
        
        if (location && location.trim() !== '') {
            whereClause.restaurantLocation = {
                [Op.like]: `%${location.trim()}%`
            };
            logger.info(`[getRestaurants] Location search applied: "${location.trim()}"`);
        }
        
        // limit 파라미터 처리
        const queryOptions = {
            where: whereClause,
            order: [['restaurantName', 'ASC']] // 식당명 순 정렬
        };
        
        if (limit && !isNaN(parseInt(limit))) {
            queryOptions.limit = parseInt(limit);
            logger.info(`[getRestaurants] Limit applied: ${limit}`);
        }
        
        const restaurants = await RestaurantInfo.findAll(queryOptions);
        
        logger.info(`[getRestaurants] Found ${restaurants.length} restaurants`);
        return restaurants;
    } catch (error) {
        logger.error(`[getRestaurants] Error: ${error.message}`);
        throw error;
    }
};

// 식당 상세 조회
exports.getRestaurantDetail = async (restaurantIdx, restaurantName, restaurantAddr) => {
    try {
        let whereClause = { restaurantStatus: 1 };
        
        // 검색 조건 구성
        if (restaurantIdx) {
            whereClause.restaurantIdx = restaurantIdx;
        } else if (restaurantName) {
            whereClause.restaurantName = restaurantName;
        } else if (restaurantAddr) {
            whereClause.restaurantAddr = restaurantAddr;
        }

        const restaurant = await RestaurantInfo.findOne({
            where: whereClause
        });

        if (!restaurant) {
            throw new Error('Restaurant not found');
        }

        // 조회수 증가
        await RestaurantInfo.update(
            { restaurantViewCount: sequelize.literal('restaurantViewCount + 1'), updatedAt: sequelize.literal('updated_at') },
            { where: { restaurantIdx: restaurant.restaurantIdx }, silent: true }
        );

        // 식당 후기 평점 평균 계산
        const { fn, col } = require('sequelize');
        const ratingResult = await RestaurantBoard.findOne({
            attributes: [
                [fn('AVG', col('boardRating')), 'averageRating'],
                [fn('COUNT', col('boardRating')), 'ratingCount']
            ],
            where: {
                restaurantIdx: restaurant.restaurantIdx,
                boardRating: {
                    [Op.not]: null
                }
            },
            raw: true
        });

        const averageRating = ratingResult?.averageRating ? parseFloat(Number(ratingResult.averageRating).toFixed(1)) : null;
        const ratingCount = ratingResult?.ratingCount ? parseInt(ratingResult.ratingCount, 10) : 0;

        // 평균 평점 정보를 식당 객체에 추가
        const restaurantData = restaurant.toJSON();
        restaurantData.averageRating = averageRating;
        restaurantData.ratingCount = ratingCount;

        logger.info(`[getRestaurantDetail] Restaurant detail retrieved. RestaurantIdx: ${restaurant.restaurantIdx}, RestaurantName: ${restaurant.restaurantName}, AverageRating: ${averageRating}, RatingCount: ${ratingCount}`);
        return restaurantData;
    } catch (error) {
        logger.error(`[getRestaurantDetail] Error: ${error.message}`);
        throw error;
    }
};

// 식당 등록
exports.createRestaurant = async (restaurantData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(restaurantData)) {
            // 배열인 경우 여러 식당을 일괄 생성
            const results = [];
            for (const restaurant of restaurantData) {
                const { restaurantName, restaurantLocation, restaurantType, restaurantOwner } = restaurant;

                // 필수값 체크
                if (!restaurantName || !restaurantLocation || !restaurantType || !restaurantOwner) {
                    logger.warn(`[createRestaurant] Missing required fields: ${JSON.stringify(restaurant)}`);
                    throw new Error('필수값이 누락되었습니다. (restaurantName, restaurantLocation, restaurantType, restaurantOwner)');
                }

                // 별점 검증 (0.5 단위)
                let restaurantRating = null;
                if (restaurant.restaurantRating !== undefined && restaurant.restaurantRating !== null) {
                    const rating = parseFloat(restaurant.restaurantRating);
                    if (isNaN(rating) || rating < 0 || rating > 5) {
                        throw new Error('별점은 0.0 ~ 5.0 사이의 값이어야 합니다.');
                    }
                    // 0.5 단위로 반올림
                    restaurantRating = Math.round(rating * 2) / 2;
                }

                // DB에 데이터 생성
                const created = await RestaurantInfo.create({
                    restaurantName: restaurant.restaurantName,
                    restaurantLocation: restaurant.restaurantLocation,
                    restaurantType: restaurant.restaurantType,
                    restaurantEstablished: restaurant.restaurantEstablished || '미정',
                    restaurantOwner: restaurant.restaurantOwner,
                    restaurantLatX: restaurant.restaurantLatX || 0.0,
                    restaurantLatY: restaurant.restaurantLatY || 0.0,
                    restaurantURL: restaurant.restaurantURL || '',
                    restaurantLotAddr: restaurant.restaurantLotAddr || '',
                    restaurantAddr: restaurant.restaurantAddr || '',
                    restaurantMapIMG: restaurant.restaurantMapIMG || null,
                    restaurantImage: restaurant.restaurantImage || null,
                    restaurantRating: restaurantRating,
                    restaurantStatus: 1,
                    restaurantViewCount: 0
                });

                results.push(created);
                logger.info(`[createRestaurant] Restaurant created: ${restaurant.restaurantName}`);
            }

            return { success: true, message: `${results.length}개의 식당이 생성되었습니다.`, data: results };
        } else {
            // 단일 식당 생성
            const { restaurantName, restaurantLocation, restaurantType, restaurantOwner } = restaurantData;

            // 필수값 체크
            if (!restaurantName || !restaurantLocation || !restaurantType || !restaurantOwner) {
                throw new Error('필수값이 누락되었습니다. (restaurantName, restaurantLocation, restaurantType, restaurantOwner)');
            }

            // 별점 검증 (0.5 단위)
            let restaurantRating = null;
            if (restaurantData.restaurantRating !== undefined && restaurantData.restaurantRating !== null) {
                const rating = parseFloat(restaurantData.restaurantRating);
                if (isNaN(rating) || rating < 0 || rating > 5) {
                    throw new Error('별점은 0.0 ~ 5.0 사이의 값이어야 합니다.');
                }
                // 0.5 단위로 반올림
                restaurantRating = Math.round(rating * 2) / 2;
            }

            const created = await RestaurantInfo.create({
                restaurantName: restaurantData.restaurantName,
                restaurantLocation: restaurantData.restaurantLocation,
                restaurantType: restaurantData.restaurantType,
                restaurantEstablished: restaurantData.restaurantEstablished || '미정',
                restaurantOwner: restaurantData.restaurantOwner,
                restaurantLatX: restaurantData.restaurantLatX || 0.0,
                restaurantLatY: restaurantData.restaurantLatY || 0.0,
                restaurantURL: restaurantData.restaurantURL || '',
                restaurantLotAddr: restaurantData.restaurantLotAddr || '',
                restaurantAddr: restaurantData.restaurantAddr || '',
                restaurantMapIMG: restaurantData.restaurantMapIMG || null,
                restaurantImage: restaurantData.restaurantImage || null,
                restaurantRating: restaurantRating,
                restaurantStatus: 1,
                restaurantViewCount: 0
            });

            logger.info(`[createRestaurant] Single restaurant created: ${restaurantData.restaurantName}`);
            return { success: true, message: '식당이 생성되었습니다.', data: created };
        }
    } catch (error) {
        logger.error(`[createRestaurant] Error: ${error.message}`);
        throw error;
    }
};

// 식당 수정
exports.updateRestaurant = async (restaurantIdx, restaurantData) => {
    try {
        const restaurant = await RestaurantInfo.findByPk(restaurantIdx);
        
        if (!restaurant) {
            throw new Error('Restaurant not found');
        }

        // 별점 검증 및 처리
        if (restaurantData.restaurantRating !== undefined && restaurantData.restaurantRating !== null) {
            const rating = parseFloat(restaurantData.restaurantRating);
            if (isNaN(rating) || rating < 0 || rating > 5) {
                throw new Error('별점은 0.0 ~ 5.0 사이의 값이어야 합니다.');
            }
            // 0.5 단위로 반올림
            restaurantData.restaurantRating = Math.round(rating * 2) / 2;
        }

        await RestaurantInfo.update(restaurantData, {
            where: { restaurantIdx }
        });

        logger.info(`[updateRestaurant] Restaurant updated. RestaurantIdx: ${restaurantIdx}`);
        return { success: true, message: '식당이 수정되었습니다.' };
    } catch (error) {
        logger.error(`[updateRestaurant] Error: ${error.message}`);
        throw error;
    }
};

// 식당 삭제 (상태 변경)
exports.deleteRestaurant = async (restaurantIdx) => {
    try {
        const result = await RestaurantInfo.update(
            { restaurantStatus: 0 },
            { where: { restaurantIdx } }
        );

        if (result[0] === 0) {
            throw new Error('Restaurant not found');
        }

        logger.info(`[deleteRestaurant] Restaurant deleted. RestaurantIdx: ${restaurantIdx}`);
        return { success: true, message: '식당이 삭제되었습니다.' };
    } catch (error) {
        logger.error(`[deleteRestaurant] Error: ${error.message}`);
        throw error;
    }
};

// 식당 추가 요청 생성
exports.createRestaurantRequest = async (requestData) => {
    try {
        const { restaurantName, restaurantOwner, restaurantType, restaurantAddr } = requestData;

        // 필수값 체크
        if (!restaurantName || restaurantName.trim() === '') {
            throw new Error('식당명은 필수입니다.');
        }

        // 중복 요청 체크 (pending 상태인 동일 식당명)
        const existingRequest = await RestaurantRequest.findOne({
            where: {
                restaurantName: restaurantName.trim(),
                requestStatus: 'pending'
            }
        });

        if (existingRequest) {
            return {
                success: false,
                message: '이미 동일한 식당에 대한 요청이 처리 대기중입니다.'
            };
        }

        // 새 요청 생성
        const newRequest = await RestaurantRequest.create({
            restaurantName: restaurantName.trim(),
            restaurantOwner: restaurantOwner ? restaurantOwner.trim() : null,
            restaurantType: restaurantType ? restaurantType.trim() : null,
            restaurantAddr: restaurantAddr ? restaurantAddr.trim() : null,
            requestStatus: 'pending'
        });

        logger.info(`[createRestaurantRequest] New restaurant request created. RequestIdx: ${newRequest.requestIdx}, RestaurantName: ${restaurantName}`);

        return {
            success: true,
            message: '식당 추가 요청이 성공적으로 등록되었습니다.',
            data: newRequest
        };
    } catch (error) {
        logger.error(`[createRestaurantRequest] Error: ${error.message}`);
        throw error;
    }
};

// 식당 자동 완성 검색
exports.autoComplete = async (keyword) => {
    try {
        const restaurants = await RestaurantInfo.findAll({
            attributes: ['restaurantName', 'restaurantAddr', 'restaurantOwner', 'restaurantType'],
            where: {
                restaurantName: {
                    [Op.not]: '',
                    [Op.like]: `%${keyword}%`,
                },
                restaurantStatus: 1 // 활성화된 식당만
            },
            order: [['restaurantName', 'ASC']],
            limit: 10 // 최대 10개까지만
        });
        
        logger.info(`[autoComplete] Found ${restaurants.length} restaurants for keyword: "${keyword}"`);
        return restaurants;
    } catch (error) {
        logger.error(`[autoComplete] Error: ${error.message}`);
        throw error;
    }
};

// 식당 조회수 TOP10 조회
// 주변 식당 조회 (좌표 기반, 지도용)
exports.getNearbyRestaurants = async (lat, lng, radiusKm = 5, limit = 200) => {
    try {
        const { fn, col, literal } = require('sequelize');

        // Haversine 거리 계산 (km)
        const distanceExpr = literal(
            `(6371 * acos(cos(radians(${lat})) * cos(radians(restaurantLatX)) * cos(radians(restaurantLatY) - radians(${lng})) + sin(radians(${lat})) * sin(radians(restaurantLatX))))`
        );

        const restaurants = await RestaurantInfo.findAll({
            attributes: {
                include: [[distanceExpr, 'distance']],
            },
            where: {
                restaurantStatus: 1,
                restaurantLatX: { [Op.not]: null, [Op.ne]: 0 },
                restaurantLatY: { [Op.not]: null, [Op.ne]: 0 },
            },
            having: literal(`distance <= ${radiusKm}`),
            order: [[literal('distance'), 'ASC']],
            limit,
            subQuery: false,
        });

        // 평균 평점 일괄 조회
        const idxList = restaurants.map(r => r.restaurantIdx);
        const ratings = idxList.length > 0
            ? await RestaurantBoard.findAll({
                attributes: [
                    'restaurantIdx',
                    [fn('AVG', col('boardRating')), 'averageRating'],
                    [fn('COUNT', col('boardRating')), 'ratingCount'],
                ],
                where: { restaurantIdx: { [Op.in]: idxList }, boardRating: { [Op.not]: null } },
                group: ['restaurantIdx'],
                raw: true,
            })
            : [];
        const ratingMap = new Map(ratings.map(r => [r.restaurantIdx, r]));

        const result = restaurants.map(r => {
            const data = r.toJSON();
            const rating = ratingMap.get(data.restaurantIdx);
            data.averageRating = rating?.averageRating ? parseFloat(Number(rating.averageRating).toFixed(1)) : null;
            data.ratingCount = rating?.ratingCount ? parseInt(rating.ratingCount, 10) : 0;
            return data;
        });

        logger.info(`[getNearbyRestaurants] lat=${lat}, lng=${lng}, radius=${radiusKm}km → ${result.length}건`);
        return result;
    } catch (error) {
        logger.error(`[getNearbyRestaurants] Error: ${error.message}`);
        throw error;
    }
};

exports.getTopViewedRestaurants = async () => {
    try {
        const restaurants = await RestaurantInfo.findAll({
            where: { restaurantStatus: 1 }, // 활성 상태인 식당만
            order: [['restaurantViewCount', 'DESC']], // 조회수 기준 내림차순
            limit: 10 // TOP 10
        });
        
        // 각 식당에 평균 평점 추가
        const { fn, col } = require('sequelize');
        const restaurantsWithRating = await Promise.all(
            restaurants.map(async (restaurant) => {
                const ratingResult = await RestaurantBoard.findOne({
                    attributes: [
                        [fn('AVG', col('boardRating')), 'averageRating'],
                        [fn('COUNT', col('boardRating')), 'ratingCount']
                    ],
                    where: {
                        restaurantIdx: restaurant.restaurantIdx,
                        boardRating: {
                            [Op.not]: null
                        }
                    },
                    raw: true
                });

                const averageRating = ratingResult?.averageRating ? parseFloat(Number(ratingResult.averageRating).toFixed(1)) : null;
                const ratingCount = ratingResult?.ratingCount ? parseInt(ratingResult.ratingCount, 10) : 0;

                const restaurantData = restaurant.toJSON();
                restaurantData.averageRating = averageRating;
                restaurantData.ratingCount = ratingCount;

                return restaurantData;
            })
        );
        
        logger.info(`[getTopViewedRestaurants] Found ${restaurantsWithRating.length} top viewed restaurants with ratings`);
        return restaurantsWithRating;
    } catch (error) {
        logger.error(`[getTopViewedRestaurants] Error: ${error.message}`);
        throw error;
    }
};

// 식당 최근 후기 5개 조회
exports.getRecentRestaurantComments = async (restaurantIdx) => {
    try {
        const { RestaurantComment, RestaurantBoard } = require('../model/index');
        
        const comments = await RestaurantComment.findAll({
            include: [{
                model: RestaurantBoard,
                where: { restaurantIdx: restaurantIdx },
                attributes: ['boardIdx', 'boardTitle']
            }],
            order: [['regDate', 'DESC']], // 최신순
            limit: 5,
            attributes: ['commentIdx', 'commentContent', 'writerId', 'regDate', 'commentLike']
        });
        
        logger.info(`[getRecentRestaurantComments] Found ${comments.length} recent comments for restaurantIdx: ${restaurantIdx}`);
        return comments;
    } catch (error) {
        logger.error(`[getRecentRestaurantComments] Error: ${error.message}`);
        throw error;
    }
};

// 식당 후기 TOP10 조회 (조회수 기준)
exports.getTopRestaurantComments = async () => {
    try {
        const { RestaurantBoard, RestaurantInfo } = require('../model/index');
        
        const boards = await RestaurantBoard.findAll({
            include: [{
                model: RestaurantInfo,
                as: 'restaurant',
                attributes: ['restaurantName', 'restaurantAddr']
            }],
            order: [['boardHits', 'DESC']], // 조회수 기준 내림차순
            limit: 10,
            attributes: ['boardIdx', 'boardTitle', 'boardContent', 'boardID', 'boardRegDate', 'boardLike', 'boardHits', 'restaurantIdx']
        });
        
        logger.info(`[getTopRestaurantComments] Found ${boards.length} top restaurant boards by hits`);
        return boards;
    } catch (error) {
        logger.error(`[getTopRestaurantComments] Error: ${error.message}`);
        throw error;
    }
};

// 식당 후기 상세 조회
exports.getRestaurantBoardDetail = async (boardIdx) => {
    try {        
        const board = await RestaurantBoard.findOne({
            where: { boardIdx: boardIdx },
            include: [
                {
                    model: RestaurantInfo,
                    attributes: ['restaurantName', 'restaurantAddr', 'restaurantLocation']
                },
                {
                    model: RestaurantComment,
                    attributes: ['commentIdx', 'commentContent', 'writerId', 'regDate', 'commentLike'],
                    order: [['regDate', 'ASC']] // 댓글은 시간순으로 정렬
                }
            ],
            attributes: ['boardIdx', 'boardTitle', 'boardContent', 'boardID', 'boardRegDate', 'boardLike', 'boardHits', 'restaurantIdx']
        });

        if (!board) {
            throw new Error('Board not found');
        }

        // 조회수 증가
        await RestaurantBoard.update(
            { boardHits: sequelize.literal('boardHits + 1') },
            { where: { boardIdx: boardIdx } }
        );

        logger.info(`[getRestaurantBoardDetail] Board detail retrieved. BoardIdx: ${boardIdx}`);
        return board;
    } catch (error) {
        logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
        throw error;
    }
};

// 게시판 좋아요 조회
exports.getRestaurantBoardLike = async (boardIdx) => {
    try {
        const board = await RestaurantBoard.findByPk(boardIdx, {
            attributes: ['boardIdx', 'boardLike']
        });

        if (!board) {
            throw new Error('Board not found');
        }

        logger.info(`[getRestaurantBoardLike] Board like count retrieved. BoardIdx: ${boardIdx}, LikeCount: ${board.boardLike}`);
        return { boardIdx: board.boardIdx, boardLike: board.boardLike };
    } catch (error) {
        logger.error(`[getRestaurantBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 랜덤 식당 추천
exports.getRandomRestaurant = async (type) => {
    try {
        let whereClause = { restaurantStatus: 1 };
        if (type && type.trim() !== '' && type !== '전체') {
            whereClause.restaurantType = { [Op.like]: `%${type.trim()}%` };
        }

        const restaurant = await RestaurantInfo.findOne({
            where: whereClause,
            order: sequelize.random()
        });

        if (!restaurant) {
            logger.info(`[getRandomRestaurant] No restaurant found for type: ${type || '전체'}`);
            return null;
        }

        // 평균 평점 계산
        const ratingResult = await RestaurantBoard.findOne({
            where: { restaurantIdx: restaurant.restaurantIdx },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('boardRating')), 'averageRating'],
                [sequelize.fn('COUNT', sequelize.col('boardRating')), 'ratingCount']
            ],
            raw: true
        });

        const result = restaurant.toJSON();
        result.averageRating = ratingResult?.averageRating ? parseFloat(parseFloat(ratingResult.averageRating).toFixed(1)) : null;
        result.ratingCount = ratingResult?.ratingCount || 0;

        logger.info(`[getRandomRestaurant] Random pick: ${result.restaurantName} (type: ${type || '전체'})`);
        return result;
    } catch (error) {
        logger.error(`[getRandomRestaurant] Error: ${error.message}`);
        throw error;
    }
};

// 식당 카테고리(업종) 목록 조회
// 식당 지역 목록 조회 (시/도 → 구/군 계층 구조)
exports.getRestaurantLocations = async () => {
    try {
        const restaurants = await RestaurantInfo.findAll({
            where: { restaurantStatus: 1 },
            attributes: ['restaurantAddr'],
            raw: true,
        });

        // 시/도명 정규화 (서울특별시/서울시/서울 → 서울)
        const normalizeCity = (raw) => {
            const s = raw.replace(/특별시|광역시|특별자치시|특별자치도/g, '').replace(/도$|시$/, '');
            const map = { '서울': '서울', '부산': '부산', '대구': '대구', '인천': '인천', '광주': '광주', '대전': '대전', '울산': '울산', '세종': '세종', '경기': '경기', '강원': '강원', '충북': '충북', '충남': '충남', '전북': '전북', '전남': '전남', '경북': '경북', '경남': '경남', '제주': '제주' };
            return map[s] || raw;
        };

        // 주소에서 시/도 + 구/군 추출하여 집계
        const cityMap = {}; // { "서울": { "강남구": 5, "강동구": 3, ... } }

        for (const r of restaurants) {
            const addr = (r.restaurantAddr || '').trim();
            if (!addr) continue;

            const parts = addr.split(' ');
            const city = normalizeCity(parts[0] || '');
            const district = parts[1] || '';

            if (!city || !district) continue;

            if (!cityMap[city]) cityMap[city] = {};
            cityMap[city][district] = (cityMap[city][district] || 0) + 1;
        }

        // 정렬된 구조로 변환
        const result = Object.entries(cityMap)
            .map(([city, districts]) => ({
                city,
                count: Object.values(districts).reduce((a, b) => a + b, 0),
                districts: Object.entries(districts)
                    .map(([district, count]) => ({ district, count }))
                    .sort((a, b) => b.count - a.count),
            }))
            .sort((a, b) => b.count - a.count);

        logger.info(`[getRestaurantLocations] Found ${result.length} cities`);
        return result;
    } catch (error) {
        logger.error(`[getRestaurantLocations] Error: ${error.message}`);
        throw error;
    }
};

exports.getRestaurantTypes = async () => {
    try {
        const types = await RestaurantInfo.findAll({
            where: { restaurantStatus: 1 },
            attributes: [
                'restaurantType',
                [sequelize.fn('COUNT', sequelize.col('restaurantIdx')), 'count']
            ],
            group: ['restaurantType'],
            order: [[sequelize.fn('COUNT', sequelize.col('restaurantIdx')), 'DESC']],
            raw: true
        });

        logger.info(`[getRestaurantTypes] Found ${types.length} restaurant types`);
        return types;
    } catch (error) {
        logger.error(`[getRestaurantTypes] Error: ${error.message}`);
        throw error;
    }
};

