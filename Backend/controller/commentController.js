const commentService = require('../service/commentService');
const logger = require('../utils/logger'); // Winston 기반 로거 추가

exports.getComments = async (req, res) => {
    try {
        const { boardIdx } = req.query;

        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const comments = await commentService.getComments(boardIdx);
        return res.status(200).json(comments);
    } catch (error) {
        logger.error(`[getComments] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.insertComment = async (req, res) => {
    try {
        const {
            commentWriter,
            commentPw,
            commentContent,
            boardIdx,
            parentIdx,
            depth,
            commentLike
        } = req.body;

        // 입력값 파싱 및 유효성 검사
        const commentData = {
            commentWriter,
            commentPw,
            commentContent,
            boardIdx: parseInt(boardIdx),
            parentIdx: parseInt(parentIdx),
            depth: parseInt(depth),
            commentLike: parseInt(commentLike)
        };

        await commentService.insertComment(commentData);
        return res.status(200).json({ success: true, message: 'Comment inserted successfully' });
    } catch (error) {
        logger.error(`[insertComment] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.modifyComment = async (req, res) => {
    try {
        const { replyPw, commentIdx, commentContent } = req.body;

        const isUpdated = await commentService.modifyComment({ replyPw, commentIdx, commentContent });

        if (isUpdated) {
            return res.status(200).json({ success: true, message: 'Comment updated successfully' });
        } else {
            return res.status(404).json({ error: 'Comment not found or password incorrect' });
        }
    } catch (error) {
        logger.error(`[modifyComment] ${error.message}`);
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
        logger.error(`[deleteComment] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};