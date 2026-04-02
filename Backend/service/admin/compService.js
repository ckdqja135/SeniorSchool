const { CompInfo, CompRequest } = require('../../model/index');
const { Op, literal } = require('sequelize');
const logger = require('../../utils/logger');

// 회사 생성
exports.createComp = async (compData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(compData)) {
            // 배열인 경우 여러 회사를 일괄 생성
            const results = [];
            for (const comp of compData) {
                const { compName, compLocate, compLateX, compLateY } = comp;

                // 필수값 체크
                const requiredFields = ['compName', 'compLocate', 'compType', 'compCEO', 'compIndustry', 'compLateX', 'compLateY', 'compLotAddr', 'compAddr'];
                const missingFields = requiredFields.filter(field => !comp[field]);
                
                if (missingFields.length > 0) {
                    logger.warn(`[createComp] Missing required fields: ${missingFields.join(', ')}`);
                    throw new Error(`필수값이 누락되었습니다. (${missingFields.join(', ')})`);
                }

                // DB에 데이터 생성
                const created = await CompInfo.create(comp);
                results.push(created);
                logger.info(`[createComp] 회사 등록 완료! : ${created.compIdx}`);
            }
            return results;
        } else {
            // 단일 객체인 경우
            const { compName, compLocate, compLateX, compLateY } = compData;

            // 필수값 체크
            const requiredFields = ['compName', 'compLocate', 'compType', 'compCEO', 'compIndustry', 'compLateX', 'compLateY', 'compLotAddr', 'compAddr'];
            const missingFields = requiredFields.filter(field => !compData[field]);
            
            if (missingFields.length > 0) {
                logger.warn(`[createComp] Missing required fields: ${missingFields.join(', ')}`);
                throw new Error(`필수값이 누락되었습니다. (${missingFields.join(', ')})`);
            }

            // DB에 데이터 생성
            const created = await CompInfo.create(compData);
            logger.info(`[createComp] 회사 등록 완료! : ${created.compIdx}`);

            return created;
        }
    } catch (error) {
        // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
        logger.error(`[createComp] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 회사 검색 서비스
 * @param {Object} searchParams - 검색 파라미터
 * @returns {Object} 검색 결과
 */
exports.searchComp = async (searchParams) => {
    try {
        const {
            compName,
            compLocate,
            compType,
            compIndustry,
            compStatus,
            rowsPerPage = 20,
            page = 1
        } = searchParams;

        // 검색 조건 구성
        const whereClause = {};

        if (compName) {
            whereClause.compName = {
                [Op.like]: `%${compName}%`
            };
        }

        if (compLocate) {
            whereClause.compLocate = {
                [Op.like]: `%${compLocate}%`
            };
        }

        if (compType) {
            whereClause.compType = compType;
        }

        if (compIndustry) {
            whereClause.compIndustry = {
                [Op.like]: `%${compIndustry}%`
            };
        }

        if (compStatus !== undefined) {
            whereClause.compStatus = compStatus;
        }

        // 페이지네이션 설정
        const limit = parseInt(rowsPerPage);
        const offset = (parseInt(page) - 1) * limit;

        logger.info(`[searchComp] Search conditions: ${JSON.stringify(whereClause)}`);
        logger.info(`[searchComp] Pagination: limit=${limit}, offset=${offset}`);

        // 전체 개수 조회
        const totalCount = await CompInfo.count({
            where: whereClause
        });

        // 데이터 조회
        const companies = await CompInfo.findAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: [['compIdx', 'DESC']]
        });

        const totalPages = Math.ceil(totalCount / limit);

        logger.info(`[searchComp] Found ${totalCount} companies, returning ${companies.length} companies`);

        return {
            status: 200,
            message: '회사 검색이 완료되었습니다.',
            data: companies,
            totalCount: totalCount,
            pagination: {
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: parseInt(page),
                rowsPerPage: limit,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        };

    } catch (error) {
        logger.error(`[searchComp] Error: ${error.message}`);
        logger.error(`[searchComp] Stack trace: ${error.stack}`);
        throw error;
    }
};

/**
 * 회사 상세보기 서비스 (idx 기반)
 * @param {number} compIdx - 회사 인덱스
 * @returns {Object} 회사 상세 정보
 */
exports.getCompDetail = async (compIdx) => {
    try {
        logger.info(`[getCompDetail] Searching for compIdx: ${compIdx}`);

        const company = await CompInfo.findByPk(compIdx);

        if (!company) {
            logger.warn(`[getCompDetail] Company not found: ${compIdx}`);
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        // 조회수 증가
        await CompInfo.update(
            { compViewCount: literal('compViewCount + 1'), updatedAt: literal('updated_at') },
            { where: { compIdx: company.compIdx }, silent: true }
        );

        logger.info(`[getCompDetail] Company found: ${company.compName}`);

        return {
            status: 200,
            message: '회사 상세 정보를 조회했습니다.',
            data: company
        };

    } catch (error) {
        logger.error(`[getCompDetail] Error: ${error.message}`);
        logger.error(`[getCompDetail] Stack trace: ${error.stack}`);
        throw error;
    }
};

/**
 * 회사 상세보기 서비스 (이름 기반)
 * @param {string} compName - 회사명
 * @returns {Object} 회사 상세 정보
 */
exports.getCompDetailByName = async (compName) => {
    try {
        logger.info(`[getCompDetailByName] Searching for compName: ${compName}`);

        const company = await CompInfo.findOne({
            where: {
                compName: compName,
                compStatus: 1 // 활성화된 회사만
            }
        });

        if (!company) {
            logger.warn(`[getCompDetailByName] Company not found: ${compName}`);
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        // 조회수 증가
        await CompInfo.update(
            { compViewCount: literal('compViewCount + 1'), updatedAt: literal('updated_at') },
            { where: { compIdx: company.compIdx }, silent: true }
        );

        logger.info(`[getCompDetailByName] Company found: ${company.compName}`);

        return {
            status: 200,
            message: '회사 상세 정보를 조회했습니다.',
            data: company
        };

    } catch (error) {
        logger.error(`[getCompDetailByName] Error: ${error.message}`);
        logger.error(`[getCompDetailByName] Stack trace: ${error.stack}`);
        throw error;
    }
};

/**
 * 회사 정보 수정 서비스
 * @param {number} compIdx - 회사 인덱스
 * @param {Object} updateData - 수정할 데이터
 * @returns {Object} 수정 결과
 */
exports.putCompData = async (compIdx, updateData) => {
    try {
        logger.info(`[putCompData] Updating compIdx: ${compIdx}`);
        logger.info(`[putCompData] Update data: ${JSON.stringify(updateData)}`);

        const company = await CompInfo.findByPk(compIdx);

        if (!company) {
            logger.warn(`[putCompData] Company not found: ${compIdx}`);
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        // 데이터 업데이트
        await company.update(updateData);

        logger.info(`[putCompData] Company updated successfully: ${compIdx}`);

        return {
            status: 200,
            message: '회사 정보가 수정되었습니다.',
            data: company
        };

    } catch (error) {
        logger.error(`[putCompData] Error: ${error.message}`);
        logger.error(`[putCompData] Stack trace: ${error.stack}`);
        throw error;
    }
};

/**
 * 회사 삭제 서비스
 * @param {number} compIdx - 회사 인덱스
 * @returns {Object} 삭제 결과
 */
exports.deleteComp = async (compIdx) => {
    try {
        logger.info(`[deleteComp] Deleting compIdx: ${compIdx}`);

        const company = await CompInfo.findByPk(compIdx);

        if (!company) {
            logger.warn(`[deleteComp] Company not found: ${compIdx}`);
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        // 회사 삭제
        await company.destroy();

        logger.info(`[deleteComp] Company deleted successfully: ${compIdx}`);

        return {
            status: 200,
            message: '회사가 삭제되었습니다.',
            data: null
        };

    } catch (error) {
        logger.error(`[deleteComp] Error: ${error.message}`);
        logger.error(`[deleteComp] Stack trace: ${error.stack}`);
        throw error;
    }
};

/**
 * 회사 상태 변경 서비스
 * @param {number} compIdx - 회사 인덱스
 * @param {number} compStatus - 새로운 상태 (0: 비활성, 1: 활성)
 * @returns {Object} 상태 변경 결과
 */
exports.updateCompStatus = async (compIdx, compStatus) => {
    try {
        logger.info(`[updateCompStatus] Updating compIdx: ${compIdx}, status: ${compStatus}`);

        const company = await CompInfo.findByPk(compIdx);

        if (!company) {
            logger.warn(`[updateCompStatus] Company not found: ${compIdx}`);
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null
            };
        }

        // 상태 업데이트
        await company.update({ compStatus: compStatus });

        logger.info(`[updateCompStatus] Company status updated successfully: ${compIdx} -> ${compStatus}`);

        return {
            status: 200,
            message: '회사 상태가 변경되었습니다.',
            data: company
        };

    } catch (error) {
        logger.error(`[updateCompStatus] Error: ${error.message}`);
        logger.error(`[updateCompStatus] Stack trace: ${error.stack}`);
        throw error;
    }
};

/**
 * 회사 추가 요청 목록 조회 서비스 (관리자용)
 * @param {Object} searchParams - 검색 조건 (status, page, rowsPerPage)
 * @returns {Promise<Object>} - 요청 목록과 페이징 정보
 */
exports.getCompRequests = async (searchParams = {}) => {
    try {
        const { status, page = 1, rowsPerPage = 10 } = searchParams;
        
        // 문자열로 전달된 page와 rowsPerPage를 숫자로 변환
        const pageNum = parseInt(page, 10) || 1;
        const rowsPerPageNum = parseInt(rowsPerPage, 10) || 10;
        const offset = (pageNum - 1) * rowsPerPageNum;

        // 검색 조건 구성
        const whereClause = {};
        if (status && ['pending', 'completed', 'rejected'].includes(status)) {
            whereClause.requestStatus = status;
        }

        // 요청 목록 조회
        const { count, rows } = await CompRequest.findAndCountAll({
            where: whereClause,
            order: [['requestDate', 'DESC']], // 최신 요청순
            limit: rowsPerPageNum,
            offset
        });

        logger.info(`[getCompRequests] 회사 요청 목록 조회 완료: ${rows.length}개 / 총 ${count}개`);
        
        return {
            status: 200,
            data: rows,
            totalCount: count,
            currentPage: pageNum,
            rowsPerPage: rowsPerPageNum,
            totalPages: Math.ceil(count / rowsPerPageNum)
        };
    } catch (error) {
        logger.error(`[getCompRequests] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 회사 추가 요청 상태 업데이트 서비스 (관리자용)
 * @param {number} requestIdx - 요청 인덱스
 * @param {string} status - 새로운 상태 ('pending', 'completed', 'rejected')
 * @param {string} adminNote - 관리자 메모
 * @returns {Promise<Object>} - 업데이트 결과
 */
exports.updateCompRequestStatus = async (requestIdx, status, adminNote) => {
    try {
        const request = await CompRequest.findByPk(requestIdx);

        if (!request) {
            return {
                status: 404,
                message: '회사 요청을 찾을 수 없습니다.',
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

        await CompRequest.update(updateData, {
            where: { requestIdx: requestIdx }
        });

        // 업데이트된 요청 정보 조회
        const updatedRequest = await CompRequest.findByPk(requestIdx);

        logger.info(`[updateCompRequestStatus] 회사 요청 상태 업데이트 완료: ${requestIdx} -> ${status}`);

        return {
            status: 200,
            message: '회사 요청 상태가 성공적으로 업데이트되었습니다.',
            data: updatedRequest
        };
    } catch (error) {
        logger.error(`[updateCompRequestStatus] Error: ${error.message}`);
        throw error;
    }
};
