const compCommentService = require('../service/compCommentService');
const logger = require('../utils/logger');

exports.getComments = async (req, res) => {
    try {
        const { boardIdx } = req.query;

        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const comments = await compCommentService.getComments(boardIdx);
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
            commentID,
            commentPw,
            commentContent,
            boardIdx,
            parentIdx,
            commentParent,
            depth,
            commentDepth,
            commentLike
        } = req.body;

        // 입력값 파싱 및 유효성 검사
        const commentData = {
            commentWriter: commentWriter || commentID,  // commentWriter가 없으면 commentID 사용
            commentPw,
            commentContent,
            boardIdx: parseInt(boardIdx),
            parentIdx: parseInt(parentIdx || commentParent) || 0,  // parentIdx가 없으면 commentParent 사용
            depth: parseInt(depth || commentDepth) || 0,  // depth가 없으면 commentDepth 사용
            commentLike: parseInt(commentLike) || 0  // 기본값 0
        };

        await compCommentService.insertComment(commentData);
        return res.status(200).json({ success: true, message: 'Comment inserted successfully' });
    } catch (error) {
        logger.error(`[insertComment] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.modifyComment = async (req, res) => {
    try {
        const { commentPw, commentIdx, commentContent } = req.body;

        const isUpdated = await compCommentService.modifyComment({ commentPw, commentIdx, commentContent });

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
        const { commentPw, commentIdx } = req.body;

        const isDeleted = await compCommentService.deleteComment({ commentPw, commentIdx });

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
