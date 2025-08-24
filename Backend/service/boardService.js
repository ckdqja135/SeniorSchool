const { UnivBoard, sequelize, UnivComment } = require('../model/index');
const logger = require('../utils/logger');

exports.getBoards = async (univIdx) => {
    return await UnivBoard.findAll({ where: { univIdx: univIdx } });
};

exports.getBoardDetail = async (boardIdx) => {
    const detailBoard = await UnivBoard.findOne({ where: { boardIdx: boardIdx } });

    // 조회수 증가
    await UnivBoard.update(
        { boardHits: sequelize.literal('boardHits + 1') },
        { where: { boardIdx: boardIdx } }
    );

    return detailBoard;
};

/**
 * 게시글 생성
 */
exports.insertBoard = async (boardData) => {
    // logger.info(`[insertBoard] Start - boardData: ${JSON.stringify(boardData)}`);

    const transaction = await sequelize.transaction({ autocommit: false });

    try {
        // UnivBoard 테이블에 모든 데이터 저장
        const board = await UnivBoard.create(
            {
                univIdx: boardData.univIdx,
                boardTitle: boardData.boardTitle,
                boardContent: boardData.boardContent,
                boardRegDate: boardData.boardReg,
                boardLike: boardData.boardLike || 0,
                boardHits: boardData.boardHits || 0,
                boardID: boardData.boardId,
                boardPW: boardData.boardPw,
            },
            { transaction }
        );
        logger.debug(`[insertBoard] UnivBoard created. BoardIdx: ${board.boardIdx}`);

        await transaction.commit();
        logger.info(`[insertBoard] Transaction committed. Board inserted successfully. BoardIdx: ${board.boardIdx}`);
        return 'Board inserted successfully';
    } catch (error) {
        logger.error(`[insertBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

/**
 * 게시글 수정
 */
exports.correctBoard = async (boardData) => {
    // logger.info(`[correctBoard] Start - boardData: ${JSON.stringify(boardData)}`);

    const transaction = await sequelize.transaction();
    try {
        // UnivBoard 업데이트
        const [affectedCount] = await UnivBoard.update(
            { 
                boardContent: boardData.boardContent,
                boardTitle: boardData.boardTitle 
            },
            {
                where: {
                    boardIdx: boardData.boardIdx,
                    boardPW: boardData.writerPw,
                },
                transaction,
            }
        );

        // 해당하는 레코드가 없으면 롤백 처리
        if (affectedCount === 0) {
            logger.warn('[correctBoard] No matching board found. Rolling back transaction.');
            await transaction.rollback();
            throw new Error('No matching board found');
        }

        await transaction.commit();
        logger.info(`[correctBoard] Transaction committed. Board updated successfully. BoardIdx: ${boardData.boardIdx}`);
        return 'Board updated successfully';
    } catch (error) {
        logger.error(`[correctBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

/**
 * 게시글 삭제
 */
exports.deleteBoard = async (boardData) => {
    // logger.info(`[deleteBoard] Start - boardData: ${JSON.stringify(boardData)}`);

    const transaction = await sequelize.transaction();
    try {
        // 삭제할 대상이 존재하는지 조회
        const boardResult = await UnivBoard.findOne({
            where: {
                boardIdx: boardData.boardIdx,
                boardPW: boardData.writerPw,
            },
            transaction,
        });

        // 대상이 없으면 롤백
        if (!boardResult) {
            logger.warn('[deleteBoard] No matching record found for boardIdx and writerPw. Rolling back.');
            await transaction.rollback();
            throw new Error('No matching record found for boardIdx and writerPw');
        }

        // UnivBoard 삭제
        await UnivBoard.destroy({
            where: {
                boardIdx: boardData.boardIdx,
                boardPW: boardData.writerPw,
            },
            transaction,
        });
        logger.debug(`[deleteBoard] UnivBoard deleted. BoardIdx: ${boardData.boardIdx}`);

        // UnivComment 삭제
        await UnivComment.destroy({
            where: { boardIdx: boardData.boardIdx },
            transaction,
        });
        logger.debug(`[deleteBoard] UnivComment deleted. BoardIdx: ${boardData.boardIdx}`);

        await transaction.commit();
        logger.info(`[deleteBoard] Transaction committed. Board deleted successfully. BoardIdx: ${boardData.boardIdx}`);
        return 'Board deleted successfully';
    } catch (error) {
        logger.error(`[deleteBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 게시판 좋아요 토글
exports.toggleBoardLike = async (boardIdx, userId) => {
    try {
        // 현재 좋아요 수 조회
        const board = await UnivBoard.findOne({
            where: { boardIdx: boardIdx }
        });

        if (!board) {
            throw new Error('Board not found');
        }

        // 임시로 항상 +1 증가 (실제 구현시에는 사용자별 상태 확인 필요)
        const [affectedCount] = await UnivBoard.update(
            { boardLike: sequelize.literal('boardLike + 1') },
            { where: { boardIdx: boardIdx } }
        );

        logger.info(`[toggleBoardLike] Board like toggled successfully. BoardIdx: ${boardIdx}`);
        return 'Board like toggled successfully';
    } catch (error) {
        logger.error(`[toggleBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 게시판 좋아요 수 조회
exports.getBoardLike = async (boardId) => {
    try {
        const board = await UnivBoard.findOne({
            where: { boardIdx: boardId },
            attributes: ['boardLike']
        });

        if (!board) {
            throw new Error('Board not found');
        }

        logger.info(`[getBoardLike] Board like count retrieved. BoardIdx: ${boardId}, LikeCount: ${board.boardLike}`);
        return board.boardLike;
    } catch (error) {
        logger.error(`[getBoardLike] Error: ${error.message}`);
        throw error;
    }
};
