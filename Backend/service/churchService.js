const { ChurchInfo, sequelize } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// 교회 목록 조회
exports.getChurches = async (searchParams = {}) => {
    try {
        let whereClause = { churchStatus: 1 }; // 활성화된 교회만
        
        const { name, type, location } = searchParams;
        
        if (name && name.trim() !== '') {
            whereClause.churchName = {
                [Op.like]: `%${name.trim()}%`
            };
            logger.info(`[getChurches] Name search applied: "${name.trim()}"`);
        }
        
        if (type && type.trim() !== '') {
            whereClause.churchType = type.trim();
            logger.info(`[getChurches] Type search applied: "${type.trim()}"`);
        }
        
        if (location && location.trim() !== '') {
            whereClause.churchLocation = {
                [Op.like]: `%${location.trim()}%`
            };
            logger.info(`[getChurches] Location search applied: "${location.trim()}"`);
        }
        
        const churches = await ChurchInfo.findAll({ 
            where: whereClause,
            order: [['churchName', 'ASC']] // 교회명 순 정렬
        });
        
        logger.info(`[getChurches] Found ${churches.length} churches`);
        return churches;
    } catch (error) {
        logger.error(`[getChurches] Error: ${error.message}`);
        throw error;
    }
};

// 교회 상세 조회
exports.getChurchDetail = async (churchIdx) => {
    try {
        const church = await ChurchInfo.findOne({
            where: { 
                churchIdx: churchIdx,
                churchStatus: 1 
            }
        });

        if (!church) {
            throw new Error('Church not found');
        }

        // 조회수 증가
        await ChurchInfo.update(
            { churchViewCount: sequelize.literal('churchViewCount + 1') },
            { where: { churchIdx: churchIdx } }
        );

        logger.info(`[getChurchDetail] Church detail retrieved. ChurchIdx: ${churchIdx}`);
        return church;
    } catch (error) {
        logger.error(`[getChurchDetail] Error: ${error.message}`);
        throw error;
    }
};

// 교회 등록
exports.createChurch = async (churchData) => {
    const transaction = await sequelize.transaction({ autocommit: false });

    try {
        // 필수 필드 검증
        const requiredFields = ['churchName', 'churchLocation', 'churchType', 'churchPastor'];
        for (const field of requiredFields) {
            if (!churchData[field] || churchData[field].trim() === '') {
                throw new Error(`${field} is required`);
            }
        }

        // 교회 생성
        const church = await ChurchInfo.create({
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
        }, { transaction });

        await transaction.commit();
        logger.info(`[createChurch] Church created successfully. ChurchIdx: ${church.churchIdx}`);
        return church;
    } catch (error) {
        logger.error(`[createChurch] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 수정
exports.updateChurch = async (churchIdx, churchData) => {
    const transaction = await sequelize.transaction();
    
    try {
        // 교회 존재 여부 확인
        const existingChurch = await ChurchInfo.findOne({
            where: { churchIdx: churchIdx },
            transaction
        });
        
        if (!existingChurch) {
            throw new Error('Church not found');
        }
        
        // 교회 정보 업데이트
        const [affectedCount] = await ChurchInfo.update(
            {
                churchName: churchData.churchName || existingChurch.churchName,
                churchLocation: churchData.churchLocation || existingChurch.churchLocation,
                churchType: churchData.churchType || existingChurch.churchType,
                churchEstablished: churchData.churchEstablished || existingChurch.churchEstablished,
                churchPastor: churchData.churchPastor || existingChurch.churchPastor,
                churchLatX: churchData.churchLatX !== undefined ? churchData.churchLatX : existingChurch.churchLatX,
                churchLatY: churchData.churchLatY !== undefined ? churchData.churchLatY : existingChurch.churchLatY,
                churchURL: churchData.churchURL || existingChurch.churchURL,
                churchLotAddr: churchData.churchLotAddr || existingChurch.churchLotAddr,
                churchAddr: churchData.churchAddr || existingChurch.churchAddr,
                churchMapIMG: churchData.churchMapIMG !== undefined ? churchData.churchMapIMG : existingChurch.churchMapIMG,
                churchStatus: churchData.churchStatus !== undefined ? churchData.churchStatus : existingChurch.churchStatus
            },
            {
                where: { churchIdx: churchIdx },
                transaction
            }
        );

        if (affectedCount === 0) {
            throw new Error('No church was updated');
        }

        await transaction.commit();
        logger.info(`[updateChurch] Church updated successfully. ChurchIdx: ${churchIdx}`);
        
        // 업데이트된 교회 정보 반환
        return await ChurchInfo.findByPk(churchIdx);
    } catch (error) {
        logger.error(`[updateChurch] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 삭제 (소프트 삭제)
exports.deleteChurch = async (churchIdx) => {
    const transaction = await sequelize.transaction();
    
    try {
        // 교회 존재 여부 확인
        const existingChurch = await ChurchInfo.findOne({
            where: { churchIdx: churchIdx },
            transaction
        });
        
        if (!existingChurch) {
            throw new Error('Church not found');
        }
        
        // 교회 상태를 비활성화로 변경 (소프트 삭제)
        const [affectedCount] = await ChurchInfo.update(
            { churchStatus: 0 },
            {
                where: { churchIdx: churchIdx },
                transaction
            }
        );

        if (affectedCount === 0) {
            throw new Error('No church was deleted');
        }

        await transaction.commit();
        logger.info(`[deleteChurch] Church deleted successfully. ChurchIdx: ${churchIdx}`);
        return true;
    } catch (error) {
        logger.error(`[deleteChurch] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 자동 검색
exports.autoComplete = async (keyword) => {
    try {
        const churches = await ChurchInfo.findAll({
            attributes: ['churchName', 'churchLocation', 'churchType'],
            where: {
                churchName: {
                    [Op.not]: '',
                    [Op.like]: `%${keyword}%`,
                },
                churchStatus: 1 // 활성화된 교회만
            },
            order: [['churchName', 'ASC']],
            limit: 10 // 최대 10개까지만
        });
        
        logger.info(`[autoComplete] Found ${churches.length} churches for keyword: "${keyword}"`);
        return churches;
    } catch (error) {
        logger.error(`[autoComplete] Error: ${error.message}`);
        throw error;
    }
};

// 교회명으로 교회 정보 조회 (조회수 증가 포함)
exports.getChurchInfoByName = async (churchName) => {
    const transaction = await sequelize.transaction();

    try {
        const church = await ChurchInfo.findOne({
            where: {
                churchName: {
                    [Op.eq]: churchName,
                },
                churchStatus: 1
            },
            transaction
        });

        if (!church) {
            await transaction.rollback();
            return null;
        }

        // churchViewCount 증가
        await ChurchInfo.update(
            { churchViewCount: sequelize.literal("churchViewCount + 1") },
            { where: { churchIdx: church.churchIdx }, transaction }
        );

        await transaction.commit();

        logger.info(`[getChurchInfoByName] 교회 검색 완료: ${churchName}`);
        return church;
    } catch (error) {
        logger.error(`[getChurchInfoByName] Error: ${error.message}`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 조회수 높은 순으로 상위 10개 교회 조회
exports.getTopViewedChurches = async () => {
    try {
        const topChurches = await ChurchInfo.findAll({
            attributes: [
                'churchIdx',
                'churchName', 
                'churchLocation', 
                'churchType',
                'churchPastor',
                'churchViewCount'
            ],
            where: {
                churchStatus: 1 // 활성화된 교회만
            },
            order: [['churchViewCount', 'DESC']], // 조회수 높은 순 정렬
            limit: 10 // 상위 10개만
        });

        logger.info(`[getTopViewedChurches] 상위 10개 교회 조회 완료: ${topChurches.length}개`);
        
        return {
            status: 200,
            data: topChurches,
            totalCount: topChurches.length
        };
    } catch (error) {
        logger.error(`[getTopViewedChurches] Error: ${error.message}`);
        throw error;
    }
};
