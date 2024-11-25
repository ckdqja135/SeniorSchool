const commentService = require('../service/commentService');

exports.getComments = async (req, res) => {
    try {
        const { boardNo } = req.query;

        if (!boardNo) {
            return res.status(400).json({ error: 'boardNo is required' });
        }

        const comments = await commentService.getComments(boardNo);
        return res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.insertComment = async (req, res) => {
    try {
        const {
            commentWriter,
            commentPw,
            commentContent,
            boardNo,
            parentId,
            depth,
            commentLike
        } = req.body;

        // 입력값 파싱 및 유효성 검사
        const commentData = {
            commentWriter,
            commentPw,
            commentContent,
            boardNo: parseInt(boardNo),
            parentId: parseInt(parentId),
            depth: parseInt(depth),
            commentLike: parseInt(commentLike)
        };

        await commentService.insertComment(commentData);
        return res.status(200).json({ success: true, message: 'Comment inserted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.modifyComment = async (req, res) => {
    try {
        const { replyPw, commentNo, commentContent } = req.body;

        const isUpdated = await commentService.modifyComment({ replyPw, commentNo, commentContent });

        if (isUpdated) {
            return res.status(200).json({ success: true, message: 'Comment updated successfully' });
        } else {
            return res.status(404).json({ error: 'Comment not found or password incorrect' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { commentPw, commentNo } = req.body;

        const isDeleted = await commentService.deleteComment({ commentPw, commentNo });

        if (isDeleted) {
            return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
        } else {
            return res.status(404).json({ error: 'Comment not found or password incorrect' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};