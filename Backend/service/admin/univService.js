const { University } = require('../../model/index');

const logger = require('../../utils/logger');

exports.createUniv = async (univData) => {
    try {
        const { UnivName, UnivLocate, UnivLateX, UnivLateY } = univData;

        // 필수값 체크
        if (!UnivName || !UnivLocate || !UnivLateX || !UnivLateY) {
            logger.warn(`[createUniv] Missing required fields: ${JSON.stringify(univData)}`);
            throw new Error('필수값이 누락되었습니다. (UnivName, UnivLocate, UnivLateX, UnivLateY)');
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
exports.puteUnivStatus = async (univIdx, status) => {
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
