const outsourceBoardService = require('../service/outsourceBoardService');
const logger = require('../utils/logger');

// 외주업체 게시판 목록
exports.getOutsourceBoards = async (req, res, next) => {
    try {
        const outsourceIdx = req.query.outsourceIdx;
        const { id, title, content } = req.query;

        if (!outsourceIdx) {
            return res.status(400).json({ error: 'outsourceIdx is required' });
        }

        // 검색 매개변수 구성
        const searchParams = {};
        if (id) searchParams.id = id;
        if (title) searchParams.title = title;
        if (content) searchParams.content = content;

        const boards = await outsourceBoardService.getOutsourceBoards(outsourceIdx, searchParams);
        res.status(200).json(boards);
    } catch (error) {
        logger.error(`[getOutsourceBoards] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 게시판 상세보기
exports.getOutsourceBoardDetail = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const detailBoard = await outsourceBoardService.getOutsourceBoardDetail(boardIdx);
        res.status(200).json(detailBoard);
    } catch (error) {
        logger.error(`[getOutsourceBoardDetail] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 게시판 등록
exports.insertOutsourceBoard = async (req, res, next) => {
    try {
        logger.info(`[insertOutsourceBoard Controller] Request received`);
        logger.info(`[insertOutsourceBoard Controller] Request body: ${JSON.stringify(req.body)}`);
        
        const boardData = req.body;
        
        if (!boardData) {
            logger.error(`[insertOutsourceBoard Controller] boardData is null or undefined`);
            return res.status(400).json({ error: 'Request body is required' });
        }
        
        logger.info(`[insertOutsourceBoard Controller] Calling service...`);
        const result = await outsourceBoardService.insertOutsourceBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[insertOutsourceBoard Controller] Error: ${error.message}`);
        logger.error(`[insertOutsourceBoard Controller] Error stack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 게시판 수정
exports.correctOutsourceBoard = async (req, res, next) => {
    try {
        logger.info(`[correctOutsourceBoard Controller] Request received`);
        logger.info(`[correctOutsourceBoard Controller] Request body: ${JSON.stringify(req.body)}`);
        
        const boardData = req.body;
        
        if (!boardData) {
            logger.error(`[correctOutsourceBoard Controller] boardData is null or undefined`);
            return res.status(400).json({ error: 'Request body is required' });
        }
        
        logger.info(`[correctOutsourceBoard Controller] Calling service...`);
        const result = await outsourceBoardService.correctOutsourceBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[correctOutsourceBoard Controller] Error: ${error.message}`);
        logger.error(`[correctOutsourceBoard Controller] Error stack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 게시판 삭제
exports.deleteOutsourceBoard = async (req, res, next) => {
    try {
        logger.info(`[deleteOutsourceBoard Controller] Request received`);
        logger.info(`[deleteOutsourceBoard Controller] Request body: ${JSON.stringify(req.body)}`);
        
        const boardData = req.body;
        
        if (!boardData) {
            logger.error(`[deleteOutsourceBoard Controller] boardData is null or undefined`);
            return res.status(400).json({ error: 'Request body is required' });
        }
        
        logger.info(`[deleteOutsourceBoard Controller] Calling service...`);
        const result = await outsourceBoardService.deleteOutsourceBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(`[deleteOutsourceBoard Controller] Error: ${error.message}`);
        logger.error(`[deleteOutsourceBoard Controller] Error stack: ${error.stack}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 게시판 좋아요 토글
exports.toggleOutsourceBoardLike = async (req, res, next) => {
    try {
        const { boardIdx, isLiked } = req.body;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        if (typeof isLiked !== 'boolean') {
            return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
        }

        const result = await outsourceBoardService.toggleOutsourceBoardLike(boardIdx, isLiked);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        logger.error(`[toggleOutsourceBoardLike] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 게시판 좋아요 조회
exports.getOutsourceBoardLike = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        
        if (!boardId) {
            return res.status(400).json({ error: 'boardId is required' });
        }

        const likeCount = await outsourceBoardService.getOutsourceBoardLike(boardId);
        res.status(200).json({ likeCount });
    } catch (error) {
        logger.error(`[getOutsourceBoardLike] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 최근순으로 게시된 외주업체 게시글 목록 조회 (외주업체 정보 포함)
exports.getRecentOutsourceBoardsWithOutsourceInfo = async (req, res, next) => {
    try {
        const result = await outsourceBoardService.getRecentOutsourceBoardsWithOutsourceInfo();
        res.status(200).json(result);
    } catch (error) {
        logger.error(`[getRecentOutsourceBoardsWithOutsourceInfo] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

