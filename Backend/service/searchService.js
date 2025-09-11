const { University } = require('..//model/index');
const { Op, Sequelize  } = require('sequelize');
const logger = require('../utils/logger');

exports.autoComplete = async (keyword) => {
    return await University.findAll({
        attributes: ['univName', 'univLocate'],
        where: {
            univName: {
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
                univName: {
                    [Op.like]: `%${univName}%`,
                },
            },
            transaction
        });

        if (!university) {
            await transaction.rollback(); // 롤백
            return null; // 학교 정보가 없으면 null 반환
        }

        // univViewCount 증가
        await University.update(
            { univViewCount: Sequelize.literal("univViewCount + 1") },
            { where: { univIdx: university.univIdx }, transaction } // Primary Key 기준 업데이트
        );

        await transaction.commit(); // 트랜잭션 커밋

        logger.info(`[getSchoolInfo] 대학교 검색 완료: ${univName}`);

        return university;
    } catch (error) {
        logger.error(`[searchService.getSchoolInfo] Error: ${error.message}`);
        await transaction.rollback(); // 에러 발생 시 트랜잭션 롤백
        throw error;
    }
};

// univViewCount 높은 순으로 상위 10개 대학교 조회
exports.getTopViewedUniversities = async () => {
    try {
        const topUniversities = await University.findAll({
            attributes: [
                'univIdx',
                'univName', 
                'univLocate', 
                'univType', 
                'univCampos',
                'univViewCount'
            ],
            where: {
                univStatus: 1 // 활성화된 대학교만
            },
            order: [['univViewCount', 'DESC']], // 조회수 높은 순 정렬
            limit: 10 // 상위 10개만
        });

        logger.info(`[getTopViewedUniversities] 상위 10개 대학교 조회 완료: ${topUniversities.length}개`);
        
        return {
            status: 200,
            data: topUniversities,
            totalCount: topUniversities.length
        };
    } catch (error) {
        logger.error(`[searchService.getTopViewedUniversities] Error: ${error.message}`);
        throw error;
    }
};

