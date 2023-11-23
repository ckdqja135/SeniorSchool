var express = require('express');
const router = express.Router();
const { UnivBoard, UnivBoardDetail,sequelize, UnivComment } = require('../../model/index');
// Sequelize 쿼리 로거 활성화
sequelize.options.logging = console.log;
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

router.put('/correct', async (req, res) => {
    try {
        const { boardNo, boardContent, writerPw } = req.body;
        // 트랜잭션 시작
        const transaction = await sequelize.transaction();

        try {

            const result = await UnivBoardDetail.update(
                { BoardContent: boardContent },
                {
                    where: {
                        BoardNo: boardNo,
                        WriterPw: writerPw
                    }
                }
            );

            // 트랜잭션 커밋
            await transaction.commit();

            return res.status(200).json({ success: true, message: 'Board updated successfully' });
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

router.delete('/delete', async (req, res) => {
    try {
        const { boardNo, writerPw } = req.body;

        // 트랜잭션 시작
        const transaction = await sequelize.transaction();

        try {
            // board_detail 조회
            const detailResult = await UnivBoardDetail.findOne({
                where: {
                    BoardNo: boardNo,
                    WriterPw: writerPw
                },
                transaction
            });

            if (detailResult) {
                // UnivBoardDetail.destroy 실행
                await UnivBoardDetail.destroy({
                    where: {
                        BoardNo: boardNo,
                        WriterPw: writerPw
                    },
                    transaction
                });

                // UnivBoard.destroy 실행
                const boardResult = await UnivBoard.destroy({
                    where: {
                        BoardNo: boardNo
                    },
                    transaction
                });

                // UnivBoardComment.destroy 실행
                await UnivComment.destroy({
                    where: {
                        BoardNo: boardNo
                    },
                    transaction
                });

                // 트랜잭션 커밋
                await transaction.commit();

                return res.status(200).json({ success: true, message: 'Board deleted successfully' });
            } else {
                // detailResult가 없으면 롤백
                await transaction.rollback();
                return res.status(400).json({ error: 'No matching record found for boardId and writerPw' });
            }
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
