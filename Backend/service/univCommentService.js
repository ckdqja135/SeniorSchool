const { UnivComment, sequelize } = require('../model/index');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * 대학교 댓글 조회
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
            'commentContent',
            'regDate',
            'modDate'
        ]
    });
};

/**
 * 대학교 댓글 작성
 */
exports.insertComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();
        // 댓글 생성
        const comment = await UnivComment.create({
            boardIdx: commentData.boardIdx,
            commentDepth: commentData.depth,
            writerId: commentData.commentWriter,
            writerPw: hashPassword(commentData.commentPw), // SHA256 암호화 적용
            commentPerent: commentData.parentIdx,
            commentContent: commentData.commentContent,
            commentLike: commentData.commentLike,
            regDate: now,
            modDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
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
 * 대학교 댓글 수정
 */
exports.modifyComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        // 비밀번호 검증
        const comment = await UnivComment.findOne({
            where: { commentIdx: commentData.commentIdx },
            transaction
        });

        if (!comment) {
            logger.warn(`[modifyComment] Comment not found: ${commentData.commentIdx}`);
            return false;
        }

        // 입력된 비밀번호와 저장된 비밀번호 비교
        const hashedInputPassword = hashPassword(commentData.commentPw);
        if (comment.writerPw !== hashedInputPassword) {
            logger.warn(`[modifyComment] Password mismatch for comment: ${commentData.commentIdx}`);
            return false;
        }

        // 댓글 수정
        const now = new Date();
        await UnivComment.update({
            commentContent: commentData.commentContent,
            modDate: now
        }, {
            where: { commentIdx: commentData.commentIdx },
            transaction
        });

        await transaction.commit();
        logger.info(`[modifyComment] Comment updated successfully. CommentId: ${commentData.commentIdx}`);
        return true;
    } catch (error) {
        await transaction.rollback();
        logger.error(`[modifyComment] Error: ${error.message}. Transaction rollback.`);
        throw error;
    }
};

/**
 * 대학교 댓글 삭제
 */
exports.deleteComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        // 비밀번호 검증
        const comment = await UnivComment.findOne({
            where: { commentIdx: commentData.commentIdx },
            transaction
        });

        if (!comment) {
            logger.warn(`[deleteComment] Comment not found: ${commentData.commentIdx}`);
            return false;
        }

        // 입력된 비밀번호와 저장된 비밀번호 비교
        const hashedInputPassword = hashPassword(commentData.commentPw);
        if (comment.writerPw !== hashedInputPassword) {
            logger.warn(`[deleteComment] Password mismatch for comment: ${commentData.commentIdx}`);
            return false;
        }

        // 댓글 삭제
        await UnivComment.destroy({
            where: { commentIdx: commentData.commentIdx },
            transaction
        });

        await transaction.commit();
        logger.info(`[deleteComment] Comment deleted successfully. CommentId: ${commentData.commentIdx}`);
        return true;
    } catch (error) {
        await transaction.rollback();
        logger.error(`[deleteComment] Error: ${error.message}. Transaction rollback.`);
        throw error;
    }
};
