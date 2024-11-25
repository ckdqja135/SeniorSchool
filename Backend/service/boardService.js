const { UnivBoard, UnivBoardDetail, sequelize, UnivComment } = require('../model/index');

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

exports.insertBoard = async (boardData) => {
    const transaction = await sequelize.transaction({ autocommit: false });

    try {
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

        await UnivBoardDetail.create(
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

        await transaction.commit();
        return 'Board inserted successfully';
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

exports.correctBoard = async (boardData) => {
    const transaction = await sequelize.transaction();

    try {
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

        if (affectedCount === 0) {
            await transaction.rollback();
            throw new Error('No matching board found');
        }

        await transaction.commit();
        return 'Board updated successfully';
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

exports.deleteBoard = async (boardData) => {
    const transaction = await sequelize.transaction();

    try {
        const detailResult = await UnivBoardDetail.findOne({
            where: {
                BoardNo: boardData.boardNo,
                WriterPw: boardData.writerPw,
            },
            transaction,
        });

        if (!detailResult) {
            await transaction.rollback();
            throw new Error('No matching record found for boardId and writerPw');
        }

        await UnivBoardDetail.destroy({
            where: {
                BoardNo: boardData.boardNo,
                WriterPw: boardData.writerPw,
            },
            transaction,
        });

        await UnivBoard.destroy({ where: { BoardNo: boardData.boardNo }, transaction });
        await UnivComment.destroy({ where: { BoardNo: boardData.boardNo }, transaction });

        await transaction.commit();
        return 'Board deleted successfully';
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};
