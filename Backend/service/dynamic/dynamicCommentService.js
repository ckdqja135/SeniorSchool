const { sequelize } = require('../../model');
const hashPassword = require('../../utils/hashPassword');
const logger = require('../../utils/logger');

/**
 * 댓글 목록
 */
exports.listComments = async (tables, boardId) => {
    try {
        const rows = await sequelize.query(
            `SELECT * FROM ${tables.comments} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0 ORDER BY \`reg_date\` ASC`,
            { replacements: [boardId], type: sequelize.QueryTypes.SELECT }
        );

        return { status: 200, data: rows };
    } catch (error) {
        logger.error(`[dynamicComment.list] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 댓글 작성
 */
exports.createComment = async (tables, data) => {
    try {
        const { boardIdx, writerId, writerPw, commentContent, commentParent, commentDepth } = data;

        if (!boardIdx || !writerId || !writerPw || !commentContent) {
            return { status: 400, message: '필수값 누락: boardIdx, writerId, writerPw, commentContent' };
        }

        // 게시글 존재 확인
        const board = await sequelize.query(
            `SELECT \`board_idx\` FROM ${tables.boards} WHERE \`board_idx\` = ? AND \`is_deleted\` = 0`,
            { replacements: [boardIdx], type: sequelize.QueryTypes.SELECT }
        );
        if (board.length === 0) {
            return { status: 404, message: '게시글을 찾을 수 없습니다.' };
        }

        const hashedPW = hashPassword(writerPw);

        const sql = `INSERT INTO ${tables.comments} (\`board_idx\`, \`comment_like\`, \`comment_depth\`, \`writer_id\`, \`writer_pw\`, \`comment_parent\`, \`comment_content\`, \`is_deleted\`) VALUES (?, 0, ?, ?, ?, ?, ?, 0)`;
        const params = [boardIdx, commentDepth || 0, writerId, hashedPW, commentParent || null, commentContent];

        const [result] = await sequelize.query(sql, { replacements: params });
        logger.info(`[dynamicComment.create] comment_idx=${result}`);
        return { status: 201, data: { commentIdx: result } };
    } catch (error) {
        logger.error(`[dynamicComment.create] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 댓글 삭제 (비밀번호 확인)
 */
exports.deleteComment = async (tables, commentId, password) => {
    try {
        const rows = await sequelize.query(
            `SELECT \`comment_idx\`, \`writer_pw\` FROM ${tables.comments} WHERE \`comment_idx\` = ? AND \`is_deleted\` = 0`,
            { replacements: [commentId], type: sequelize.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return { status: 404, message: '댓글을 찾을 수 없습니다.' };
        }

        if (password) {
            const hashedPW = hashPassword(password);
            if (rows[0].writer_pw !== hashedPW) {
                return { status: 403, message: '비밀번호가 일치하지 않습니다.' };
            }
        }

        await sequelize.query(
            `UPDATE ${tables.comments} SET \`is_deleted\` = 1 WHERE \`comment_idx\` = ?`,
            { replacements: [commentId] }
        );

        logger.info(`[dynamicComment.delete] comment_idx=${commentId}`);
        return { status: 200, message: '댓글이 삭제되었습니다.' };
    } catch (error) {
        logger.error(`[dynamicComment.delete] Error: ${error.message}`);
        throw error;
    }
};
