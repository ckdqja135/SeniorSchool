const { UnivComment, sequelize } = require('../model/index');
const logger = require('../utils/logger');

/**
 * 댓글 조회
 * @param boardNo
 * @returns {Promise<Model[]>}
 */
exports.getComments = async (boardNo) => {
    return await UnivComment.findAll({
        where: {
            BoardNo: boardNo
        }
    });
};

/**
 * 댓글 작성
 */
exports.insertComment = async (commentData) => {
    // logger.info(`[insertComment] Start - commentData: ${JSON.stringify(commentData)}`);

    const transaction = await sequelize.transaction();
    try {
        // 댓글 생성
        const comment = await UnivComment.create({
            BoardNo: commentData.boardNo,
            CommentDepth: commentData.depth,
            WriterId: commentData.commentWriter,
            WriterPw: commentData.commentPw,
            CommnetPerent: commentData.parentId,
            CommentContent: commentData.commentContent,
            CommentLike: commentData.commentLike,
        }, { transaction });

        logger.debug(`[insertComment] UnivComment created. CommentId: ${comment.CommentId}`);

        await transaction.commit();
        logger.info(`[insertComment] Transaction committed. Comment inserted successfully. CommentId: ${comment.CommentId}`);
        return 'Comment inserted successfully';
    } catch (error) {
        logger.error(`[insertComment] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

/**
 * 댓글 수정
 */
exports.modifyComment = async ({ replyPw, commentNo, commentContent }) => {
    // logger.info(`[modifyComment] Start - commentNo: ${commentNo}, replyPw: ${replyPw}, commentContent: ${commentContent}`);

    try {
        // 댓글 내용 업데이트 (단일 쿼리이므로 트랜잭션 optional)
        const [updateCount] = await UnivComment.update(
            { CommentContent: commentContent },
            {
                where: {
                    CommentId: commentNo,
                    WriterPw: replyPw,
                },
            }
        );

        if (updateCount > 0) {
            logger.info(`[modifyComment] Comment updated successfully. CommentId: ${commentNo}`);
            return true;
        } else {
            logger.warn(`[modifyComment] No matching comment found. CommentId: ${commentNo}`);
            return false;
        }
    } catch (error) {
        logger.error(`[modifyComment] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 댓글 삭제(내용만 변경)
 */
exports.deleteComment = async ({ commentPw, commentNo }) => {
    // logger.info(`[deleteComment] Start - commentNo: ${commentNo}, commentPw: ${commentPw}`);

    try {
        // 댓글 내용 "작성자가 삭제한 글입니다."로 수정
        const [updateCount] = await UnivComment.update(
            { CommentContent: '작성자가 삭제한 글입니다.' },
            {
                where: {
                    CommentId: commentNo,
                    WriterPw: commentPw,
                },
            }
        );

        if (updateCount > 0) {
            logger.info(`[deleteComment] Comment 'deleted' successfully. CommentId: ${commentNo}`);
            return true;
        } else {
            logger.warn(`[deleteComment] No matching comment found. CommentId: ${commentNo}`);
            return false;
        }
    } catch (error) {
        logger.error(`[deleteComment] Error: ${error.message}`);
        throw error;
    }
};