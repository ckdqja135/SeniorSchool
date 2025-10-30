const { FreeBoard } = require('../../model/index');
const logger = require('../../utils/logger');

exports.listPosts = async (query) => {
    try {
        const page = parseInt(query.page ?? 1);
        const limit = parseInt(query.limit ?? 10);
        const includeDeleted = query.includeDeleted === '1' || query.includeDeleted === 1;

        const where = {};
        if (!includeDeleted) where.isDeleted = false;

        const offset = (page - 1) * limit;
        const result = await FreeBoard.findAndCountAll({
            where,
            order: [["boardRegDate", "DESC"], ["boardIdx", "DESC"]],
            limit: limit,
            offset: offset
        });

        return {
            status: 200,
            totalCount: result.count,
            totalPages: Math.ceil(result.count / limit),
            currentPage: page,
            posts: result.rows
        };
    } catch (error) {
        logger.error(`[admin.freeboard.list] Error: ${error.message}`);
        throw error;
    }
};

exports.createPost = async (postData) => {
    try {
        const required = ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'category'];

        // 배열 입력 처리 (일괄 생성)
        if (Array.isArray(postData)) {
            const results = [];
            for (const item of postData) {
                for (const key of required) {
                    if (!item[key] || (typeof item[key] === 'string' && item[key].trim() === '')) {
                        return { status: 400, message: `필수값 누락: ${key}` };
                    }
                }

                const created = await FreeBoard.create({
                    boardTitle: item.boardTitle,
                    boardContent: item.boardContent,
                    boardID: item.boardID,
                    boardPW: item.boardPW,
                    category: item.category,
                    tags: item.tags ?? null,
                    boardRegDate: item.boardRegDate ? new Date(item.boardRegDate) : new Date(),
                    boardModDate: item.boardModDate ? new Date(item.boardModDate) : null,
                    boardLike: item.boardLike ?? 0,
                    boardHits: item.boardHits ?? 0,
                    isDeleted: item.isDeleted ?? false
                });
                results.push(created);
            }

            logger.info(`[admin.freeboard.create] bulk count=${results.length}`);
            return { status: 201, data: results };
        }

        // 단건 입력 처리
        for (const key of required) {
            if (!postData[key] || (typeof postData[key] === 'string' && postData[key].trim() === '')) {
                return { status: 400, message: `필수값 누락: ${key}` };
            }
        }

        const created = await FreeBoard.create({
            boardTitle: postData.boardTitle,
            boardContent: postData.boardContent,
            boardID: postData.boardID,
            boardPW: postData.boardPW,
            category: postData.category,
            tags: postData.tags ?? null,
            boardRegDate: postData.boardRegDate ? new Date(postData.boardRegDate) : new Date(),
            boardModDate: postData.boardModDate ? new Date(postData.boardModDate) : null,
            boardLike: postData.boardLike ?? 0,
            boardHits: postData.boardHits ?? 0,
            isDeleted: postData.isDeleted ?? false
        });

        logger.info(`[admin.freeboard.create] boardIdx=${created.boardIdx}`);
        return { status: 201, data: created };
    } catch (error) {
        logger.error(`[admin.freeboard.create] Error: ${error.message}`);
        throw error;
    }
};

exports.updatePost = async (boardIdx, updateData) => {
    try {
        const post = await FreeBoard.findByPk(boardIdx);
        if (!post || post.isDeleted) {
            return { status: 404, message: '게시글을 찾을 수 없습니다.' };
        }

        const allowed = ['boardTitle', 'boardContent', 'category', 'tags'];
        const payload = {};
        for (const key of allowed) {
            if (updateData[key] !== undefined) payload[key] = updateData[key];
        }
        payload.boardModDate = new Date();

        await FreeBoard.update(payload, { where: { boardIdx } });
        logger.info(`[admin.freeboard.update] boardIdx=${boardIdx}`);
        return { status: 200, message: '게시글이 수정되었습니다.' };
    } catch (error) {
        logger.error(`[admin.freeboard.update] Error: ${error.message}`);
        throw error;
    }
};

exports.deletePost = async (boardIdx) => {
    try {
        const post = await FreeBoard.findByPk(boardIdx);
        if (!post || post.isDeleted) {
            return { status: 404, message: '게시글을 찾을 수 없습니다.' };
        }

        await FreeBoard.update({ isDeleted: true, boardModDate: new Date() }, { where: { boardIdx } });
        logger.info(`[admin.freeboard.delete] boardIdx=${boardIdx}`);
        return { status: 200, message: '게시글이 삭제되었습니다.' };
    } catch (error) {
        logger.error(`[admin.freeboard.delete] Error: ${error.message}`);
        throw error;
    }
};


