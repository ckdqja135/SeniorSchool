const { UnivBoard, UnivBoardDetail, sequelize, UnivComment } = require('../model/index');
const logger = require('../utils/logger');

exports.getBoards = async (univNo) => {
    return await UnivBoard.findAll({ where: { UnivNo: univNo } });
};

exports.getBoardDetail = async (boardNo) => {
    const detailBoard = await UnivBoardDetail.findOne({ where: { BoardNo: boardNo } });

    // 조회수 증가
    await UnivBoard.update(
        { BoardHits: sequelize.literal('BoardHits + 1') },
        { where: { BoardNo: boardNo } }
    );
    await UnivBoardDetail.update(
        { BoardHits: sequelize.literal('BoardHits + 1') },
        { where: { BoardNo: boardNo } }
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
                UnivNo: boardData.univNo,
                BoardTitle: boardData.boardTitle,
                BoardRegDate: boardData.boardReg,
                BoardLike: boardData.boardLike,
                BoardHits: boardData.board_hits,
                BoardID: boardData.boardId,
                BoardPW: boardData.boardPw,
            },
            { transaction }
        );
        logger.debug(`[insertBoard] UnivBoard created. BoardNo: ${board.id}`);

        // UnivBoardDetail 테이블에 데이터 저장
        const detail = await UnivBoardDetail.create(
            {
                BoardNo: board.id,
                UnivNo: boardData.univNo,
                BoardContent: boardData.boardContent,
                BoardRegDate: boardData.boardReg,
                BoardTitle: boardData.boardTitle,
                BoardLike: boardData.boardLike,
                BoardHits: boardData.board_hits,
                WriterId: boardData.boardId,
                WriterPw: boardData.boardPw,
            },
            { transaction }
        );
        logger.debug(`[insertBoard] UnivBoardDetail created. BoardNo: ${detail.BoardNo}`);

        await transaction.commit();
        logger.info(`[insertBoard] Transaction committed. Board inserted successfully. BoardNo: ${board.id}`);
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
                { BoardContent: boardData.boardContent },
                {
                    where: {
                        BoardNo: boardData.boardNo,
                        WriterPw: boardData.writerPw,
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
            logger.info(`[correctBoard] Transaction committed. Board updated successfully. BoardNo: ${boardData.boardNo}`);
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
                    BoardNo: boardData.boardNo,
                    WriterPw: boardData.writerPw,
                },
                transaction,
            });

            // 대상이 없으면 롤백
            if (!detailResult) {
                logger.warn('[deleteBoard] No matching record found for boardNo and writerPw. Rolling back.');
                await transaction.rollback();
                throw new Error('No matching record found for boardId and writerPw');
            }

            // UnivBoardDetail 삭제
            await UnivBoardDetail.destroy({
                where: {
                    BoardNo: boardData.boardNo,
                    WriterPw: boardData.writerPw,
                },
                transaction,
            });
            logger.debug(`[deleteBoard] UnivBoardDetail deleted. BoardNo: ${boardData.boardNo}`);

            // UnivBoard 삭제
            await UnivBoard.destroy({
                where: { BoardNo: boardData.boardNo },
                transaction,
            });
            logger.debug(`[deleteBoard] UnivBoard deleted. BoardNo: ${boardData.boardNo}`);

            // UnivComment 삭제
            await UnivComment.destroy({
                where: { BoardNo: boardData.boardNo },
                transaction,
            });
            logger.debug(`[deleteBoard] UnivComment deleted. BoardNo: ${boardData.boardNo}`);

            await transaction.commit();
            logger.info(`[deleteBoard] Transaction committed. Board deleted successfully. BoardNo: ${boardData.boardNo}`);
            return 'Board deleted successfully';
        } catch (error) {
            logger.error(`[deleteBoard] Error: ${error.message}. Transaction rollback.`);
            await transaction.rollback();
            throw error;
        }
    }
};
