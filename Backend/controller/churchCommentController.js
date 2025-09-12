const churchCommentService = require('../service/churchCommentService');
const logger = require('../utils/logger');

exports.getChurchComments = async (req, res) => {
    try {
        const { boardIdx } = req.query;

        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const comments = await churchCommentService.getChurchComments(boardIdx);
        return res.status(200).json(comments);
    } catch (error) {
        logger.error(`[getChurchComments] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.insertChurchComment = async (req, res) => {
    try {
        const {
            commentWriter,
            commentID,
            commentPw,
            commentContent,
            boardIdx,
            parentIdx,
            commentParent,  // 프론트엔드에서 보내는 필드명
            depth,
            commentDepth,   // 프론트엔드에서 보내는 필드명
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

        await churchCommentService.insertChurchComment(commentData);
        return res.status(200).json({ success: true, message: 'Comment inserted successfully' });
    } catch (error) {
        logger.error(`[insertChurchComment] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.modifyChurchComment = async (req, res) => {
    try {
        const { commentPw, commentIdx, commentContent } = req.body;

        const isUpdated = await churchCommentService.modifyChurchComment({ commentPw, commentIdx, commentContent });

        if (isUpdated) {
            return res.status(200).json({ success: true, message: 'Comment updated successfully' });
        } else {
            return res.status(404).json({ error: 'Comment not found or password incorrect' });
        }
    } catch (error) {
        logger.error(`[modifyChurchComment] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteChurchComment = async (req, res) => {
    try {
        const { commentPw, commentIdx } = req.body;

        const isDeleted = await churchCommentService.deleteChurchComment({ commentPw, commentIdx });

        if (isDeleted) {
            return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
        } else {
            return res.status(404).json({ error: 'Comment not found or password incorrect' });
        }
    } catch (error) {
        logger.error(`[deleteChurchComment] ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
