const outsourceService = require('../service/outsourceService');
const logger = require('../utils/logger');

// 외주업체 목록 조회
exports.getOutsources = async (req, res, next) => {
    try {
        const { name, type, location } = req.query;
        
        const searchParams = {};
        if (name) searchParams.name = name;
        if (type) searchParams.type = type;
        if (location) searchParams.location = location;

        const outsources = await outsourceService.getOutsources(searchParams);
        res.status(200).json(outsources);
    } catch (error) {
        logger.error(`[getOutsources] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 상세 조회
exports.getOutsourceDetail = async (req, res, next) => {
    try {
        const { outsourceName, outsourceAddr } = req.query;
        
        // outsourceName, outsourceAddr 중 하나는 필수
        if (!outsourceName && !outsourceAddr) {
            return res.status(400).json({ error: 'outsourceName or outsourceAddr is required' });
        }

        const outsource = await outsourceService.getOutsourceDetail(null, outsourceName, outsourceAddr);
        res.status(200).json(outsource);
    } catch (error) {
        logger.error(`[getOutsourceDetail] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 등록
exports.createOutsource = async (req, res, next) => {
    try {
        const outsourceData = req.body;
        const result = await outsourceService.createOutsource(outsourceData);
        res.status(201).json(result);
    } catch (error) {
        logger.error(`[createOutsource] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 수정
exports.updateOutsource = async (req, res, next) => {
    try {
        const { outsourceIdx } = req.params;
        const outsourceData = req.body;
        
        if (!outsourceIdx) {
            return res.status(400).json({ error: 'outsourceIdx is required' });
        }

        const result = await outsourceService.updateOutsource(outsourceIdx, outsourceData);
        res.status(200).json({ success: true, message: 'Outsource updated successfully', data: result });
    } catch (error) {
        logger.error(`[updateOutsource] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 삭제
exports.deleteOutsource = async (req, res, next) => {
    try {
        const { outsourceIdx } = req.params;
        
        if (!outsourceIdx) {
            return res.status(400).json({ error: 'outsourceIdx is required' });
        }

        const result = await outsourceService.deleteOutsource(outsourceIdx);
        res.status(200).json({ success: true, message: 'Outsource deleted successfully' });
    } catch (error) {
        logger.error(`[deleteOutsource] Error: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 추가 요청 생성
exports.createOutsourceRequest = async (req, res, next) => {
    try {
        const result = await outsourceService.createOutsourceRequest(req.body);
        
        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(409).json(result); // 409 Conflict for duplicate request
        }
    } catch (error) {
        logger.error(`[createOutsourceRequest] Error: ${error.message}`);
        next(error);
    }
};

// 외주업체 후기 목록
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

        const boards = await outsourceService.getOutsourceBoards(outsourceIdx, searchParams);
        res.status(200).json(boards);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 후기 상세보기
exports.getOutsourceBoardDetail = async (req, res, next) => {
    try {
        const boardIdx = req.query.boardIdx;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        const detailBoard = await outsourceService.getOutsourceBoardDetail(boardIdx);
        res.status(200).json(detailBoard);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 후기 등록
exports.insertOutsourceBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await outsourceService.insertOutsourceBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 후기 수정
exports.correctOutsourceBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await outsourceService.correctOutsourceBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 후기 삭제
exports.deleteOutsourceBoard = async (req, res, next) => {
    try {
        const boardData = req.body;
        const result = await outsourceService.deleteOutsourceBoard(boardData);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 후기 좋아요 토글
exports.toggleOutsourceBoardLike = async (req, res, next) => {
    try {
        const { boardIdx, isLiked } = req.body;
        
        if (!boardIdx) {
            return res.status(400).json({ error: 'boardIdx is required' });
        }

        if (typeof isLiked !== 'boolean') {
            return res.status(400).json({ error: 'isLiked must be boolean (true/false)' });
        }

        const result = await outsourceService.toggleOutsourceBoardLike(boardIdx, isLiked);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체 후기 좋아요 조회
exports.getOutsourceBoardLike = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        
        if (!boardId) {
            return res.status(400).json({ error: 'boardId is required' });
        }

        const likeCount = await outsourceService.getOutsourceBoardLike(boardId);
        res.status(200).json({ likeCount });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 최근순으로 게시된 외주업체 후기 목록 조회 (외주업체 정보 포함)
exports.getRecentOutsourceBoardsWithInfo = async (req, res, next) => {
    try {
        const result = await outsourceService.getRecentOutsourceBoardsWithInfo();
        res.status(200).json(result);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 외주업체별로 후기 조회수 기준 인기 후기 TOP10 조회
exports.getTopViewedOutsourceBoardsByOutsource = async (req, res, next) => {
    try {
        const result = await outsourceService.getTopViewedOutsourceBoardsByOutsource();
        res.status(200).json(result);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
