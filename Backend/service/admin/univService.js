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