const restaurantCommentService = require('../service/restaurantCommentService');
const logger = require('../utils/logger');

// 식당 댓글 조회
exports.getRestaurantComments = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const comments = await restaurantCommentService.getRestaurantComments(boardIdx);
        res.status(200).json(comments);
    } catch (error) {
        logger.error(`[getRestaurantComments] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 댓글 추가
exports.insertRestaurantComment = async (req, res, next) => {
    try {
        const commentData = req.body;
        
        // 필수 필드 검증 (프론트엔드 필드명에 맞춰 수정)
        if (!commentData.boardIdx || !commentData.writerId || !commentData.writerPw || !commentData.commentContent) {
            return res.status(400).json({ error: 'Required fields missing: boardIdx, writerId, writerPw, commentContent' });
        }

        const result = await restaurantCommentService.insertRestaurantComment(commentData);
        res.status(201).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[insertRestaurantComment] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 댓글 수정
exports.modifyRestaurantComment = async (req, res, next) => {
    try {
        const commentData = req.body;
        
        // 필수 필드 검증
        if (!commentData.commentIdx || !commentData.commentWriter || !commentData.commentPw) {
            return res.status(400).json({ error: 'Required fields missing: commentIdx, commentWriter, commentPw' });
        }

        const result = await restaurantCommentService.modifyRestaurantComment(commentData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[modifyRestaurantComment] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 댓글 삭제
exports.deleteRestaurantComment = async (req, res, next) => {
    try {
        logger.info(`[deleteRestaurantComment Controller] Request received`);
        logger.info(`[deleteRestaurantComment Controller] Request body: ${JSON.stringify(req.body)}`);
        
        const commentData = req.body;
        
        // 필수 필드 검증 - commentWriter 필수 조건 제거
        if (!commentData.commentIdx || !commentData.commentPw) {
            logger.error(`[deleteRestaurantComment Controller] Required fields missing: commentIdx, commentPw`);
            return res.status(400).json({ error: 'Required fields missing: commentIdx, commentPw' });
        }

        logger.info(`[deleteRestaurantComment Controller] Calling service...`);
        const result = await restaurantCommentService.deleteRestaurantComment(commentData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[deleteRestaurantComment Controller] Error: ${error.message}`);
        logger.error(`[deleteRestaurantComment Controller] Error stack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

