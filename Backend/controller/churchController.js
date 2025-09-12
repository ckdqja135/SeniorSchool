const churchService = require('../service/churchService');
const logger = require('../utils/logger');

// 교회 목록 조회
exports.getChurches = async (req, res, next) => {
    try {
        const { name, type, location } = req.query;
        
        const searchParams = {};
        if (name) searchParams.name = name;
        if (type) searchParams.type = type;
        if (location) searchParams.location = location;

        const churches = await churchService.getChurches(searchParams);
        res.status(200).json(churches);
    } catch (error) {
        logger.error(`[getChurches] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 상세 조회
exports.getChurchDetail = async (req, res, next) => {
    try {
        const { churchName, churchAddr } = req.query;
        
        // churchName, churchAddr 중 하나는 필수
        if (!churchName && !churchAddr) {
            return res.status(400).json({ error: 'churchName or churchAddr is required' });
        }

        const church = await churchService.getChurchDetail(null, churchName, churchAddr);
        res.status(200).json(church);
    } catch (error) {
        logger.error(`[getChurchDetail] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 등록
exports.createChurch = async (req, res, next) => {
    try {
        const churchData = req.body;
        const result = await churchService.createChurch(churchData);
        res.status(201).json(result);
    } catch (error) {
        logger.error(`[createChurch] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 수정
exports.updateChurch = async (req, res, next) => {
    try {
        const { churchIdx } = req.params;
        const churchData = req.body;
        
        if (!churchIdx) {
            return res.status(400).json({ error: 'churchIdx is required' });
        }

        const result = await churchService.updateChurch(churchIdx, churchData);
        res.status(200).json({ success: true, message: 'Church updated successfully', data: result });
    } catch (error) {
        logger.error(`[updateChurch] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 삭제
exports.deleteChurch = async (req, res, next) => {
    try {
        const { churchIdx } = req.params;
        
        if (!churchIdx) {
            return res.status(400).json({ error: 'churchIdx is required' });
        }

        const result = await churchService.deleteChurch(churchIdx);
        res.status(200).json({ success: true, message: 'Church deleted successfully' });
    } catch (error) {
        logger.error(`[deleteChurch] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 추가 요청 생성
exports.createChurchRequest = async (req, res, next) => {
    try {
        const result = await churchService.createChurchRequest(req.body);
        
        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(409).json(result); // 409 Conflict for duplicate request
        }
    } catch (error) {
        logger.error(`[createChurchRequest] Error: ${error.message}`);
        next(error);
    }
};

// 교회 후기 목록
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

        const boards = await churchService.getChurchBoards(churchIdx, searchParams);
        res.status(200).json(boards);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 후기 상세보기
exports.getChurchBoardDetail = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const detailBoard = await churchService.getChurchBoardDetail(boardIdx);
        res.status(200).json(detailBoard);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 후기 등록
exports.insertChurchBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await churchService.insertChurchBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 후기 수정
exports.correctChurchBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await churchService.correctChurchBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 후기 삭제
exports.deleteChurchBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await churchService.deleteChurchBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 후기 좋아요 토글
exports.toggleChurchBoardLike = async (req, res, next) => {
    try {
        const { boardIdx, isLiked } = req.body;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        if (typeof isLiked !== 'boolean') {
            return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
        }

        const result = await churchService.toggleChurchBoardLike(boardIdx, isLiked);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회 후기 좋아요 조회
exports.getChurchBoardLike = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        
        if (!boardId) {
            return res.status(400).json({ error: 'boardId is required' });
        }

        const likeCount = await churchService.getChurchBoardLike(boardId);
        res.status(200).json({ likeCount });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 최근순으로 게시된 교회 후기 목록 조회 (교회 정보 포함)
exports.getRecentChurchBoardsWithInfo = async (req, res, next) => {
    try {
        const result = await churchService.getRecentChurchBoardsWithInfo();
        res.status(200).json(result);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 교회별로 후기 조회수 기준 인기 후기 TOP10 조회
exports.getTopViewedChurchBoardsByChurch = async (req, res, next) => {
    try {
        const result = await churchService.getTopViewedChurchBoardsByChurch();
        res.status(200).json(result);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
