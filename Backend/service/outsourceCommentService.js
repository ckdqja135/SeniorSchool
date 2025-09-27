const { OutsourceComment, sequelize } = require('../model/index');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * 외주 댓글 조회
 * @param boardIdx
 * @returns {Promise<Model[]>}
 */
exports.getOutsourceComments = async (boardIdx) => {
    return await OutsourceComment.findAll({
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
 * 외주 댓글 작성
 */
exports.insertOutsourceComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();
        // 댓글 생성
        const comment = await OutsourceComment.create({
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

        await transaction.commit();
        logger.info(`[insertOutsourceComment] Comment created successfully. CommentIdx: ${comment.commentIdx}, BoardIdx: ${commentData.boardIdx}`);
        return '외주 댓글이 성공적으로 작성되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[insertOutsourceComment] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 외주 댓글 수정
 */
exports.modifyOutsourceComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const { commentIdx, commentWriter, commentPw, commentContent } = commentData;
        
        // 필수 필드 검증
        if (!commentIdx || !commentWriter || !commentPw) {
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // 기존 댓글 조회 및 작성자 확인
        const existingComment = await OutsourceComment.findOne({
            where: { 
                commentIdx: commentIdx,
                writerId: commentWriter,
                writerPw: hashPassword(commentPw) // SHA256 암호화된 비밀번호로 비교
            }
        }, { transaction });

        if (!existingComment) {
            throw new Error('댓글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        // 댓글 수정
        const updateData = {
            modDate: new Date() // 수정일 업데이트
        };
        if (commentContent) {
            updateData.commentContent = commentContent;
        }

        await OutsourceComment.update(updateData, {
            where: { commentIdx: commentIdx }
        }, { transaction });

        await transaction.commit();
        logger.info(`[modifyOutsourceComment] Comment modified successfully. CommentIdx: ${commentIdx}`);
        return '외주 댓글이 성공적으로 수정되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[modifyOutsourceComment] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 외주 댓글 삭제
 */
exports.deleteOutsourceComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const { commentIdx, commentWriter, commentPw } = commentData;
        
        // 필수 필드 검증
        if (!commentIdx || !commentWriter || !commentPw) {
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // 작성자 확인 후 삭제
        const deleteResult = await OutsourceComment.destroy({
            where: { 
                commentIdx: commentIdx,
                writerId: commentWriter,
                writerPw: hashPassword(commentPw) // SHA256 암호화된 비밀번호로 비교
            }
        }, { transaction });

        if (deleteResult === 0) {
            throw new Error('댓글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        await transaction.commit();
        logger.info(`[deleteOutsourceComment] Comment deleted successfully. CommentIdx: ${commentIdx}`);
        return '외주 댓글이 성공적으로 삭제되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[deleteOutsourceComment] Error: ${error.message}`);
        throw error;
    }
};
