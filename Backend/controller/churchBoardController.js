const churchBoardService = require('../service/churchBoardService');
const logger = require('../utils/logger');

exports.getChurchBoards = async (req, res, next) => {
    try {
        const churchIdx = req.query.churchIdx;
        const { id, title, content } = req.query;

        if (!churchIdx) {
            return res.status(400).json({ error: 'churchIdx is required' });
        }

        // 검색 매개변수 구성
        const searchParams = {};
        if (id) searchParams.id = id;
        if (title) searchParams.title = title;
        if (content) searchParams.content = content;

        const boards = await churchBoardService.getChurchBoards(churchIdx, searchParams);
        res.status(200).json(boards);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getChurchBoardDetail = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const detailBoard = await churchBoardService.getChurchBoardDetail(boardIdx);
        res.status(200).json(detailBoard);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.insertChurchBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await churchBoardService.insertChurchBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.correctChurchBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await churchBoardService.correctChurchBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteChurchBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await churchBoardService.deleteChurchBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 게시판 좋아요 토글
exports.toggleChurchBoardLike = async (req, res, next) => {
    try {
        const { boardIdx, isLiked } = req.body;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        if (typeof isLiked !== 'boolean') {
            return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
        }

        const result = await churchBoardService.toggleChurchBoardLike(boardIdx, isLiked);
        res.status(200).json({ 
            success: true, 
            boardIdx: boardIdx,
            isLiked: isLiked,
            likeCount: result.likeCount
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 게시판 좋아요 조회
exports.getChurchBoardLike = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        
        if (!boardId) {
            return res.status(400).json({ error: 'boardId is required' });
        }

        const likeCount = await churchBoardService.getChurchBoardLike(boardId);
        res.status(200).json({ likeCount });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * 최근순으로 게시된 교회 게시글 목록 조회 (교회 정보 포함)
 */
exports.getRecentChurchBoardsWithChurchInfo = async (req, res, next) => {
    try {
        const result = await churchBoardService.getRecentChurchBoardsWithChurchInfo();
        res.status(200).json(result);
    } catch (error) {
        logger.error(`[getRecentChurchBoardsWithChurchInfo] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * 전체 교회의 게시판 조회수 기준 인기 후기 TOP10 조회
 */
exports.getTopViewedChurchBoardsByChurch = async (req, res, next) => {
    try {
        const result = await churchBoardService.getTopViewedChurchBoardsByChurch();
        
        logger.info(`[getTopViewedChurchBoardsByChurch] 전체 교회의 인기 후기 TOP10 조회 성공: ${result.totalCount}개`);
        
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getTopViewedChurchBoardsByChurch] Error: ${error.message}`);
        res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};
