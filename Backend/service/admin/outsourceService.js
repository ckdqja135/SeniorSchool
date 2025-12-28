const { OutsourceInfo, OutsourceRequest } = require('../../model/index');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

exports.createOutsource = async (outsourceData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(outsourceData)) {
            // 배열인 경우 여러 외주업체를 일괄 생성
            const results = [];
            for (const outsource of outsourceData) {
                const { outsourceName, outsourceLocation, outsourceType, outsourceCEO } = outsource;

                // 필수값 체크
                if (!outsourceName || !outsourceLocation || !outsourceType || !outsourceCEO) {
                    logger.warn(`[createOutsource] Missing required fields: ${JSON.stringify(outsource)}`);
                    throw new Error('필수값이 누락되었습니다. (outsourceName, outsourceLocation, outsourceType, outsourceCEO)');
                }

                // DB에 데이터 생성
                const created = await OutsourceInfo.create({
                    outsourceName: outsource.outsourceName,
                    outsourceLocation: outsource.outsourceLocation,
                    outsourceType: outsource.outsourceType,
                    outsourceEstablished: outsource.outsourceEstablished || '',
                    outsourceCEO: outsource.outsourceCEO,
                    outsourceLatX: outsource.outsourceLatX || 0,
                    outsourceLatY: outsource.outsourceLatY || 0,
                    outsourceURL: outsource.outsourceURL || '',
                    outsourceLotAddr: outsource.outsourceLotAddr || '',
                    outsourceAddr: outsource.outsourceAddr || '',
                    outsourceMapIMG: outsource.outsourceMapIMG || null,
                    outsourceStatus: 1,
                    outsourceViewCount: 0
                });
                results.push(created);
                logger.info(`[createOutsource] 외주업체 등록 완료! : ${created.outsourceIdx}`);
            }
            return {
                insert: results.length,
                success: true
            };
        } else {
            // 단일 객체인 경우
            const { outsourceName, outsourceLocation, outsourceType, outsourceCEO } = outsourceData;

            // 필수값 체크
            if (!outsourceName || !outsourceLocation || !outsourceType || !outsourceCEO) {
                logger.warn(`[createOutsource] Missing required fields: ${JSON.stringify(outsourceData)}`);
                throw new Error('필수값이 누락되었습니다. (outsourceName, outsourceLocation, outsourceType, outsourceCEO)');
            }

            const created = await OutsourceInfo.create({
                outsourceName: outsourceData.outsourceName,
                outsourceLocation: outsourceData.outsourceLocation,
                outsourceType: outsourceData.outsourceType,
                outsourceEstablished: outsourceData.outsourceEstablished || '',
                outsourceCEO: outsourceData.outsourceCEO,
                outsourceLatX: outsourceData.outsourceLatX || 0,
                outsourceLatY: outsourceData.outsourceLatY || 0,
                outsourceURL: outsourceData.outsourceURL || '',
                outsourceLotAddr: outsourceData.outsourceLotAddr || '',
                outsourceAddr: outsourceData.outsourceAddr || '',
                outsourceMapIMG: outsourceData.outsourceMapIMG || null,
                outsourceStatus: 1,
                outsourceViewCount: 0
            });

            logger.info(`[createOutsource] 외주업체 등록 완료! : ${created.outsourceIdx}`);
            return {
                insert: 1,
                success: true,
                data: created
            };
        }
    } catch (error) {
        logger.error(`[createOutsource] Error: ${error.message}`);
        throw error;
    }
};

exports.searchOutsource = async (searchParams) => {
    try {
        const { name, type, location, page = 1, limit = 10 } = searchParams;
        
        let whereClause = { outsourceStatus: 1 }; // 활성 상태만
        
        // 검색 조건 추가
        if (name && name.trim() !== '') {
            whereClause.outsourceName = {
                [Op.like]: `%${name.trim()}%`
            };
        }
        
        if (type && type.trim() !== '') {
            whereClause.outsourceType = type.trim();
        }
        
        if (location && location.trim() !== '') {
            whereClause.outsourceLocation = {
                [Op.like]: `%${location.trim()}%`
            };
        }

        // 페이징 처리
        const offset = (page - 1) * limit;
        
        const result = await OutsourceInfo.findAndCountAll({
            where: whereClause,
            order: [['outsourceName', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        logger.info(`[searchOutsource] Found ${result.count} outsources`);
        
        return {
            status: 200,
            totalCount: result.count,
            totalPages: Math.ceil(result.count / limit),
            currentPage: parseInt(page),
            outsources: result.rows
        };
    } catch (error) {
        logger.error(`[searchOutsource] Error: ${error.message}`);
        throw error;
    }
};

exports.getOutsourceDetail = async (outsourceIdx) => {
    try {
        const outsource = await OutsourceInfo.findByPk(outsourceIdx);
        
        if (!outsource) {
            return {
                status: 404,
                message: '외주업체를 찾을 수 없습니다.'
            };
        }

        logger.info(`[getOutsourceDetail] Outsource detail retrieved: ${outsourceIdx}`);
        
        return {
            status: 200,
            outsource: outsource
        };
    } catch (error) {
        logger.error(`[getOutsourceDetail] Error: ${error.message}`);
        throw error;
    }
};

exports.updateOutsource = async (outsourceIdx, updateData) => {
    try {
        const outsource = await OutsourceInfo.findByPk(outsourceIdx);
        
        if (!outsource) {
            return {
                status: 404,
                message: '외주업체를 찾을 수 없습니다.'
            };
        }

        await OutsourceInfo.update(updateData, {
            where: { outsourceIdx: outsourceIdx }
        });

        logger.info(`[updateOutsource] Outsource updated: ${outsourceIdx}`);
        
        return {
            status: 200,
            message: '외주업체 정보가 성공적으로 수정되었습니다.'
        };
    } catch (error) {
        logger.error(`[updateOutsource] Error: ${error.message}`);
        throw error;
    }
};

exports.deleteOutsource = async (outsourceIdx) => {
    try {
        const result = await OutsourceInfo.update(
            { outsourceStatus: 0 },
            { where: { outsourceIdx: outsourceIdx } }
        );

        if (result[0] === 0) {
            return {
                status: 404,
                message: '외주업체를 찾을 수 없습니다.'
            };
        }

        logger.info(`[deleteOutsource] Outsource deleted: ${outsourceIdx}`);
        
        return {
            status: 200,
            message: '외주업체가 성공적으로 삭제되었습니다.'
        };
    } catch (error) {
        logger.error(`[deleteOutsource] Error: ${error.message}`);
        throw error;
    }
};

exports.getOutsourceStats = async () => {
    try {
        // 전체 외주업체 수
        const totalOutsources = await OutsourceInfo.count({
            where: { outsourceStatus: 1 }
        });

        // 외주 타입별 통계
        const typeStats = await OutsourceInfo.findAll({
            attributes: [
                'outsourceType',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            where: { outsourceStatus: 1 },
            group: ['outsourceType'],
            order: [[require('sequelize').fn('COUNT', '*'), 'DESC']]
        });

        // 지역별 통계
        const locationStats = await OutsourceInfo.findAll({
            attributes: [
                'outsourceLocation',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            where: { outsourceStatus: 1 },
            group: ['outsourceLocation'],
            order: [[require('sequelize').fn('COUNT', '*'), 'DESC']]
        });

        // 최근 등록된 외주업체 (최근 5개)
        const recentOutsources = await OutsourceInfo.findAll({
            where: { outsourceStatus: 1 },
            order: [['outsourceIdx', 'DESC']],
            limit: 5,
            attributes: ['outsourceIdx', 'outsourceName', 'outsourceType', 'outsourceLocation']
        });

        logger.info(`[getOutsourceStats] Stats retrieved - Total: ${totalOutsources}`);

        return {
            status: 200,
            stats: {
                totalOutsources,
                typeStats: typeStats.map(item => ({
                    type: item.outsourceType,
                    count: parseInt(item.dataValues.count)
                })),
                locationStats: locationStats.map(item => ({
                    location: item.outsourceLocation,
                    count: parseInt(item.dataValues.count)
                })),
                recentOutsources
            }
        };
    } catch (error) {
        logger.error(`[getOutsourceStats] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 추가 요청 관리

exports.createOutsourceRequest = async (requestData) => {
    try {
        const { outsourceName, outsourceCEO, outsourceType, outsourceAddr } = requestData;

        if (!outsourceName || outsourceName.trim() === '') {
            return {
                status: 400,
                message: '외주업체명은 필수입니다.'
            };
        }

        // 중복 요청 체크
        const existingRequest = await OutsourceRequest.findOne({
            where: {
                outsourceName: outsourceName.trim(),
                requestStatus: 'pending'
            }
        });

        if (existingRequest) {
            return {
                status: 409,
                message: '이미 동일한 외주업체에 대한 요청이 처리 대기중입니다.'
            };
        }

        const newRequest = await OutsourceRequest.create({
            outsourceName: outsourceName.trim(),
            outsourceCEO: outsourceCEO ? outsourceCEO.trim() : null,
            outsourceType: outsourceType ? outsourceType.trim() : null,
            outsourceAddr: outsourceAddr ? outsourceAddr.trim() : null,
            requestStatus: 'pending'
        });

        logger.info(`[createOutsourceRequest] New request created: ${newRequest.requestIdx}`);

        return {
            status: 201,
            message: '외주업체 추가 요청이 성공적으로 등록되었습니다.',
            data: newRequest
        };
    } catch (error) {
        logger.error(`[createOutsourceRequest] Error: ${error.message}`);
        throw error;
    }
};

exports.getOutsourceRequests = async (searchParams) => {
    try {
        const { status, page = 1, limit = 10 } = searchParams;
        
        let whereClause = {};
        
        if (status && ['pending', 'completed'].includes(status)) {
            whereClause.requestStatus = status;
        }

        const offset = (page - 1) * limit;
        
        const result = await OutsourceRequest.findAndCountAll({
            where: whereClause,
            order: [['requestDate', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        logger.info(`[getOutsourceRequests] Found ${result.count} requests`);
        
        return {
            status: 200,
            totalCount: result.count,
            totalPages: Math.ceil(result.count / limit),
            currentPage: parseInt(page),
            requests: result.rows
        };
    } catch (error) {
        logger.error(`[getOutsourceRequests] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 추가 요청 단일 조회
exports.getOutsourceRequest = async (requestIdx) => {
    try {
        const request = await OutsourceRequest.findByPk(requestIdx);
        
        if (!request) {
            return {
                status: 404,
                message: '요청을 찾을 수 없습니다.'
            };
        }

        logger.info(`[getOutsourceRequest] Request retrieved: ${requestIdx}`);
        
        // requestData가 있으면 파싱해서 모든 정보를 포함
        let requestData = null;
        if (request.requestData) {
            // JSON 필드가 이미 파싱되어 있거나 문자열일 수 있음
            if (typeof request.requestData === 'string') {
                try {
                    requestData = JSON.parse(request.requestData);
                } catch (e) {
                    logger.warn(`[getOutsourceRequest] Failed to parse requestData: ${e.message}`);
                    requestData = request.requestData;
                }
            } else {
                requestData = request.requestData;
            }
        }

        // 기존 필드와 requestData를 합쳐서 반환
        const responseData = {
            requestIdx: request.requestIdx,
            outsourceName: request.outsourceName,
            outsourceCEO: request.outsourceCEO,
            outsourceType: request.outsourceType,
            outsourceAddr: request.outsourceAddr,
            requestStatus: request.requestStatus,
            requestDate: request.requestDate,
            processedDate: request.processedDate,
            adminNote: request.adminNote,
            // requestData의 모든 정보를 포함
            ...(requestData || {})
        };
        
        return {
            status: 200,
            data: responseData
        };
    } catch (error) {
        logger.error(`[getOutsourceRequest] Error: ${error.message}`);
        throw error;
    }
};

exports.updateOutsourceRequestStatus = async (requestIdx, statusData) => {
    try {
        const { requestStatus, adminNote } = statusData;
        
        if (!['pending', 'completed'].includes(requestStatus)) {
            return {
                status: 400,
                message: '유효하지 않은 상태값입니다. (pending, completed)'
            };
        }

        const request = await OutsourceRequest.findByPk(requestIdx);
        
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

        await OutsourceRequest.update(updateData, {
            where: { requestIdx }
        });

        logger.info(`[updateOutsourceRequestStatus] Request status updated: ${requestIdx} -> ${requestStatus}`);
        
        return {
            status: 200,
            message: '요청 상태가 성공적으로 업데이트되었습니다.'
        };
    } catch (error) {
        logger.error(`[updateOutsourceRequestStatus] Error: ${error.message}`);
        throw error;
    }
};
