const { UnivBoard, UnivBoardDetail, sequelize, UnivComment } = require('../model/index');
const logger = require('../utils/logger');

exports.getBoards = async (univIdx) => {
    return await UnivBoard.findAll({ where: { univIdx: univIdx } });
};

exports.getBoardDetail = async (boardIdx) => {
    const detailBoard = await UnivBoardDetail.findOne({ where: { boardIdx: boardIdx } });

    // 조회수 증가
    await UnivBoard.update(
        { boardHits: sequelize.literal('boardHits + 1') },
        { where: { boardIdx: boardIdx } }
    );
    await UnivBoardDetail.update(
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
        // UnivBoard 테이블에 데이터 저장
        const board = await UnivBoard.create(
            {
                univIdx: boardData.univIdx,
                boardTitle: boardData.boardTitle,
                boardRegDate: boardData.boardReg,
                boardLike: boardData.boardLike,
                boardHits: boardData.boardHits,
                boardIdx: boardData.boardIdx,
                boardID: boardData.boardId,
                boardPW: boardData.boardPw,
            },
            { transaction }
        );
        logger.debug(`[insertBoard] UnivBoard created. BoardIdx: ${board.idx}`);

        // UnivBoardDetail 테이블에 데이터 저장
        const detail = await UnivBoardDetail.create(
            {
                boardIdx: board.Idx,
                univIdx: boardData.univIdx,
                boardContent: boardData.boardContent,
                boardRegDate: boardData.boardReg,
                boardTitle: boardData.boardTitle,
                boardLike: boardData.boardLike,
                boardHits: boardData.boardHits,
                writerId: boardData.boardId,
                writerPw: boardData.boardPw,
            },
            { transaction }
        );
        logger.debug(`[insertBoard] UnivBoardDetail created. BoardIdx: ${detail.BoardIdx}`);

        await transaction.commit();
        logger.info(`[insertBoard] Transaction committed. Board inserted successfully. BoardIdx: ${board.idx}`);
        return 'Board inserted successfully';
    } catch (error) {
        logger.error(`[insertBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

exports.correctBoard = async (boardData) => {
        const transaction = await sequelize.transaction();
    /**
     * 게시글 수정
     */
    exports.correctBoard = async (boardData) => {
        // logger.info(`[correctBoard] Start - boardData: ${JSON.stringify(boardData)}`);

        const transaction = await sequelize.transaction();
        try {
            // UnivBoardDetail 업데이트
            const [affectedCount] = await UnivBoardDetail.update(
                { boardContent: boardData.boardContent },
                {
                    where: {
                        boardIdx: boardData.boardIdx,
                        writerPw: boardData.writerPw,
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
            const detailResult = await UnivBoardDetail.findOne({
                where: {
                    boardIdx: boardData.boardIdx,
                    writerPw: boardData.writerPw,
                },
                transaction,
            });

            // 대상이 없으면 롤백
            if (!detailResult) {
                logger.warn('[deleteBoard] No matching record found for boardIdx and writerPw. Rolling back.');
                await transaction.rollback();
                throw new Error('No matching record found for boardId and writerPw');
            }

            // UnivBoardDetail 삭제
            await UnivBoardDetail.destroy({
                where: {
                    boardIdx: boardData.boardIdx,
                    writerPw: boardData.writerPw,
                },
                transaction,
            });
            logger.debug(`[deleteBoard] UnivBoardDetail deleted. BoardIdx: ${boardData.boardIdx}`);

            // UnivBoard 삭제
            await UnivBoard.destroy({
                where: { boardIdx: boardData.boardIdx },
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
    }
};
