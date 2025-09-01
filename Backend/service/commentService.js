const { UnivComment, sequelize } = require('../model/index');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * 댓글 조회
 * @param boardIdx
 * @returns {Promise<Model[]>}
 */
exports.getComments = async (boardIdx) => {
    return await UnivComment.findAll({
        where: { boardIdx: boardIdx },
        attributes: [
            'commentIdx',
            'boardIdx',
            'commentLike',
            'commentDepth',
            'writerId',
            'commentPerent',
            'commentContent'
        ]
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
            boardIdx: commentData.boardIdx,
            commentDepth: commentData.depth,
            writerId: commentData.commentWriter,
            writerPw: hashPassword(commentData.commentPw), // SHA256 암호화 적용
            commentPerent: commentData.parentIdx,
            commentContent: commentData.commentContent,
            commentLike: commentData.commentLike,
        }, { transaction });

        logger.debug(`[insertComment] UnivComment created. CommentId: ${comment.commentIdx}`);

        await transaction.commit();
        logger.info(`[insertComment] Transaction committed. Comment inserted successfully. CommentId: ${comment.commentIdx}`);
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
exports.modifyComment = async ({ replyPw, commentIdx, commentContent }) => {
    // logger.info(`[modifyComment] Start - commentNo: ${commentNo}, replyPw: ${replyPw}, commentContent: ${commentContent}`);

    try {
        // 댓글 내용 업데이트 (단일 쿼리이므로 트랜잭션 optional)
        const [updateCount] = await UnivComment.update(
            { commentContent: commentContent },
            {
                where: {
                    commentIdx: commentIdx,
                    writerPw: hashPassword(replyPw), // SHA256 암호화 적용
                },
            }
        );

        if (updateCount > 0) {
            logger.info(`[modifyComment] Comment updated successfully. CommentIdx: ${commentIdx}`);
            return true;
        } else {
            logger.warn(`[modifyComment] No matching comment found. CommentIdx: ${commentIdx}`);
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
exports.deleteComment = async ({ commentPw, commentIdx }) => {
    logger.info(`[deleteComment] Start - commentNo: ${commentIdx}, commentPw: ${commentPw}`);

    try {
        // 댓글 내용 "작성자가 삭제한 글입니다."로 수정
        const [updateCount] = await UnivComment.update(
            { commentContent: '작성자가 삭제한 글입니다.' },
            {
                where: {
                    commentIdx: commentIdx,
                    writerPw: hashPassword(commentPw), // SHA256 암호화 적용
                },
            }
        );

        if (updateCount > 0) {
            logger.info(`[deleteComment] Comment 'deleted' successfully. CommentId: ${commentIdx}`);
            return true;
        } else {
            logger.warn(`[deleteComment] No matching comment found. CommentId: ${commentIdx}`);
            return false;
        }
    } catch (error) {
        logger.error(`[deleteComment] Error: ${error.message}`);
        throw error;
    }
};