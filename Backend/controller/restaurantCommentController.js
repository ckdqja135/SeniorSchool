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
        const {
            writerId,
            writerPw,
            commentContent,
            boardIdx,
            parentIdx,
            commentParent,  // 프론트엔드에서 보내는 필드명
            commentDepth
        } = req.body;
        
        // 입력값 파싱 및 유효성 검사
        // commentParent: 대댓글인 경우 부모 댓글 인덱스, 일반 댓글인 경우 null (서비스에서 최근 댓글 인덱스 + 1로 설정됨)
        let parsedCommentParent = null;
        if (commentParent !== undefined && commentParent !== null && commentParent !== '') {
            parsedCommentParent = parseInt(commentParent);
        } else if (parentIdx !== undefined && parentIdx !== null && parentIdx !== '') {
            parsedCommentParent = parseInt(parentIdx);
        }
        
        const commentData = {
            writerId,
            writerPw,
            commentContent,
            boardIdx: parseInt(boardIdx),
            commentParent: parsedCommentParent,
            commentDepth: commentDepth !== undefined ? parseInt(commentDepth) : 0
        };
        
        // 필수 필드 검증
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

