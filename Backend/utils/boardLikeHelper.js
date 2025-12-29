/**
 * 게시판 좋아요 관련 공통 함수
 */

/**
 * 게시판 좋아요 토글
 * @param {Object} BoardModel - Sequelize Board 모델 (UnivBoard, ChurchBoard 등)
 * @param {number} boardIdx - 게시글 인덱스
 * @param {boolean} isLiked - 좋아요 여부 (true: 증가, false: 감소)
 * @param {Object} options - 옵션 { sequelize, transaction, logger }
 * @returns {Promise<Object>} - { message, currentLikes }
 */
const toggleBoardLike = async (BoardModel, boardIdx, isLiked, options = {}) => {
    const { sequelize, transaction, logger } = options;
    const useTransaction = !!transaction;
    
    // 트랜잭션이 없으면 새로 생성
    const txn = transaction || (sequelize ? await sequelize.transaction() : null);
    
    try {
        // 현재 게시글 조회
        const findOptions = {
            where: { boardIdx: boardIdx },
            attributes: ['boardLike']
        };
        if (txn) findOptions.transaction = txn;
        
        const board = await BoardModel.findOne(findOptions);
        
        if (!board) {
            if (txn && !useTransaction) await txn.rollback();
            throw new Error('Board not found');
        }
        
        // 현재 좋아요 수를 숫자로 변환
        const currentLikes = Number(board.boardLike) || 0;
        const newLikes = isLiked 
            ? currentLikes + 1 
            : Math.max(0, currentLikes - 1);
        
        // 좋아요 수 업데이트
        const updateOptions = {
            where: { boardIdx: boardIdx }
        };
        if (txn) updateOptions.transaction = txn;
        
        await BoardModel.update(
            { boardLike: newLikes },
            updateOptions
        );
        
        // 트랜잭션이 여기서 생성되었다면 커밋
        if (txn && !useTransaction) {
            await txn.commit();
        }
        
        const action = isLiked ? 'increased' : 'decreased';
        if (logger) {
            logger.info(`[toggleBoardLike] Board like ${action} for boardIdx: ${boardIdx}, Current: ${currentLikes}, New: ${newLikes}`);
        }
        
        return {
            message: isLiked ? '좋아요가 추가되었습니다.' : '좋아요가 취소되었습니다.',
            currentLikes: newLikes,
            action: action
        };
    } catch (error) {
        if (txn && !useTransaction) {
            await txn.rollback();
        }
        if (logger) {
            logger.error(`[toggleBoardLike] Error: ${error.message}`);
        }
        throw error;
    }
};

/**
 * 게시판 좋아요 수 조회
 * @param {Object} BoardModel - Sequelize Board 모델
 * @param {number} boardId - 게시글 인덱스
 * @param {Object} options - 옵션 { logger, throwOnNotFound }
 * @returns {Promise<number>} - 좋아요 수 (게시글이 없으면 0 또는 에러)
 */
const getBoardLike = async (BoardModel, boardId, options = {}) => {
    const { logger, throwOnNotFound = false } = options;
    
    try {
        const board = await BoardModel.findOne({
            where: { boardIdx: boardId },
            attributes: ['boardLike']
        });
        
        if (!board) {
            if (throwOnNotFound) {
                throw new Error('Board not found');
            }
            if (logger) {
                logger.warn(`[getBoardLike] Board not found for boardId: ${boardId}`);
            }
            return 0;
        }
        
        const likeCount = Number(board.boardLike) || 0;
        
        if (logger) {
            logger.info(`[getBoardLike] Like count retrieved for boardId: ${boardId}, likes: ${likeCount}`);
        }
        
        return likeCount;
    } catch (error) {
        if (logger) {
            logger.error(`[getBoardLike] Error: ${error.message}`);
        }
        throw error;
    }
};

module.exports = {
    toggleBoardLike,
    getBoardLike
};

