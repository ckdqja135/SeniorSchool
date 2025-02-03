const { University } = require('..//model/index');
const { Op, Sequelize  } = require('sequelize');
const logger = require('../utils/logger');

exports.autoComplete = async (keyword) => {
    return await University.findAll({
        attributes: ['UnivName', 'UnivLocate'],
        where: {
            UnivName: {
                [Op.not]: '',
                [Op.like]: `%${keyword}%`,
            },
        },
    });
};

exports.getSchoolInfo = async (univName) => {
    const transaction = await University.sequelize.transaction();

    try {
        const university = await University.findOne({
            where: {
                UnivName: {
                    [Op.eq]: univName,
                },
            },
            transaction
        });

        if (!university) {
            await transaction.rollback(); // 롤백
            return null; // 학교 정보가 없으면 null 반환
        }

        // UnivViewCount 증가
        await University.update(
            { UnivViewCount: Sequelize.literal("UnivViewCount + 1") },
            { where: { UnivNo: university.UnivNo }, transaction } // Primary Key 기준 업데이트
        );

        await transaction.commit(); // ✅ 트랜잭션 커밋

        logger.info(`[getSchoolInfo] 대학교 검색 완료: ${univName}`);

        return university;
    } catch (error) {
        logger.error(`[searchService.getSchoolInfo] Error: ${error.message}`);
        throw error;
    }
};
