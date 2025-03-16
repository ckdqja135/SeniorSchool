const { University } = require('../../model/index');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

exports.createUniv = async (univData) => {
    try {
        const { univName, univLocate, univLateX, univLateY } = univData;

        // 필수값 체크
        if (!univName || !univLocate || !univLateX || !univLateY) {
            logger.warn(`[createUniv] Missing required fields: ${JSON.stringify(univData)}`);
            throw new Error('필수값이 누락되었습니다. (univName, univLocate, univLateX, univLateY)');
        }

        // DB에 데이터 생성
        const created = await University.create(univData);
        logger.info(`[createUniv] 대학교 등록 완료! : ${created._id}`);

        return created;
    } catch (error) {
        // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
        logger.error(`[createUniv] Error: ${error.message}`);
        throw error;
    }
};

// univIdx: UnivNo(대학의 기본키), status: 0 또는 1
exports.patchUnivStatus = async (univIdx, status) => {
    try {
        const [affectedCount] = await University.update(
            { UnivStatus: status },
            {
                where: {
                    UnivNo: univIdx,
                },
            }
        );

        if (affectedCount === 0) {
            logger.warn(`[puteUnivStatus] 업데이트 실패`);
            return {
                status: 404,
                message: `값을 다시 확인해주세요.`,
            };
        }

        logger.info(`[puteUnivStatus] UnivNo : ${univIdx} 상태를 ${status} 로 업데이트 성공`);

        return {
            status: 200,
            message: `UnivNo: ${univIdx}, 상태 변경 완료`,
        };
    } catch (error) {
        logger.error(`[puteUnivStatus] Error: ${error.message}`);
        throw error; // 컨트롤러로 에러 전달
    }
};

/**
 * 대학교 검색 서비스
 * req.body를 그대로 받아서 univIdx와 univName에 대해 LIKE 검색을 수행
 * @param {Object} searchParams - 프론트엔드에서 전달된 검색 파라미터 (예: { keyword: "서울" })
 * @returns {Promise<Model[]>} - 검색 결과 반환
 */
exports.searchUniv = async (searchParams) => {
    const whereClause = {};

    if (searchParams.keyword) {
        const keyword = searchParams.keyword;

        // 숫자인 경우 univIdx 검색
        if (!isNaN(keyword)) {
            whereClause.univIdx = parseInt(keyword);  // 정확한 일치 검색
        }
        // 문자열인 경우 univName에 LIKE 검색
        else {
            whereClause[Op.or] = [
                { univName: { [Op.like]: `%${keyword}%` } }
            ];
        }
    }
    logger.info("whereClause ", whereClause);

    return await University.findAll({ where: whereClause });
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
exports.patchUnivData = async (updateParams) => {
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