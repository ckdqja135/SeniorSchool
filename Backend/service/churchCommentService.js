const { ChurchComment, sequelize } = require('../model/index');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * 교회 댓글 조회
 * @param boardIdx
 * @returns {Promise<Model[]>}
 */
exports.getChurchComments = async (boardIdx) => {
    return await ChurchComment.findAll({
        where: { boardIdx: boardIdx },
        attributes: [
            'commentIdx',
            'boardIdx',
            'commentLike',
            'commentDepth',
            'writerId',
            'commentParent',
            'commentContent',
            'regDate',
            'modDate'
        ]
    });
};

/**
 * 교회 댓글 작성
 */
exports.insertChurchComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();
        // 댓글 생성
        const comment = await ChurchComment.create({
            boardIdx: commentData.boardIdx,
            commentDepth: commentData.depth,
            writerId: commentData.commentWriter,
            writerPw: hashPassword(commentData.commentPw), // SHA256 암호화 적용
            commentParent: commentData.parentIdx,
            commentContent: commentData.commentContent,
            commentLike: commentData.commentLike,
            regDate: now,
            modDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
        }, { transaction });

        logger.debug(`[insertChurchComment] ChurchComment created. CommentId: ${comment.commentIdx}`);

        await transaction.commit();
        logger.info(`[insertChurchComment] Transaction committed. Comment inserted successfully. CommentId: ${comment.commentIdx}`);
        return 'Comment inserted successfully';
    } catch (error) {
        logger.error(`[insertChurchComment] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

/**
 * 교회 댓글 수정
 */
exports.modifyChurchComment = async ({ commentPw, commentIdx, commentContent }) => {
    try {
        // 댓글 내용 업데이트 (단일 쿼리이므로 트랜잭션 optional)
        const [updateCount] = await ChurchComment.update(
            { 
                commentContent: commentContent,
                modDate: new Date() // 수정일 업데이트
            },
            {
                where: {
                    commentIdx: commentIdx,
                    writerPw: hashPassword(commentPw), // SHA256 암호화 적용
                },
            }
        );

        if (updateCount > 0) {
            logger.info(`[modifyChurchComment] Comment updated successfully. CommentIdx: ${commentIdx}`);
            return true;
        } else {
            logger.warn(`[modifyChurchComment] No matching comment found. CommentIdx: ${commentIdx}`);
            return false;
        }
    } catch (error) {
        logger.error(`[modifyChurchComment] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 댓글 삭제
 */
exports.deleteChurchComment = async ({ commentPw, commentIdx }) => {
    logger.info(`[deleteChurchComment] Start - commentIdx: ${commentIdx}, commentPw: ${commentPw}`);

    try {
        // 댓글을 데이터베이스에서 완전히 삭제
        const deleteCount = await ChurchComment.destroy({
            where: {
                commentIdx: commentIdx,
                writerPw: hashPassword(commentPw), // SHA256 암호화 적용
            },
        });

        if (deleteCount > 0) {
            logger.info(`[deleteChurchComment] Comment deleted successfully. CommentId: ${commentIdx}`);
            return true;
        } else {
            logger.warn(`[deleteChurchComment] No matching comment found. CommentId: ${commentIdx}`);
            return false;
        }
    } catch (error) {
        logger.error(`[deleteChurchComment] Error: ${error.message}`);
        throw error;
    }
};
