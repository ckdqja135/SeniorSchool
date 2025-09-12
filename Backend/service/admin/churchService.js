const { ChurchInfo, ChurchRequest } = require('../../model/index');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

exports.createChurch = async (churchData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(churchData)) {
            // 배열인 경우 여러 교회를 일괄 생성
            const results = [];
            for (const church of churchData) {
                const { churchName, churchLocation, churchType, churchPastor } = church;

                // 필수값 체크
                if (!churchName || !churchLocation || !churchType || !churchPastor) {
                    logger.warn(`[createChurch] Missing required fields: ${JSON.stringify(church)}`);
                    throw new Error('필수값이 누락되었습니다. (churchName, churchLocation, churchType, churchPastor)');
                }

                // DB에 데이터 생성
                const created = await ChurchInfo.create({
                    churchName: church.churchName,
                    churchLocation: church.churchLocation,
                    churchType: church.churchType,
                    churchEstablished: church.churchEstablished || '',
                    churchPastor: church.churchPastor,
                    churchLatX: church.churchLatX || 0,
                    churchLatY: church.churchLatY || 0,
                    churchURL: church.churchURL || '',
                    churchLotAddr: church.churchLotAddr || '',
                    churchAddr: church.churchAddr || '',
                    churchMapIMG: church.churchMapIMG || null,
                    churchStatus: 1,
                    churchViewCount: 0
                });
                results.push(created);
                logger.info(`[createChurch] 교회 등록 완료! : ${created.churchIdx}`);
            }
            return {
                insert: results.length,
                success: true
            };
        } else {
            // 단일 객체인 경우
            const { churchName, churchLocation, churchType, churchPastor } = churchData;

            // 필수값 체크
            if (!churchName || !churchLocation || !churchType || !churchPastor) {
                logger.warn(`[createChurch] Missing required fields: ${JSON.stringify(churchData)}`);
                throw new Error('필수값이 누락되었습니다. (churchName, churchLocation, churchType, churchPastor)');
            }

            // DB에 데이터 생성
            const created = await ChurchInfo.create({
                churchName: churchData.churchName,
                churchLocation: churchData.churchLocation,
                churchType: churchData.churchType,
                churchEstablished: churchData.churchEstablished || '',
                churchPastor: churchData.churchPastor,
                churchLatX: churchData.churchLatX || 0,
                churchLatY: churchData.churchLatY || 0,
                churchURL: churchData.churchURL || '',
                churchLotAddr: churchData.churchLotAddr || '',
                churchAddr: churchData.churchAddr || '',
                churchMapIMG: churchData.churchMapIMG || null,
                churchStatus: 1,
                churchViewCount: 0
            });
            logger.info(`[createChurch] 교회 등록 완료! : ${created.churchIdx}`);

            return {
                insert: 1,
                success: true
            };
        }
    } catch (error) {
        // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
        logger.error(`[createChurch] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 검색 서비스
 * @param {Object} searchParams - 검색 조건
 * @returns {Object} 검색 결과
 */
exports.searchChurch = async (searchParams) => {
    try {
        const {
            churchName,
            churchLocation,
            churchType,
            churchPastor,
            churchStatus,
            rowsPerPage = 10,
            currentPage = 1
        } = searchParams;

        // 검색 조건 구성
        const whereClause = {};

        if (churchName) {
            whereClause.churchName = {
                [Op.like]: `%${churchName}%`
            };
        }

        if (churchLocation) {
            whereClause.churchLocation = {
                [Op.like]: `%${churchLocation}%`
            };
        }

        if (churchType) {
            whereClause.churchType = {
                [Op.like]: `%${churchType}%`
            };
        }

        if (churchPastor) {
            whereClause.churchPastor = {
                [Op.like]: `%${churchPastor}%`
            };
        }

        if (churchStatus !== undefined) {
            whereClause.churchStatus = churchStatus;
        }

        // 페이징 계산
        const offset = (currentPage - 1) * rowsPerPage;

        // 검색 실행
        const { count, rows } = await ChurchInfo.findAndCountAll({
            where: whereClause,
            order: [['churchIdx', 'DESC']],
            limit: parseInt(rowsPerPage),
            offset: offset
        });

        const totalPages = Math.ceil(count / rowsPerPage);

        logger.info(`[searchChurch] 검색 완료: ${count}개 중 ${rows.length}개 반환`);

        return {
            status: 200,
            data: rows,
            totalCount: count,
            currentPage: parseInt(currentPage),
            totalPages: totalPages,
            rowsPerPage: parseInt(rowsPerPage)
        };
    } catch (error) {
        logger.error(`[searchChurch] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 상세보기 서비스
 * @param {number} churchIdx - 교회 인덱스
 * @returns {Object} 교회 상세 정보
 */
exports.getChurchDetail = async (churchIdx) => {
    try {
        const church = await ChurchInfo.findByPk(churchIdx);

        if (!church) {
            return {
                status: 404,
                message: '교회를 찾을 수 없습니다.',
                data: null
            };
        }

        logger.info(`[getChurchDetail] 교회 상세보기 완료: ${church.churchName}`);

        return {
            status: 200,
            data: church
        };
    } catch (error) {
        logger.error(`[getChurchDetail] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 수정 서비스
 * @param {number} churchIdx - 교회 인덱스
 * @param {Object} updateData - 수정할 데이터
 * @returns {Object} 수정 결과
 */
exports.updateChurch = async (churchIdx, updateData) => {
    try {
        const church = await ChurchInfo.findByPk(churchIdx);

        if (!church) {
            return {
                status: 404,
                message: '교회를 찾을 수 없습니다.',
                data: null
            };
        }

        // 교회 정보 수정
        await ChurchInfo.update(updateData, {
            where: { churchIdx: churchIdx }
        });

        // 수정된 교회 정보 조회
        const updatedChurch = await ChurchInfo.findByPk(churchIdx);

        logger.info(`[updateChurch] 교회 수정 완료: ${churchIdx}`);

        return {
            status: 200,
            message: '교회 정보가 성공적으로 수정되었습니다.',
            data: updatedChurch
        };
    } catch (error) {
        logger.error(`[updateChurch] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 삭제 서비스 (소프트 삭제)
 * @param {number} churchIdx - 교회 인덱스
 * @returns {Object} 삭제 결과
 */
exports.deleteChurch = async (churchIdx) => {
    try {
        const church = await ChurchInfo.findByPk(churchIdx);

        if (!church) {
            return {
                status: 404,
                message: '교회를 찾을 수 없습니다.',
                data: null
            };
        }

        // 소프트 삭제 (churchStatus를 0으로 변경)
        await ChurchInfo.update(
            { churchStatus: 0 },
            { where: { churchIdx: churchIdx } }
        );

        logger.info(`[deleteChurch] 교회 삭제 완료: ${churchIdx}`);

        return {
            status: 200,
            message: '교회가 성공적으로 삭제되었습니다.',
            data: null
        };
    } catch (error) {
        logger.error(`[deleteChurch] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 통계 조회 서비스
 * @returns {Object} 교회 통계 정보
 */
exports.getChurchStats = async () => {
    try {
        // 전체 교회 수
        const totalChurches = await ChurchInfo.count();

        // 활성 교회 수
        const activeChurches = await ChurchInfo.count({
            where: { churchStatus: 1 }
        });

        // 비활성 교회 수
        const inactiveChurches = await ChurchInfo.count({
            where: { churchStatus: 0 }
        });

        // 교회 종류별 통계
        const churchTypeStats = await ChurchInfo.findAll({
            attributes: [
                'churchType',
                [ChurchInfo.sequelize.fn('COUNT', ChurchInfo.sequelize.col('churchType')), 'count']
            ],
            where: { churchStatus: 1 },
            group: ['churchType'],
            order: [[ChurchInfo.sequelize.fn('COUNT', ChurchInfo.sequelize.col('churchType')), 'DESC']]
        });

        // 지역별 통계
        const locationStats = await ChurchInfo.findAll({
            attributes: [
                'churchLocation',
                [ChurchInfo.sequelize.fn('COUNT', ChurchInfo.sequelize.col('churchLocation')), 'count']
            ],
            where: { churchStatus: 1 },
            group: ['churchLocation'],
            order: [[ChurchInfo.sequelize.fn('COUNT', ChurchInfo.sequelize.col('churchLocation')), 'DESC']],
            limit: 10
        });

        // 조회수 상위 10개 교회
        const topViewedChurches = await ChurchInfo.findAll({
            attributes: ['churchIdx', 'churchName', 'churchLocation', 'churchType', 'churchViewCount'],
            where: { churchStatus: 1 },
            order: [['churchViewCount', 'DESC']],
            limit: 10
        });

        logger.info(`[getChurchStats] 교회 통계 조회 완료`);

        return {
            status: 200,
            data: {
                totalChurches,
                activeChurches,
                inactiveChurches,
                churchTypeStats,
                locationStats,
                topViewedChurches
            }
        };
    } catch (error) {
        logger.error(`[getChurchStats] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 추가 요청 생성
 * @param {Object} requestData - 요청 데이터 (churchName, churchPastor, churchType, churchAddr)
 * @returns {Promise<Object>} - 생성 결과
 */
exports.createChurchRequest = async (requestData) => {
    try {
        const { churchName, churchPastor, churchType, churchAddr } = requestData;

        // 필수값 체크 (교회 이름만 필수)
        if (!churchName || churchName.trim() === '') {
            throw new Error('교회 이름은 필수입니다.');
        }

        // 교회 이름 중복 체크 (이미 요청된 교회인지)
        const existingRequest = await ChurchRequest.findOne({
            where: { churchName: churchName.trim() }
        });

        if (existingRequest) {
            return {
                success: false,
                message: '이미 요청된 교회입니다.',
                existingRequest
            };
        }

        // 요청 데이터 생성
        const newRequest = await ChurchRequest.create({
            churchName: churchName.trim(),
            churchPastor: churchPastor ? churchPastor.trim() : null,
            churchType: churchType ? churchType.trim() : null,
            churchAddr: churchAddr ? churchAddr.trim() : null,
            requestStatus: 'pending',
            requestDate: new Date()
        });

        logger.info(`[createChurchRequest] 교회 요청 생성 완료: ${newRequest.requestIdx} - ${newRequest.churchName}`);
        
        return {
            success: true,
            message: '교회 요청이 성공적으로 등록되었습니다.',
            data: newRequest
        };
    } catch (error) {
        logger.error(`[createChurchRequest] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 추가 요청 목록 조회 서비스 (관리자용)
 * @param {Object} searchParams - 검색 조건 (status, page, rowsPerPage)
 * @returns {Promise<Object>} - 요청 목록과 페이징 정보
 */
exports.getChurchRequests = async (searchParams = {}) => {
    try {
        const { status, page = 1, rowsPerPage = 10 } = searchParams;
        
        // 문자열로 전달된 page와 rowsPerPage를 숫자로 변환
        const pageNum = parseInt(page, 10) || 1;
        const rowsPerPageNum = parseInt(rowsPerPage, 10) || 10;
        const offset = (pageNum - 1) * rowsPerPageNum;

        // 검색 조건 구성
        const whereClause = {};
        if (status && ['pending', 'completed'].includes(status)) {
            whereClause.requestStatus = status;
        }

        // 요청 목록 조회
        const { count, rows } = await ChurchRequest.findAndCountAll({
            where: whereClause,
            order: [['requestDate', 'DESC']], // 최신 요청순
            limit: rowsPerPageNum,
            offset
        });

        logger.info(`[getChurchRequests] 교회 요청 목록 조회 완료: ${rows.length}개 / 총 ${count}개`);
        
        return {
            status: 200,
            data: rows,
            totalCount: count,
            currentPage: pageNum,
            rowsPerPage: rowsPerPageNum,
            totalPages: Math.ceil(count / rowsPerPageNum)
        };
    } catch (error) {
        logger.error(`[getChurchRequests] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 추가 요청 상태 업데이트 서비스 (관리자용)
 * @param {number} requestIdx - 요청 인덱스
 * @param {string} status - 새로운 상태 ('pending' 또는 'completed')
 * @param {string} adminNote - 관리자 메모
 * @returns {Promise<Object>} - 업데이트 결과
 */
exports.updateChurchRequestStatus = async (requestIdx, status, adminNote) => {
    try {
        const request = await ChurchRequest.findByPk(requestIdx);

        if (!request) {
            return {
                status: 404,
                message: '교회 요청을 찾을 수 없습니다.',
                data: null
            };
        }

        // 상태 업데이트
        const updateData = {
            requestStatus: status
        };

        if (status === 'completed') {
            updateData.processedDate = new Date();
        }

        if (adminNote) {
            updateData.adminNote = adminNote;
        }

        await ChurchRequest.update(updateData, {
            where: { requestIdx: requestIdx }
        });

        // 업데이트된 요청 정보 조회
        const updatedRequest = await ChurchRequest.findByPk(requestIdx);

        logger.info(`[updateChurchRequestStatus] 교회 요청 상태 업데이트 완료: ${requestIdx} -> ${status}`);

        return {
            status: 200,
            message: '교회 요청 상태가 성공적으로 업데이트되었습니다.',
            data: updatedRequest
        };
    } catch (error) {
        logger.error(`[updateChurchRequestStatus] Error: ${error.message}`);
        throw error;
    }
};
