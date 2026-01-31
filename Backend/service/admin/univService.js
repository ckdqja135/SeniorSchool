const { University } = require('../../model/index');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

exports.createUniv = async (univData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(univData)) {
            // 배열인 경우 여러 대학교를 일괄 생성
            const results = [];
            for (const univ of univData) {
                const { univName, univLocate, univLateX, univLateY } = univ;

                // 필수값 체크
                if (!univName || !univLocate || !univLateX || !univLateY) {
                    logger.warn(`[createUniv] Missing required fields: ${JSON.stringify(univ)}`);
                    throw new Error('필수값이 누락되었습니다. (univName, univLocate, univLateX, univLateY)');
                }

                // DB에 데이터 생성
                const created = await University.create(univ);
                results.push(created);
                logger.info(`[createUniv] 대학교 등록 완료! : ${created.univIdx}`);
            }
            return results;
        } else {
            // 단일 객체인 경우
            const { univName, univLocate, univLateX, univLateY } = univData;

            // 필수값 체크
            if (!univName || !univLocate || !univLateX || !univLateY) {
                logger.warn(`[createUniv] Missing required fields: ${JSON.stringify(univData)}`);
                throw new Error('필수값이 누락되었습니다. (univName, univLocate, univLateX, univLateY)');
            }

            // DB에 데이터 생성
            const created = await University.create(univData);
            logger.info(`[createUniv] 대학교 등록 완료! : ${created.univIdx}`);

            return created;
        }
    } catch (error) {
        // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
        logger.error(`[createUniv] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 대학교 검색 서비스
 * @param {Object} searchParams - 검색 조건 (예: { rowsPerPage: 10, page: 1, keyword: '서울' })
 * @returns {Promise<Object>} - 검색 결과, 페이징 정보 포함
 */
exports.searchUniv = async (data) => {
    // 파라미터 타입을 명시적으로 숫자로 변환
    const rowsPerPage = parseInt(data.rowsPerPage, 10) || 10;
    const page = parseInt(data.page || data.currentPage, 10) || 1;
    const keyword = data.keyword || '';
    const offset = (page - 1) * rowsPerPage;

    // univStatus가 1인 항목만 필터
    const whereClause = {
        univStatus: 1,
    };

    // keyword가 숫자인지 문자열인지에 따라 조건 분기
    if (keyword) {
        if (!isNaN(keyword)) {
            whereClause.univIdx = parseInt(keyword, 10);
        } else {
            // 여러 컬럼에서 검색하고 싶다면 아래처럼 추가
            whereClause[Op.or] = [
                { univName: { [Op.like]: `%${keyword}%` } }
            ];
        }
    }

    try {
        // 파라미터 유효성 검사
        if (rowsPerPage <= 0 || page <= 0) {
            throw new Error('rowsPerPage와 page는 1 이상의 양수여야 합니다.');
        }

        logger.info(`[searchUniv] Query params - rowsPerPage: ${rowsPerPage}, page: ${page}, offset: ${offset}`);

        // 실제 DB 검색
        const { count, rows } = await University.findAndCountAll({
            where: whereClause,
            limit: rowsPerPage,
            offset,
            order: [['univIdx', 'ASC']],
        });

        logger.info(`[searchUniv] Query executed successfully - found ${count} total records`);

        // 결과를 객체 형태로 리턴
        return {
            status: 200,
            data: rows,
            totalCount: count,
            currentPage: page,
            rowsPerPage,
        };
    } catch (error) {
        logger.error(`[searchUniv] Database query error: ${error.message}`);
        logger.error(`[searchUniv] Query params - rowsPerPage: ${rowsPerPage}, page: ${page}, offset: ${offset}`);
        throw error;
    }
};

// 학교 상세보기 서비스
exports.getUnivDetail = async (univIdx) => {
    try {
        const university = await University.findOne({
            where: { UnivIdx: univIdx },
        });

        if (!university) {
            return { status: 404, message: '학교를 찾을 수 없습니다.' };
        }

        return { status: 200, data: university };
    } catch (error) {
        throw error;
    }
};

/**
 * 학교 데이터 삭제 서비스
 * @param {Object} deleteParams - 삭제할 학교 데이터 조건 (예: { univIdx: [1, 2, 3] } 또는 { univIdx: 5 })
 * @returns {Promise<Object>} - 삭제 결과 반환
 */
exports.deleteUniv = async (deleteParams) => {
    // deleteParams 유효성 검사
    if (!deleteParams || (!Array.isArray(deleteParams.univIdx) && typeof deleteParams.univIdx !== 'number')) {
        throw new Error("삭제할 학교의 univIdx가 입력되지 않았음.");
    }

    // univIdx가 단일 값일 경우 배열로 변환
    const univIdxArray = Array.isArray(deleteParams.univIdx)
        ? deleteParams.univIdx
        : [deleteParams.univIdx];

    if (univIdxArray.length === 0) {
        throw new Error("삭제할 학교의 univIdx 배열이 비어 있음.");
    }

    // 삭제 수행
    const deletedCount = await University.destroy({
        where: { univIdx: { [Op.in]: univIdxArray } }
    });

    // 존재하지 않는 값일 경우 처리
    if (deletedCount === 0) {
        return {
            success: false,
            message: "삭제할 학교 데이터를 찾을 수 없습니다.",
            deletedCount
        };
    }

    // 정상 삭제 결과 반환
    return {
        success: true,
        message: "학교 데이터 삭제완료.",
        deletedCount
    };
};

/**
 * 학교 데이터 수정 서비스
 * @param {Object} updateParams - 수정할 학교 데이터 (예: { univIdx: 1, univName: "변경된 학교명", ... })
 * @returns {Promise<Object>} - 수정 결과 반환
 */
exports.putUnivData = async (updateParams) => {
    // updateParams 객체에서 univIdx 확인
    const { univIdx } = updateParams;

    // univIdx 값이 없으면 에러 처리
    if (!univIdx) {
        throw new Error("수정할 학교의 univIdx가 입력되지 않았음.");
    }

    // 존재 여부 확인
    const existingUniv = await University.findOne({ where: { univIdx } });
    if (!existingUniv) {
        throw new Error(`univIdx ${univIdx}에 해당하는 학교 데이터를 찾을 수 없습니다.`);
    }

    // 데이터 업데이트
    const [affectedCount] = await University.update(updateParams, {
        where: { univIdx }
    });

    // 업데이트 성공 여부 확인
    if (affectedCount === 0) {
        return {
            success: false,
            message: "업데이트할 데이터가 없습니다.",
            affectedCount
        };
    }

    return {
        success: true,
        message: "학교 데이터 수정완료.",
        affectedCount
    };
};

/**
 * 대학교 요청 생성 서비스
 * @param {Object} requestData - 요청 데이터 (univName, univPresident, univYears, univAddr)
 * @returns {Promise<Object>} - 생성 결과
 */
exports.createUnivRequest = async (requestData) => {
    try {
        const { univName, univPresident, univYears, univAddr } = requestData;

        // 필수값 체크 (대학교 이름만 필수)
        if (!univName || univName.trim() === '') {
            throw new Error('대학교 이름은 필수입니다.');
        }

        // 대학교 이름 중복 체크 (이미 요청된 대학교인지)
        const existingRequest = await require('../../model/index').UnivRequest.findOne({
            where: { univName: univName.trim() }
        });

        if (existingRequest) {
            return {
                success: false,
                message: '이미 요청된 대학교입니다.',
                existingRequest
            };
        }

        // 요청 데이터 생성
        const newRequest = await require('../../model/index').UnivRequest.create({
            univName: univName.trim(),
            univPresident: univPresident ? univPresident.trim() : null,
            univYears: univYears ? univYears.trim() : null,
            univAddr: univAddr ? univAddr.trim() : null,
            requestStatus: 'pending',
            requestDate: new Date()
        });

        logger.info(`[createUnivRequest] 대학교 요청 생성 완료: ${newRequest.requestIdx} - ${newRequest.univName}`);
        
        return {
            success: true,
            message: '대학교 요청이 성공적으로 등록되었습니다.',
            data: newRequest
        };
    } catch (error) {
        logger.error(`[createUnivRequest] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 대학교 요청 목록 조회 서비스 (관리자용)
 * @param {Object} searchParams - 검색 조건 (status, page, rowsPerPage)
 * @returns {Promise<Object>} - 요청 목록과 페이징 정보
 */
exports.getUnivRequests = async (searchParams = {}) => {
    try {
        const { status, page = 1, rowsPerPage = 10 } = searchParams;
        const offset = (page - 1) * rowsPerPage;

        // 검색 조건 구성
        const whereClause = {};
        if (status && ['pending', 'completed', 'rejected'].includes(status)) {
            whereClause.requestStatus = status;
        }

        // 요청 목록 조회
        const { count, rows } = await require('../../model/index').UnivRequest.findAndCountAll({
            where: whereClause,
            order: [['requestDate', 'DESC']], // 최신 요청순
            limit: rowsPerPage,
            offset
        });

        logger.info(`[getUnivRequests] 대학교 요청 목록 조회 완료: ${rows.length}개 / 총 ${count}개`);
        
        return {
            status: 200,
            data: rows,
            totalCount: count,
            currentPage: page,
            rowsPerPage,
            totalPages: Math.ceil(count / rowsPerPage)
        };
    } catch (error) {
        logger.error(`[getUnivRequests] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 대학교 요청 상태 업데이트 서비스 (관리자용)
 * @param {number} requestIdx - 요청 인덱스
 * @param {string} status - 새로운 상태 ('pending' 또는 'completed')
 * @param {string} adminNote - 관리자 메모
 * @returns {Promise<Object>} - 업데이트 결과
 */
exports.updateUnivRequestStatus = async (requestIdx, status, adminNote = null) => {
    try {
        // 요청 존재 여부 확인
        const request = await require('../../model/index').UnivRequest.findOne({
            where: { requestIdx }
        });

        if (!request) {
            throw new Error('존재하지 않는 요청입니다.');
        }

        // 상태와 관리자 메모 업데이트
        const updateData = {
            requestStatus: status,
            adminNote: adminNote || null // adminNote가 없으면 null로 설정
        };

        // 처리 완료인 경우 처리 날짜 추가
        if (status === 'completed') {
            updateData.processedDate = new Date();
        }

        const [affectedCount] = await require('../../model/index').UnivRequest.update(updateData, {
            where: { requestIdx }
        });

        if (affectedCount === 0) {
            throw new Error('요청 상태 업데이트에 실패했습니다.');
        }

        logger.info(`[updateUnivRequestStatus] 대학교 요청 상태 업데이트 완료: ${requestIdx} -> ${status}`);
        
        return {
            success: true,
            message: '요청 상태가 성공적으로 업데이트되었습니다.',
            requestIdx,
            newStatus: status
        };
    } catch (error) {
        logger.error(`[updateUnivRequestStatus] Error: ${error.message}`);
        throw error;
    }
};