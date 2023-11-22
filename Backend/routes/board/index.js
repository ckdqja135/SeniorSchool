var express = require('express');
const router = express.Router();
const { UnivBoard, UnivBoardDetail,sequelize } = require('../../model/index');

router.get('/',async (req,res) => {
    try {
        let univNo = req.query.UnivNo;
        const boards = await UnivBoard.findAll({
            where: {
                UnivNo: univNo
            }
        });

        return res.status(200).json(boards);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/detail', async (req, res) => {
    try {
        let boardNo = req.query.boardNo;

        const detailBoard = await UnivBoardDetail.findOne({
            where: {
                BoardNo: boardNo
            }
        });

        await UnivBoard.update(
            { BoardHits: sequelize.literal('BoardHits + 1') },
            {
                where: {
                    BoardNo: boardNo
                }
            }
        );

        await UnivBoardDetail.update(
            { BoardHits: sequelize.literal('BoardHits + 1') },
            {
                where: {
                    BoardNo: boardNo
                }
            }
        );

        return res.status(200).json(detailBoard);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/insert', async (req, res) => {
    try {
        const { univNo, boardTitle, boardContent, boardReg, boardLike, board_hits, boardId, boardPw } = req.body;

        // 트랜잭션 시작
        const transaction = await sequelize.transaction({ autocommit: false });
        console.log(req.body);
        console.log(transaction);
        try {
            // Board 모델에 레코드 삽입
            const board = await UnivBoard.create({
                UnivNo: univNo,
                BoardTitle: boardTitle,
                BoardRegDate: boardReg,
                BoardLike: boardLike,
                BoardHits: board_hits,
                BoardID: boardId,
                BoardPW: boardPw,
            }, { transaction });

            // BoardDetail 모델에 레코드 삽입
            await UnivBoardDetail.create({
                BoardNo: board.id, // Board 모델의 자동 생성된 id를 사용
                UnivNo: univNo,
                BoardContent: boardContent,
                BoardRegDate: boardReg,
                BoardTitle: boardTitle,
                BoardLike: boardLike,
                BoardHits: board_hits,
                WriterId: boardId,
                WriterPw: boardPw,
            }, { transaction });

            // 트랜잭션 커밋
            await transaction.commit();

            return res.status(200).json({ success: true, message: 'Board inserted successfully' });
        } catch (error) {
            // 트랜잭션 롤백
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});




module.exports = router;
