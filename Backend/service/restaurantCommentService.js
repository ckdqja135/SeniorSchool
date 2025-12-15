const { RestaurantComment, sequelize } = require('../model/index');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * 식당 댓글 조회
 * @param boardIdx
 * @returns {Promise<Model[]>}
 */
exports.getRestaurantComments = async (boardIdx) => {
    return await RestaurantComment.findAll({
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
 * 식당 댓글 작성
 */
exports.insertRestaurantComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();
        
        // commentParent 처리
        let commentParent = commentData.commentParent;
        
        // 일반 댓글인 경우 (commentParent가 없으면) 해당 게시글의 최근 댓글 인덱스 + 1 설정
        if (commentParent === null || commentParent === undefined) {
            const latestComment = await RestaurantComment.findOne({
                where: { boardIdx: commentData.boardIdx },
                order: [['commentIdx', 'DESC']],
                attributes: ['commentIdx'],
                transaction: transaction
            });
            
            if (latestComment && latestComment.commentIdx) {
                commentParent = latestComment.commentIdx + 1;
            } else {
                // 댓글이 하나도 없는 경우 1로 설정
                commentParent = 1;
            }
        }
        
        // 댓글 생성
        const comment = await RestaurantComment.create({
            boardIdx: commentData.boardIdx,
            commentDepth: commentData.commentDepth || 0,
            writerId: commentData.writerId,
            writerPw: hashPassword(commentData.writerPw), // SHA256 암호화 적용
            commentParent: commentParent,
            commentContent: commentData.commentContent,
            commentLike: 0,
            regDate: now,
            modDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
        }, { transaction });

        await transaction.commit();
        logger.info(`[insertRestaurantComment] Comment created successfully. CommentIdx: ${comment.commentIdx}, BoardIdx: ${commentData.boardIdx}, CommentParent: ${commentParent}`);
        return '식당 댓글이 성공적으로 작성되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[insertRestaurantComment] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 식당 댓글 수정
 */
exports.modifyRestaurantComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const { commentIdx, commentWriter, commentPw, commentContent } = commentData;
        
        // 필수 필드 검증
        if (!commentIdx || !commentWriter || !commentPw) {
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // 기존 댓글 조회 및 작성자 확인
        const existingComment = await RestaurantComment.findOne({
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

        await RestaurantComment.update(updateData, {
            where: { commentIdx: commentIdx }
        }, { transaction });

        await transaction.commit();
        logger.info(`[modifyRestaurantComment] Comment modified successfully. CommentIdx: ${commentIdx}`);
        return '식당 댓글이 성공적으로 수정되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[modifyRestaurantComment] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 식당 댓글 삭제
 */
exports.deleteRestaurantComment = async (commentData) => {
    const transaction = await sequelize.transaction();
    try {
        const { commentIdx, commentWriter, commentPw } = commentData;
        
        // 필수 필드 검증 - commentWriter 필수 조건 제거
        if (!commentIdx || !commentPw) {
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // commentWriter가 없으면 commentIdx와 비밀번호만으로 삭제
        const whereCondition = { 
            commentIdx: commentIdx,
            writerPw: hashPassword(commentPw) // SHA256 암호화된 비밀번호로 비교
        };
        
        if (commentWriter) {
            whereCondition.writerId = commentWriter;
        }

        // 작성자 확인 후 삭제
        const deleteResult = await RestaurantComment.destroy({
            where: whereCondition
        }, { transaction });

        if (deleteResult === 0) {
            throw new Error('댓글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        await transaction.commit();
        logger.info(`[deleteRestaurantComment] Comment deleted successfully. CommentIdx: ${commentIdx}`);
        return '식당 댓글이 성공적으로 삭제되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[deleteRestaurantComment] Error: ${error.message}`);
        throw error;
    }
};

