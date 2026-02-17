const { sequelize } = require('../../model');
const hashPassword = require('../../utils/hashPassword');
const logger = require('../../utils/logger');

/**
 * 게시글 목록 (페이지네이션)
 */
exports.listBoards = async (tables, query) => {
    try {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;
        const entityIdx = query.entityIdx || query.entity_idx;

        let whereSql = 'WHERE `is_deleted` = 0';
        const params = [];

        if (entityIdx) {
            whereSql += ' AND `entity_idx` = ?';
            params.push(entityIdx);
        }
        if (query.category) {
            whereSql += ' AND `board_category` = ?';
            params.push(query.category);
        }

        const countSql = `SELECT COUNT(*) AS total FROM ${tables.boards} ${whereSql}`;
        const [countResult] = await sequelize.query(countSql, { replacements: params, type: sequelize.QueryTypes.SELECT });

        const dataSql = `SELECT * FROM ${tables.boards} ${whereSql} ORDER BY \`board_reg_date\` DESC, \`board_idx\` DESC LIMIT ? OFFSET ?`;
        const rows = await sequelize.query(dataSql, {
            replacements: [...params, limit, offset],
            type: sequelize.QueryTypes.SELECT
        });

        const total = countResult.total;
        return {
            status: 200,
            totalCount: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            posts: rows
        };
    } catch (error) {
        logger.error(`[dynamicBoard.list] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 게시글 상세 (조회수 증가)
 */
exports.getBoardDetail = async (tables, boardId) => {
    try {
        const rows = await sequelize.query(
            `SELECT * FROM ${tables.boards} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0`,
            { replacements: [boardId], type: sequelize.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return { status: 404, message: '게시글을 찾을 수 없습니다.' };
        }

        await sequelize.query(
            `UPDATE ${tables.boards} SET \`board_hits\` = \`board_hits\` + 1 WHERE \`board_idx\` = ?`,
            { replacements: [boardId] }
        );

        // 댓글 조회
        const comments = await sequelize.query(
            `SELECT * FROM ${tables.comments} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0 ORDER BY \`reg_date\` ASC`,
            { replacements: [boardId], type: sequelize.QueryTypes.SELECT }
        );

        return { status: 200, data: { ...rows[0], comments } };
    } catch (error) {
        logger.error(`[dynamicBoard.detail] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 최근 게시글
 */
exports.getRecentBoards = async (tables, query) => {
    try {
        const limit = parseInt(query.limit) || 5;
        const rows = await sequelize.query(
            `SELECT * FROM ${tables.boards} WHERE \`is_deleted\` = 0 ORDER BY \`board_reg_date\` DESC LIMIT ?`,
            { replacements: [limit], type: sequelize.QueryTypes.SELECT }
        );

        return { status: 200, data: rows };
    } catch (error) {
        logger.error(`[dynamicBoard.recent] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 인기 게시글 (조회수 기준)
 */
exports.getTopViewedBoards = async (tables, query) => {
    try {
        const limit = parseInt(query.limit) || 10;
        const rows = await sequelize.query(
            `SELECT * FROM ${tables.boards} WHERE \`is_deleted\` = 0 ORDER BY \`board_hits\` DESC LIMIT ?`,
            { replacements: [limit], type: sequelize.QueryTypes.SELECT }
        );

        return { status: 200, data: rows };
    } catch (error) {
        logger.error(`[dynamicBoard.topViewed] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 게시글 작성
 */
exports.insertBoard = async (tables, data) => {
    try {
        const { boardTitle, boardContent, entityIdx, boardID, boardPW, boardCategory, boardRating } = data;

        if (!boardTitle || !boardID || !boardPW) {
            return { status: 400, message: '필수값 누락: boardTitle, boardID, boardPW' };
        }

        const hashedPW = hashPassword(boardPW);
        const regDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const sql = `INSERT INTO ${tables.boards} (\`board_title\`, \`board_content\`, \`entity_idx\`, \`board_reg_date\`, \`board_like\`, \`board_hits\`, \`board_id\`, \`board_pw\`, \`board_category\`, \`board_rating\`, \`is_deleted\`) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 0)`;
        const params = [boardTitle, boardContent || null, entityIdx || null, regDate, boardID, hashedPW, boardCategory || null, boardRating || null];

        const [result] = await sequelize.query(sql, { replacements: params });
        logger.info(`[dynamicBoard.insert] board_idx=${result}`);
        return { status: 201, data: { boardIdx: result } };
    } catch (error) {
        logger.error(`[dynamicBoard.insert] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 좋아요 토글
 */
exports.toggleBoardLike = async (tables, boardId) => {
    try {
        const rows = await sequelize.query(
            `SELECT \`board_idx\`, \`board_like\` FROM ${tables.boards} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0`,
            { replacements: [boardId], type: sequelize.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return { status: 404, message: '게시글을 찾을 수 없습니다.' };
        }

        await sequelize.query(
            `UPDATE ${tables.boards} SET \`board_like\` = \`board_like\` + 1 WHERE \`board_idx\` = ?`,
            { replacements: [boardId] }
        );

        return { status: 200, data: { boardLike: rows[0].board_like + 1 } };
    } catch (error) {
        logger.error(`[dynamicBoard.like] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 게시글 삭제 (어드민, soft delete)
 */
exports.deleteBoard = async (tables, boardId) => {
    try {
        const rows = await sequelize.query(
            `SELECT \`board_idx\` FROM ${tables.boards} WHERE \`board_idx\` = ?`,
            { replacements: [boardId], type: sequelize.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return { status: 404, message: '게시글을 찾을 수 없습니다.' };
        }

        await sequelize.query(
            `UPDATE ${tables.boards} SET \`is_deleted\` = 1 WHERE \`board_idx\` = ?`,
            { replacements: [boardId] }
        );

        logger.info(`[dynamicBoard.delete] board_idx=${boardId}`);
        return { status: 200, message: '게시글이 삭제되었습니다.' };
    } catch (error) {
        logger.error(`[dynamicBoard.delete] Error: ${error.message}`);
        throw error;
    }
};
