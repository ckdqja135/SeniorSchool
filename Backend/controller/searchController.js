const searchService = require('../service/searchService');
const compService = require('../service/admin/compService');
const churchService = require('../service/churchService');
const outsourceService = require('../service/outsourceService');
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

// 회사 검색 (일반 사용자용)
exports.searchCompany = async (req, res) => {
    try {
        const { compName } = req.query;

        if (!compName) {
            logger.warn("[searchCompany] Missing compName in request");
            return res.status(400).json({ error: "compName is required" });
        }

        const decodedCompName = decodeURIComponent(compName);
        const searchParams = {
            compName: decodedCompName,
            compStatus: 1, // 활성 상태인 회사만 검색
            rowsPerPage: 20,
            currentPage: 1
        };

        const result = await compService.searchComp(searchParams);

        if (result.data.length === 0) {
            return res.status(404).json({ 
                error: "회사를 찾을 수 없습니다.",
                data: []
            });
        }

        return res.status(200).json(result);
    } catch (error) {
        logger.error(`[searchCompany] ${error.message}`);
        return res.status(500).json({ 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

// 회사 상세보기 (일반 유저용) - 이름 기반
exports.getCompanyDetail = async (req, res) => {
    try {
        const { compName } = req.query;

        if (!compName) {
            logger.warn("[getCompanyDetail] Missing compName in request");
            return res.status(400).json({ error: "compName is required" });
        }

        const decodedCompName = decodeURIComponent(compName);
        const result = await compService.getCompDetailByName(decodedCompName);

        if (result.status === 404) {
            return res.status(404).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        logger.error(`[getCompanyDetail] ${error.message}`);
        return res.status(500).json({ 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};

// 교회 자동 검색
exports.autoCompleteChurch = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            logger.warn("[autoCompleteChurch] Missing keyword in request");
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const decodedKeyword = decodeURIComponent(keyword);
        const churches = await churchService.autoComplete(decodedKeyword);

        return res.status(200).json(churches);
    } catch (error) {
        logger.error(`[autoCompleteChurch] ${error.message}`);
        return res.status(500).json({ error: error });
    }
};

// 외주업체 자동 완성 검색
exports.autoCompleteOutsource = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            logger.warn("[autoCompleteOutsource] Missing keyword in request");
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const decodedKeyword = decodeURIComponent(keyword);
        const outsources = await outsourceService.autoComplete(decodedKeyword);

        return res.status(200).json(outsources);
    } catch (error) {
        logger.error(`[autoCompleteOutsource] ${error.message}`);
        return res.status(500).json({ error: error });
    }
};

// 교회 정보 조회
exports.getChurchInfo = async (req, res) => {
    try {
        const { churchName } = req.query;

        if (!churchName) {
            logger.warn("[getChurchInfo] Missing churchName in request");
            return res.status(400).json({ error: "churchName is required" });
        }

        const decodedChurchName = decodeURIComponent(churchName);
        const churchInfo = await churchService.getChurchInfoByName(decodedChurchName);

        if (!churchInfo) {
            return res.status(404).json({ error: "Church not found" });
        }

        return res.status(200).json(churchInfo);
    } catch (error) {
        logger.error(`[getChurchInfo] ${error.message}`);
        return res.status(500).json({ error: error });
    }
};

// 교회 조회수 높은 순으로 상위 10개 교회 조회
exports.getTopViewedChurches = async (req, res) => {
    try {
        const result = await churchService.getTopViewedChurches();
        
        logger.info(`[getTopViewedChurches] 상위 10개 교회 조회 성공: ${result.totalCount}개`);
        
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getTopViewedChurches] Error: ${error.message}`);
        return res.status(500).json({ 
            status: 500, 
            error: '서버 오류가 발생했습니다.',
            message: error.message 
        });
    }
};
