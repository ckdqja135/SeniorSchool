const restaurantBoardService = require('../service/restaurantBoardService');
const logger = require('../utils/logger');

// 식당 게시판 목록
exports.getRestaurantBoards = async (req, res, next) => {
    try {
        const restaurantIdx = req.query.restaurantIdx;
        const { id, title, content } = req.query;

        if (!restaurantIdx) {
            return res.status(400).json({ error: 'restaurantIdx is required' });
        }

        // 검색 매개변수 구성
        const searchParams = {};
        if (id) searchParams.id = id;
        if (title) searchParams.title = title;
        if (content) searchParams.content = content;

        const boards = await restaurantBoardService.getRestaurantBoards(restaurantIdx, searchParams);
        res.status(200).json(boards);
    } catch (error) {
        logger.error(`[getRestaurantBoards] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 게시판 상세보기
exports.getRestaurantBoardDetail = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const detailBoard = await restaurantBoardService.getRestaurantBoardDetail(boardIdx);
        res.status(200).json(detailBoard);
    } catch (error) {
        logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 게시판 등록
exports.insertRestaurantBoard = async (req, res, next) => {
    try {
        logger.info(`[insertRestaurantBoard Controller] Request received`);
        logger.info(`[insertRestaurantBoard Controller] Request body: ${JSON.stringify(req.body)}`);
        
        const boardData = req.body;
        
        if (!boardData) {
            logger.error(`[insertRestaurantBoard Controller] boardData is null or undefined`);
            return res.status(400).json({ error: 'Request body is required' });
        }
        
        logger.info(`[insertRestaurantBoard Controller] Calling service...`);
        const result = await restaurantBoardService.insertRestaurantBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[insertRestaurantBoard Controller] Error: ${error.message}`);
        logger.error(`[insertRestaurantBoard Controller] Error stack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 게시판 수정
exports.correctRestaurantBoard = async (req, res, next) => {
    try {
        logger.info(`[correctRestaurantBoard Controller] Request received`);
        logger.info(`[correctRestaurantBoard Controller] Request body: ${JSON.stringify(req.body)}`);
        
        const boardData = req.body;
        
        if (!boardData) {
            logger.error(`[correctRestaurantBoard Controller] boardData is null or undefined`);
            return res.status(400).json({ error: 'Request body is required' });
        }
        
        logger.info(`[correctRestaurantBoard Controller] Calling service...`);
        const result = await restaurantBoardService.correctRestaurantBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[correctRestaurantBoard Controller] Error: ${error.message}`);
        logger.error(`[correctRestaurantBoard Controller] Error stack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 게시판 삭제
exports.deleteRestaurantBoard = async (req, res, next) => {
    try {
        logger.info(`[deleteRestaurantBoard Controller] Request received`);
        logger.info(`[deleteRestaurantBoard Controller] Request body: ${JSON.stringify(req.body)}`);
        
        const boardData = req.body;
        
        if (!boardData) {
            logger.error(`[deleteRestaurantBoard Controller] boardData is null or undefined`);
            return res.status(400).json({ error: 'Request body is required' });
        }
        
        logger.info(`[deleteRestaurantBoard Controller] Calling service...`);
        const result = await restaurantBoardService.deleteRestaurantBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[deleteRestaurantBoard Controller] Error: ${error.message}`);
        logger.error(`[deleteRestaurantBoard Controller] Error stack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 게시판 좋아요 토글
exports.toggleRestaurantBoardLike = async (req, res, next) => {
    try {
        const { boardIdx, isLiked } = req.body;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        if (typeof isLiked !== 'boolean') {
            return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
        }

        const result = await restaurantBoardService.toggleRestaurantBoardLike(boardIdx, isLiked);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        logger.error(`[toggleRestaurantBoardLike] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당 게시판 좋아요 조회
exports.getRestaurantBoardLike = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        
        if (!boardId) {
            return res.status(400).json({ error: 'boardId is required' });
        }

        const likeCount = await restaurantBoardService.getRestaurantBoardLike(boardId);
        res.status(200).json({ likeCount });
    } catch (error) {
        logger.error(`[getRestaurantBoardLike] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 최근순으로 게시된 식당 게시글 목록 조회 (식당 정보 포함)
exports.getRecentRestaurantBoardsWithRestaurantInfo = async (req, res, next) => {
    try {
        const result = await restaurantBoardService.getRecentRestaurantBoardsWithRestaurantInfo();
        res.status(200).json(result);
    } catch (error) {
        logger.error(`[getRecentRestaurantBoardsWithRestaurantInfo] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 식당별로 게시판 조회수 기준 인기 후기 TOP10 조회
exports.getTopViewedRestaurantBoardsByRestaurant = async (req, res, next) => {
    try {
        const result = await restaurantBoardService.getTopViewedRestaurantBoardsByRestaurant();
        res.status(200).json(result);
    } catch (error) {
        logger.error(`[getTopViewedRestaurantBoardsByRestaurant] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

