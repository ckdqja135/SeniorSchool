const { RestaurantInfo, RestaurantRequest } = require('../../model/index');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

exports.createRestaurant = async (restaurantData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(restaurantData)) {
            // 배열인 경우 여러 식당을 일괄 생성
            const results = [];
            for (const restaurant of restaurantData) {
                const { restaurantName, restaurantLocation, restaurantType } = restaurant;

                // 필수값 체크 (owner는 선택값으로 완화)
                if (!restaurantName || !restaurantLocation || !restaurantType) {
                    logger.warn(`[createRestaurant] Missing required fields: ${JSON.stringify(restaurant)}`);
                    throw new Error('필수값이 누락되었습니다. (restaurantName, restaurantLocation, restaurantType)');
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

                // DB에 데이터 생성 (null/undefined 기본값 처리)
                const created = await RestaurantInfo.create({
                    restaurantName: restaurant.restaurantName,
                    restaurantLocation: restaurant.restaurantLocation,
                    restaurantType: restaurant.restaurantType,
                    restaurantEstablished: restaurant.restaurantEstablished ?? '',
                    restaurantOwner: restaurant.restaurantOwner ?? '',
                    restaurantLatX: restaurant.restaurantLatX ?? 0,
                    restaurantLatY: restaurant.restaurantLatY ?? 0,
                    restaurantURL: restaurant.restaurantURL ?? '',
                    restaurantLotAddr: restaurant.restaurantLotAddr ?? '',
                    restaurantAddr: restaurant.restaurantAddr ?? '',
                    restaurantMapIMG: restaurant.restaurantMapIMG ?? null,
                    restaurantImage: restaurant.restaurantImage ?? null,
                    restaurantRating: restaurantRating,
                    restaurantStatus: 1,
                    restaurantViewCount: 0
                });
                results.push(created);
                logger.info(`[createRestaurant] 식당 등록 완료! : ${created.restaurantIdx}`);
            }
            return {
                insert: results.length,
                success: true
            };
        } else {
            // 단일 객체인 경우
            const { restaurantName, restaurantLocation, restaurantType } = restaurantData;

            // 필수값 체크 (owner는 선택값으로 완화)
            if (!restaurantName || !restaurantLocation || !restaurantType) {
                logger.warn(`[createRestaurant] Missing required fields: ${JSON.stringify(restaurantData)}`);
                throw new Error('필수값이 누락되었습니다. (restaurantName, restaurantLocation, restaurantType)');
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
                restaurantEstablished: restaurantData.restaurantEstablished ?? '',
                restaurantOwner: restaurantData.restaurantOwner ?? '',
                restaurantLatX: restaurantData.restaurantLatX ?? 0,
                restaurantLatY: restaurantData.restaurantLatY ?? 0,
                restaurantURL: restaurantData.restaurantURL ?? '',
                restaurantLotAddr: restaurantData.restaurantLotAddr ?? '',
                restaurantAddr: restaurantData.restaurantAddr ?? '',
                restaurantMapIMG: restaurantData.restaurantMapIMG ?? null,
                restaurantImage: restaurantData.restaurantImage ?? null,
                restaurantRating: restaurantRating,
                restaurantStatus: 1,
                restaurantViewCount: 0
            });

            logger.info(`[createRestaurant] 식당 등록 완료! : ${created.restaurantIdx}`);
            return {
                insert: 1,
                success: true,
                data: created
            };
        }
    } catch (error) {
        logger.error(`[createRestaurant] Error: ${error.message}`);
        throw error;
    }
};

exports.searchRestaurant = async (searchParams) => {
    try {
        const { name, type, location, page = 1, limit = 10 } = searchParams;
        
        let whereClause = { restaurantStatus: 1 }; // 활성 상태만
        
        // 검색 조건 추가
        if (name && name.trim() !== '') {
            whereClause.restaurantName = {
                [Op.like]: `%${name.trim()}%`
            };
        }
        
        if (type && type.trim() !== '') {
            whereClause.restaurantType = type.trim();
        }
        
        if (location && location.trim() !== '') {
            whereClause.restaurantLocation = {
                [Op.like]: `%${location.trim()}%`
            };
        }

        // 페이징 처리
        const offset = (page - 1) * limit;
        
        const result = await RestaurantInfo.findAndCountAll({
            where: whereClause,
            order: [['restaurantName', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        logger.info(`[searchRestaurant] Found ${result.count} restaurants`);
        
        return {
            status: 200,
            totalCount: result.count,
            totalPages: Math.ceil(result.count / limit),
            currentPage: parseInt(page),
            restaurants: result.rows
        };
    } catch (error) {
        logger.error(`[searchRestaurant] Error: ${error.message}`);
        throw error;
    }
};

exports.getRestaurantDetail = async (restaurantIdx) => {
    try {
        const restaurant = await RestaurantInfo.findByPk(restaurantIdx);
        
        if (!restaurant) {
            return {
                status: 404,
                message: '식당을 찾을 수 없습니다.'
            };
        }

        logger.info(`[getRestaurantDetail] Restaurant detail retrieved: ${restaurantIdx}`);
        
        return {
            status: 200,
            restaurant: restaurant
        };
    } catch (error) {
        logger.error(`[getRestaurantDetail] Error: ${error.message}`);
        throw error;
    }
};

exports.updateRestaurant = async (restaurantIdx, updateData) => {
    try {
        const restaurant = await RestaurantInfo.findByPk(restaurantIdx);
        
        if (!restaurant) {
            return {
                status: 404,
                message: '식당을 찾을 수 없습니다.'
            };
        }

        // 별점 검증 및 처리
        if (updateData.restaurantRating !== undefined && updateData.restaurantRating !== null) {
            const rating = parseFloat(updateData.restaurantRating);
            if (isNaN(rating) || rating < 0 || rating > 5) {
                return {
                    status: 400,
                    message: '별점은 0.0 ~ 5.0 사이의 값이어야 합니다.'
                };
            }
            // 0.5 단위로 반올림
            updateData.restaurantRating = Math.round(rating * 2) / 2;
        }

        await RestaurantInfo.update(updateData, {
            where: { restaurantIdx: restaurantIdx }
        });

        logger.info(`[updateRestaurant] Restaurant updated: ${restaurantIdx}`);
        
        return {
            status: 200,
            message: '식당 정보가 성공적으로 수정되었습니다.'
        };
    } catch (error) {
        logger.error(`[updateRestaurant] Error: ${error.message}`);
        throw error;
    }
};

exports.deleteRestaurant = async (restaurantIdx) => {
    try {
        const result = await RestaurantInfo.update(
            { restaurantStatus: 0 },
            { where: { restaurantIdx: restaurantIdx } }
        );

        if (result[0] === 0) {
            return {
                status: 404,
                message: '식당을 찾을 수 없습니다.'
            };
        }

        logger.info(`[deleteRestaurant] Restaurant deleted: ${restaurantIdx}`);
        
        return {
            status: 200,
            message: '식당이 성공적으로 삭제되었습니다.'
        };
    } catch (error) {
        logger.error(`[deleteRestaurant] Error: ${error.message}`);
        throw error;
    }
};

exports.getRestaurantStats = async () => {
    try {
        // 전체 식당 수
        const totalRestaurants = await RestaurantInfo.count({
            where: { restaurantStatus: 1 }
        });

        // 음식 종류별 통계
        const typeStats = await RestaurantInfo.findAll({
            attributes: [
                'restaurantType',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            where: { restaurantStatus: 1 },
            group: ['restaurantType'],
            order: [[require('sequelize').fn('COUNT', '*'), 'DESC']]
        });

        // 지역별 통계
        const locationStats = await RestaurantInfo.findAll({
            attributes: [
                'restaurantLocation',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            where: { restaurantStatus: 1 },
            group: ['restaurantLocation'],
            order: [[require('sequelize').fn('COUNT', '*'), 'DESC']]
        });

        // 최근 등록된 식당 (최근 5개)
        const recentRestaurants = await RestaurantInfo.findAll({
            where: { restaurantStatus: 1 },
            order: [['restaurantIdx', 'DESC']],
            limit: 5,
            attributes: ['restaurantIdx', 'restaurantName', 'restaurantType', 'restaurantLocation']
        });

        logger.info(`[getRestaurantStats] Stats retrieved - Total: ${totalRestaurants}`);

        return {
            status: 200,
            stats: {
                totalRestaurants,
                typeStats: typeStats.map(item => ({
                    type: item.restaurantType,
                    count: parseInt(item.dataValues.count)
                })),
                locationStats: locationStats.map(item => ({
                    location: item.restaurantLocation,
                    count: parseInt(item.dataValues.count)
                })),
                recentRestaurants
            }
        };
    } catch (error) {
        logger.error(`[getRestaurantStats] Error: ${error.message}`);
        throw error;
    }
};

// 식당 추가 요청 관리

exports.getRestaurantRequests = async (searchParams) => {
    try {
        const { status, page = 1, limit = 10 } = searchParams;
        
        let whereClause = {};
        
        if (status && ['pending', 'completed'].includes(status)) {
            whereClause.requestStatus = status;
        }

        const offset = (page - 1) * limit;
        
        const result = await RestaurantRequest.findAndCountAll({
            where: whereClause,
            order: [['requestDate', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        logger.info(`[getRestaurantRequests] Found ${result.count} requests`);
        
        return {
            status: 200,
            totalCount: result.count,
            totalPages: Math.ceil(result.count / limit),
            currentPage: parseInt(page),
            requests: result.rows
        };
    } catch (error) {
        logger.error(`[getRestaurantRequests] Error: ${error.message}`);
        throw error;
    }
};

exports.updateRestaurantRequestStatus = async (requestIdx, statusData) => {
    try {
        const { requestStatus, adminNote } = statusData;
        
        if (!['pending', 'completed'].includes(requestStatus)) {
            return {
                status: 400,
                message: '유효하지 않은 상태값입니다. (pending, completed)'
            };
        }

        const request = await RestaurantRequest.findByPk(requestIdx);
        
        if (!request) {
            return {
                status: 404,
                message: '요청을 찾을 수 없습니다.'
            };
        }

        const updateData = {
            requestStatus,
            adminNote: adminNote || null
        };

        if (requestStatus === 'completed') {
            updateData.processedDate = new Date();
        }

        await RestaurantRequest.update(updateData, {
            where: { requestIdx }
        });

        logger.info(`[updateRestaurantRequestStatus] Request status updated: ${requestIdx} -> ${requestStatus}`);
        
        return {
            status: 200,
            message: '요청 상태가 성공적으로 업데이트되었습니다.'
        };
    } catch (error) {
        logger.error(`[updateRestaurantRequestStatus] Error: ${error.message}`);
        throw error;
    }
};
