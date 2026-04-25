const compService = require('../../service/admin/compService');
const externalApiService = require('../../service/externalApiService');
const businessRegistry = require('../../service/businessRegistryService');
const logger = require('../../utils/logger');

// 사업자번호 휴폐업·진위 검증 (어드민 등록폼에서 호출)
exports.validateBusiness = async (req, res) => {
    try {
        const { bizNo, b_no, ceoName, p_nm, startDate, start_dt } = req.body || {};
        const num = bizNo || b_no;
        if (!num) {
            return res.status(400).json({ status: 400, ok: false, message: '사업자번호(bizNo)가 필요합니다.' });
        }

        // 진위확인까지 원하면 ceoName + startDate 같이 보냄. 없으면 휴폐업만 체크.
        if ((ceoName || p_nm) && (startDate || start_dt)) {
            const [validateResult] = await businessRegistry.validateBusiness([{
                b_no: num,
                p_nm: ceoName || p_nm,
                start_dt: startDate || start_dt,
            }]);
            const status = await businessRegistry.checkSingleBusiness(num);
            return res.status(200).json({
                status: 200,
                ok: status.ok && validateResult?.valid === true,
                businessStatus: status,
                identityValidation: validateResult || null,
            });
        }

        // 휴폐업만 체크 (어드민이 빠르게 차단 여부만 확인하는 케이스)
        const result = await businessRegistry.checkSingleBusiness(num);
        return res.status(200).json({ status: 200, ...result });
    } catch (err) {
        logger.error(`[validateBusiness] Error: ${err.message}`);
        return res.status(500).json({ status: 500, ok: false, message: '서버 오류가 발생했습니다.' });
    }
};

// 회사 생성
exports.createComp = async (req, res, next) => {
    try {
        const result = await compService.createComp(req.body);
        
        // 배열인 경우 길이, 단일 객체인 경우 1로 처리
        const insertCount = Array.isArray(result) ? result.length : 1;
        
        return res.status(201).json({
            insert: insertCount,
            success: true
        });
    } catch (e) {
        next(e);
    }
};

// 회사 검색 (관리자용)
exports.searchComp = async (req, res) => {
    try {
        const data = req.query;
        logger.info(`[searchComp] Request query: ${JSON.stringify(data)}`);
        
        const result = await compService.searchComp(data);
        logger.info(`[searchComp] Success: ${result.totalCount} results found`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[searchComp] Error: ${error.message}`);
        logger.error(`[searchComp] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 회사 추가 요청 목록 조회 (관리자용)
exports.getCompRequests = async (req, res) => {
    try {
        const data = req.query;
        logger.info(`[getCompRequests] Request query: ${JSON.stringify(data)}`);

        const result = await compService.getCompRequests(data);
        logger.info(`[getCompRequests] Success: ${result.totalCount} requests found`);

        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getCompRequests] Error: ${error.message}`);
        logger.error(`[getCompRequests] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 회사 추가 요청 상태 업데이트 (관리자만)
exports.updateCompRequestStatus = async (req, res, next) => {
    try {
        const { requestIdx } = req.params;
        const { status, adminNote } = req.body;

        logger.info(`[updateCompRequestStatus] Updating requestIdx: ${requestIdx}, status: ${status}`);

        const result = await compService.updateCompRequestStatus(requestIdx, status, adminNote);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateCompRequestStatus] Error: ${error.message}`);
        next(error);
    }
};

// 회사 상세보기 (idx 기반)
exports.getCompDetail = async (req, res) => {
    const { compIdx } = req.params;

    try {
        const result = await compService.getCompDetail(compIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[getCompDetail] Error: ${error.message}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 회사 수정
exports.putCompData = async (req, res) => {
    const { compIdx } = req.params;
    const updateData = req.body;

    try {
        logger.info(`[putCompData] Updating compIdx: ${compIdx}`);
        logger.info(`[putCompData] Update data: ${JSON.stringify(updateData)}`);

        const result = await compService.putCompData(compIdx, updateData);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[putCompData] Error: ${error.message}`);
        logger.error(`[putCompData] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 회사 삭제
exports.deleteComp = async (req, res) => {
    const { compIdx } = req.params;

    try {
        logger.info(`[deleteComp] Deleting compIdx: ${compIdx}`);

        const result = await compService.deleteComp(compIdx);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[deleteComp] Error: ${error.message}`);
        logger.error(`[deleteComp] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 회사 상태 변경 (활성/비활성)
exports.updateCompStatus = async (req, res) => {
    const { compIdx } = req.params;
    const { compStatus } = req.body;

    try {
        logger.info(`[updateCompStatus] Updating compIdx: ${compIdx}, status: ${compStatus}`);

        const result = await compService.updateCompStatus(compIdx, compStatus);
        res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[updateCompStatus] Error: ${error.message}`);
        logger.error(`[updateCompStatus] Stack trace: ${error.stack}`);
        res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
};

// 회사 통계 정보 업데이트 (외부 API 연동)
exports.updateCompStatistics = async (req, res) => {
    const { compIdx } = req.params;
    const { compName, businessNumber, year, quarter } = req.body;

    try {
        logger.info(`[updateCompStatistics] Updating statistics for compIdx: ${compIdx}`);

        const result = await externalApiService.updateCompanyStatistics(
            compIdx,
            compName,
            businessNumber,
            year || new Date().getFullYear(),
            quarter
        );

        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        logger.error(`[updateCompStatistics] Error: ${error.message}`);
        logger.error(`[updateCompStatistics] Stack trace: ${error.stack}`);
        res.status(500).json({ 
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};

// 여러 회사 통계 정보 일괄 업데이트
exports.batchUpdateCompStatistics = async (req, res) => {
    const { companies } = req.body;

    try {
        logger.info(`[batchUpdateCompStatistics] Starting batch update for ${companies.length} companies`);

        const result = await externalApiService.batchUpdateCompanyStatistics(companies);

        res.status(200).json({
            success: true,
            message: '일괄 업데이트가 완료되었습니다.',
            data: result
        });
    } catch (error) {
        logger.error(`[batchUpdateCompStatistics] Error: ${error.message}`);
        logger.error(`[batchUpdateCompStatistics] Stack trace: ${error.stack}`);
        res.status(500).json({ 
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};
