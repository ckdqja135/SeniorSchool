var express = require('express');
const router = express.Router();
const { UnivComment, sequelize } = require('../../model/index');

router.get('/', async (req, res) => {
    try {
        const { boardNo } = req.query;

        if (!boardNo) {
            return res.status(400).json({ error: 'boardNo is required' });
        }

        const comments = await UnivComment.findAll({
            where: {
                BoardNo: boardNo
            }
        });

        return res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/insert', async (req, res) => {
    try {
        const {
            commentWriter,
            commentPw,
            commentContent
        } = req.body;

        const boardNo = parseInt(req.body.boardNo);
        const parentId = parseInt(req.body.parentId);
        const depth = parseInt(req.body.depth);
        const commentLike = parseInt(req.body.commentLike);
        const transaction = await sequelize.transaction();

        try {
            let insApplication;

            if (depth === 0) {
                insApplication = await UnivComment.create({
                    BoardNo: boardNo,
                    CommentDepth: depth,
                    WriterId: commentWriter,
                    WriterPw: commentPw,
                    CommnetPerent: parentId,
                    CommentContent: commentContent,
                    CommentLike: commentLike
                }, { transaction });
            } else if (depth === 1) {
                insApplication = await UnivComment.create({
                    BoardNo: boardNo,
                    CommentDepth: depth,
                    WriterId: commentWriter,
                    WriterPw: commentPw,
                    CommnetPerent: parentId,
                    CommentContent: commentContent,
                    CommentLike: commentLike
                }, { transaction });
            }

            await transaction.commit();
            return res.status(200).json({ success: true, message: 'Comment inserted successfully'});
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/modify', async (req, res) => {
    try {
        const { replyPw, commentNo, commentContent } = req.body;

        // 댓글 업데이트
        const [updateCount, updateResult] = await UnivComment.update(
            { CommentContent: commentContent },
            {
                where: {
                    CommentId: commentNo,
                    WriterPw: replyPw
                }
            }
        );

        if (updateCount > 0) {
            return res.status(200).json({ success: true, message: 'Comment updated successfully' });
        } else {
            return res.status(404).json({ error: 'Comment not found or password incorrect' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/delete', async (req, res) => {
    try {
        const { commentPw, commentNo } = req.body;

        // 댓글 삭제
        const [updateCount, updateResult] = await UnivComment.update(
            { CommentContent: '작성자가 삭제한 글입니다.' },
            {
                where: {
                    CommentId: commentNo,
                    WriterPw: commentPw
                }
            }
        );

        if (updateCount > 0) {
            return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
        } else {
            return res.status(404).json({ error: 'Comment not found or password incorrect' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;