const { university } = require('../../model/index');

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
        const created = await university.create(univData);
        logger.info(`[createUniv] 대학교 등록 완료! : ${created._id}`);

        return created;
    } catch (error) {
        // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
        logger.error(`[createUniv] Error: ${error.message}`);
        throw error;
    }
};

exports.puteUnivStatus = async (univId, status) => {
    // 상태 변경 로직
    return await university.update(univId, { status }, { new: true });
};