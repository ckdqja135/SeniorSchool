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
