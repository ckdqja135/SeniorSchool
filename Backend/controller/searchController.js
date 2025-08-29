const searchService = require('../service/searchService');
const logger = require('../utils/logger');

exports.autoComplete = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            logger.warn("[autoComplete] Missing keyword in request");
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const decodedKeyword = decodeURIComponent(keyword);
        const schools = await searchService.autoComplete(decodedKeyword);

        return res.status(200).json(schools);
    } catch (error) {
        logger.error(`[autoComplete] ${error.message}`);
        return res.status(500).json({ error: error });
    }
};

exports.getSchoolInfo = async (req, res) => {
    try {
        
        const { univName } = req.query;

        if (!univName) {
            logger.warn("[getSchoolInfo] Missing univName in request");
            return res.status(400).json({ error: "univName is required" });
        }

        const decodedUnivName = decodeURIComponent(univName);
        const schoolInfo = await searchService.getSchoolInfo(decodedUnivName);

        if (!schoolInfo) {
            return res.status(404).json({ error: "University not found" });
        }

        return res.status(200).json(schoolInfo);
    } catch (error) {
        logger.error(`[getSchoolInfo] ${error.message}`);
        return res.status(500).json({ error: error });
    }
};

// univViewCount 높은 순으로 상위 10개 대학교 조회
exports.getTopViewedUniversities = async (req, res) => {
    try {
        const result = await searchService.getTopViewedUniversities();
        
        logger.info(`[getTopViewedUniversities] 상위 10개 대학교 조회 성공: ${result.totalCount}개`);
        
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getTopViewedUniversities] Error: ${error.message}`);
        return res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};
