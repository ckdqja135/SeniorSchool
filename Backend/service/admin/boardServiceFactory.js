const logger = require('../../utils/logger');

/**
 * 어드민 게시판(후기) CRUD 서비스 팩토리
 * @param {Object} config
 * @param {Object} config.Model - Sequelize 모델
 * @param {string} config.modelName - 로그용 모델명 (e.g. 'univboard')
 * @param {string} config.entityIdxField - FK 필드명 (e.g. 'univIdx')
 * @param {string[]} config.requiredFields - 생성 시 필수 필드
 * @param {string[]} config.creatableFields - 생성 시 허용 필드
 * @param {string[]} config.updatableFields - 수정 시 허용 필드
 * @param {boolean} config.hasIsDeleted - isDeleted 컬럼 존재 여부
 */
module.exports = function createBoardService(config) {
    const {
        Model, modelName, entityIdxField,
        requiredFields, creatableFields, updatableFields,
        hasIsDeleted
    } = config;

    const tag = `admin.${modelName}`;

    const pickFields = (source, fields) => {
        const result = {};
        for (const key of fields) {
            if (source[key] !== undefined) result[key] = source[key];
        }
        return result;
    };

    const buildCreateData = (item) => {
        const data = pickFields(item, creatableFields);
        if (data.boardRegDate === undefined) {
            data.boardRegDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        if (data.boardLike === undefined) data.boardLike = 0;
        if (data.boardHits === undefined) data.boardHits = 0;
        if (hasIsDeleted && data.isDeleted === undefined) data.isDeleted = false;
        return data;
    };

    return {
        listPosts: async (query) => {
            try {
                const page = parseInt(query.page ?? 1);
                const limit = parseInt(query.limit ?? 10);
                const where = {};

                if (hasIsDeleted) {
                    const includeDeleted = query.includeDeleted === '1' || query.includeDeleted === 1;
                    if (!includeDeleted) where.isDeleted = false;
                }

                const offset = (page - 1) * limit;
                const result = await Model.findAndCountAll({
                    where,
                    order: [['boardRegDate', 'DESC'], ['boardIdx', 'DESC']],
                    limit,
                    offset
                });

                return {
                    status: 200,
                    totalCount: result.count,
                    totalPages: Math.ceil(result.count / limit),
                    currentPage: page,
                    posts: result.rows
                };
            } catch (error) {
                logger.error(`[${tag}.list] Error: ${error.message}`);
                throw error;
            }
        },

        createPost: async (postData) => {
            try {
                if (Array.isArray(postData)) {
                    const results = [];
                    for (const item of postData) {
                        for (const key of requiredFields) {
                            if (!item[key] || (typeof item[key] === 'string' && item[key].trim() === '')) {
                                return { status: 400, message: `필수값 누락: ${key}` };
                            }
                        }
                        const created = await Model.create(buildCreateData(item));
                        results.push(created);
                    }
                    logger.info(`[${tag}.create] bulk count=${results.length}`);
                    return { status: 201, data: results };
                }

                for (const key of requiredFields) {
                    if (!postData[key] || (typeof postData[key] === 'string' && postData[key].trim() === '')) {
                        return { status: 400, message: `필수값 누락: ${key}` };
                    }
                }

                const created = await Model.create(buildCreateData(postData));
                logger.info(`[${tag}.create] boardIdx=${created.boardIdx}`);
                return { status: 201, data: created };
            } catch (error) {
                logger.error(`[${tag}.create] Error: ${error.message}`);
                throw error;
            }
        },

        updatePost: async (boardIdx, updateData) => {
            try {
                const post = await Model.findByPk(boardIdx);
                if (!post || (hasIsDeleted && post.isDeleted)) {
                    return { status: 404, message: '게시글을 찾을 수 없습니다.' };
                }

                const payload = pickFields(updateData, updatableFields);
                await Model.update(payload, { where: { boardIdx } });
                logger.info(`[${tag}.update] boardIdx=${boardIdx}`);
                return { status: 200, message: '게시글이 수정되었습니다.' };
            } catch (error) {
                logger.error(`[${tag}.update] Error: ${error.message}`);
                throw error;
            }
        },

        deletePost: async (boardIdx) => {
            try {
                const post = await Model.findByPk(boardIdx);
                if (!post || (hasIsDeleted && post.isDeleted)) {
                    return { status: 404, message: '게시글을 찾을 수 없습니다.' };
                }

                if (hasIsDeleted) {
                    await Model.update({ isDeleted: true }, { where: { boardIdx } });
                } else {
                    await Model.destroy({ where: { boardIdx } });
                }

                logger.info(`[${tag}.delete] boardIdx=${boardIdx}`);
                return { status: 200, message: '게시글이 삭제되었습니다.' };
            } catch (error) {
                logger.error(`[${tag}.delete] Error: ${error.message}`);
                throw error;
            }
        }
    };
};
