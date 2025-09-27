const outsourceCommentService = require('../service/outsourceCommentService');
const logger = require('../utils/logger');

// 외주업체 댓글 조회
exports.getOutsourceComments = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const comments = await outsourceCommentService.getOutsourceComments(boardIdx);
        res.status(200).json(comments);
    } catch (error) {
        logger.error(`[getOutsourceComments] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 댓글 추가
exports.insertOutsourceComment = async (req, res, next) => {
    try {
        const commentData = req.body;
        
        // 필수 필드 검증 (프론트엔드 필드명에 맞춰 수정)
        if (!commentData.boardIdx || !commentData.writerId || !commentData.writerPw || !commentData.commentContent) {
            return res.status(400).json({ error: 'Required fields missing: boardIdx, writerId, writerPw, commentContent' });
        }

        const result = await outsourceCommentService.insertOutsourceComment(commentData);
        res.status(201).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[insertOutsourceComment] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 댓글 수정
exports.modifyOutsourceComment = async (req, res, next) => {
    try {
        const commentData = req.body;
        
        // 필수 필드 검증
        if (!commentData.commentIdx || !commentData.commentWriter || !commentData.commentPw) {
            return res.status(400).json({ error: 'Required fields missing: commentIdx, commentWriter, commentPw' });
        }

        const result = await outsourceCommentService.modifyOutsourceComment(commentData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[modifyOutsourceComment] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 댓글 삭제
exports.deleteOutsourceComment = async (req, res, next) => {
    try {
        const commentData = req.body;
        
        // 필수 필드 검증
        if (!commentData.commentIdx || !commentData.commentWriter || !commentData.commentPw) {
            return res.status(400).json({ error: 'Required fields missing: commentIdx, commentWriter, commentPw' });
        }

        const result = await outsourceCommentService.deleteOutsourceComment(commentData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[deleteOutsourceComment] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
