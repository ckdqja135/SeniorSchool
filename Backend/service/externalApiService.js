const axios = require('axios');
const { CompStatistics } = require('../model/index');
const logger = require('../utils/logger');
const AdmZip = require('adm-zip');

/**
 * 외부 API 연동 서비스 (고도화 버전)
 * 회사 통계 정보를 외부 API에서 가져와서 DB에 저장
 * - 재시도 로직
 * - 캐싱
 * - Rate Limiting
 * - 에러 핸들링
 */

class ExternalApiService {
    constructor() {
        // API 설정 (환경변수로 관리)
        this.apis = {
            // OpenDart API (금융감독원) - 상장회사 정보
            openDart: {
                name: 'OpenDart',
                baseUrl: process.env.OPENDART_API_URL || 'https://opendart.fss.or.kr/api',
                apiKey: process.env.OPENDART_API_KEY,
                timeout: 15000,
                retryCount: 3,
                retryDelay: 1000,
                rateLimit: {
                    maxRequests: 10,
                    perMilliseconds: 1000
                }
            },
            // 통계청 KOSIS API - 산업별 통계
            kosis: {
                name: 'KOSIS',
                baseUrl: process.env.KOSIS_API_URL || 'https://kosis.kr/openapi',
                apiKey: process.env.KOSIS_API_KEY,
                timeout: 15000,
                retryCount: 3,
                retryDelay: 1000,
                rateLimit: {
                    maxRequests: 5,
                    perMilliseconds: 1000
                }
            },
            // 공공데이터포털 API
            publicData: {
                name: 'Public Data',
                baseUrl: process.env.PUBLIC_DATA_API_URL || 'https://apis.data.go.kr',
                apiKey: process.env.PUBLIC_DATA_API_KEY,
                timeout: 15000,
                retryCount: 3,
                retryDelay: 1000,
                rateLimit: {
                    maxRequests: 10,
                    perMilliseconds: 1000
                }
            }
        };

        // Rate Limiting을 위한 요청 큐
        this.requestQueues = {};
        Object.keys(this.apis).forEach(apiName => {
            this.requestQueues[apiName] = [];
        });

        // 캐시 저장소 (간단한 메모리 캐시)
        this.cache = new Map();
        this.cacheExpiry = 1000 * 60 * 30; // 30분
    }

    /**
     * 캐시에서 데이터 조회
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            logger.info(`[Cache] Hit: ${key}`);
            return cached.data;
        }
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }

    /**
     * 캐시에 데이터 저장
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        logger.info(`[Cache] Set: ${key}`);
    }

    /**
     * Rate Limiting을 적용한 API 요청
     */
    async rateLimitedRequest(apiName, requestFn) {
        const api = this.apis[apiName];
        if (!api) {
            throw new Error(`Unknown API: ${apiName}`);
        }

        return new Promise((resolve, reject) => {
            const queue = this.requestQueues[apiName];
            
            // 요청을 큐에 추가
            queue.push({ requestFn, resolve, reject, timestamp: Date.now() });
            
            // 큐 처리
            this.processQueue(apiName);
        });
    }

    /**
     * 큐 처리 (Rate Limiting 적용)
     */
    async processQueue(apiName) {
        const api = this.apis[apiName];
        const queue = this.requestQueues[apiName];
        
        if (queue.length === 0) return;

        const now = Date.now();
        const { maxRequests, perMilliseconds } = api.rateLimit;
        
        // 최근 요청 중 제한 시간 내의 요청만 필터링
        const recentRequests = queue.filter(req => 
            now - req.timestamp < perMilliseconds
        );

        // Rate Limit 체크
        if (recentRequests.length >= maxRequests) {
            const oldestRequest = recentRequests[0];
            const waitTime = perMilliseconds - (now - oldestRequest.timestamp);
            
            logger.warn(`[Rate Limit] ${apiName}: waiting ${waitTime}ms`);
            setTimeout(() => this.processQueue(apiName), waitTime);
            return;
        }

        // 큐에서 요청 꺼내기
        const request = queue.shift();
        if (!request) return;

        try {
            const result = await request.requestFn();
            request.resolve(result);
        } catch (error) {
            request.reject(error);
        }

        // 다음 요청 처리
        if (queue.length > 0) {
            setTimeout(() => this.processQueue(apiName), 100);
        }
    }

    /**
     * 재시도 로직이 적용된 API 요청
     */
    async requestWithRetry(apiName, requestFn, retryCount = null) {
        const api = this.apis[apiName];
        const maxRetries = retryCount !== null ? retryCount : api.retryCount;
        
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`[${api.name}] Request attempt ${attempt}/${maxRetries}`);
                return await this.rateLimitedRequest(apiName, requestFn);
            } catch (error) {
                lastError = error;
                logger.warn(`[${api.name}] Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < maxRetries) {
                    const delay = api.retryDelay * attempt;
                    logger.info(`[${api.name}] Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * 회사 통계 정보를 외부 API에서 가져와서 업데이트
     * @param {number} compIdx - 회사 인덱스
     * @param {string} compName - 회사명
     * @param {string} businessNumber - 사업자등록번호 (선택)
     * @param {number} year - 조회할 연도
     * @param {number} quarter - 조회할 분기 (선택)
     * @returns {Object} 업데이트 결과
     */
    async updateCompanyStatistics(compIdx, compName, businessNumber = null, year = new Date().getFullYear(), quarter = null) {
        try {
            logger.info(`[updateCompanyStatistics] Starting update for compIdx: ${compIdx}, company: ${compName}`);

            // 1. 여러 API에서 데이터 수집
            const statisticsData = await this.collectStatisticsFromAPIs(compName, businessNumber, year, quarter);

            if (!statisticsData || Object.keys(statisticsData).length === 0) {
                logger.warn(`[updateCompanyStatistics] No data found for company: ${compName}`);
                return {
                    success: false,
                    message: '외부 API에서 데이터를 찾을 수 없습니다.',
                    data: null
                };
            }

            // 2. 기존 데이터 확인
            const existingData = await CompStatistics.findOne({
                where: {
                    compIdx: compIdx,
                    year: year,
                    quarter: quarter
                }
            });

            let result;
            if (existingData) {
                // 3. 기존 데이터 업데이트
                await existingData.update({
                    ...statisticsData,
                    lastUpdated: new Date(),
                    modDate: new Date()
                });
                result = existingData;
                logger.info(`[updateCompanyStatistics] Updated existing data for compIdx: ${compIdx}`);
            } else {
                // 4. 새 데이터 생성
                result = await CompStatistics.create({
                    compIdx: compIdx,
                    year: year,
                    quarter: quarter,
                    ...statisticsData,
                    lastUpdated: new Date()
                });
                logger.info(`[updateCompanyStatistics] Created new data for compIdx: ${compIdx}`);
            }

            return {
                success: true,
                message: '회사 통계 정보가 성공적으로 업데이트되었습니다.',
                data: result
            };

        } catch (error) {
            logger.error(`[updateCompanyStatistics] Error: ${error.message}`);
            logger.error(`[updateCompanyStatistics] Stack trace: ${error.stack}`);
            throw error;
        }
    }

    /**
     * 여러 외부 API에서 통계 데이터 수집
     * @param {string} compName - 회사명
     * @param {string} businessNumber - 사업자등록번호
     * @param {number} year - 연도
     * @param {number} quarter - 분기
     * @returns {Object} 수집된 통계 데이터
     */
    async collectStatisticsFromAPIs(compName, businessNumber, year, quarter) {
        // 캐시 키 생성 (사업자등록번호 포함)
        const cacheKey = `statistics_${compName}_${businessNumber || 'no_biz'}_${year}_${quarter}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        const collectedData = {};
        const apiResponses = {};
        const errors = [];

        try {
            // 병렬 처리로 성능 향상
            const apiPromises = [
                this.getCompanyDataFromOpenDart(compName, businessNumber)
                    .then(data => ({ api: 'openDart', data }))
                    .catch(error => {
                        errors.push({ api: 'openDart', error: error.message });
                        return null;
                    }),
                
                this.getIndustryDataFromKosis(compName, businessNumber)
                    .then(data => ({ api: 'kosis', data }))
                    .catch(error => {
                        errors.push({ api: 'kosis', error: error.message });
                        return null;
                    }),
                
                this.getPublicDataFromAPI(compName, businessNumber)
                    .then(data => ({ api: 'publicData', data }))
                    .catch(error => {
                        errors.push({ api: 'publicData', error: error.message });
                        return null;
                    })
            ];

            const results = await Promise.all(apiPromises);
            
            // 결과 처리
            results.forEach(result => {
                if (!result || !result.data) return;

                const { api, data } = result;
                apiResponses[api] = data;

                // OpenDart 데이터 처리
                if (api === 'openDart') {
                    Object.assign(collectedData, {
                        companyName: data.companyName,
                        businessNumber: data.businessNumber,
                        industry: data.industry,
                        listingDate: data.listingDate,
                        marketCap: data.marketCap,
                        employeeCount: data.employeeCount,
                        revenue: data.revenue,
                        profit: data.profit,
                        assets: data.assets,
                        liabilities: data.liabilities,
                        isListed: true,
                        dataSource: 'OpenDart API'
                    });
                }

                // KOSIS 데이터 처리
                if (api === 'kosis') {
                    Object.assign(collectedData, {
                        industryTurnoverRate: data.industryTurnoverRate,
                        industryAvgSalary: data.industryAvgSalary,
                        industryEmployeeCount: data.industryEmployeeCount,
                        regionTurnoverRate: data.regionTurnoverRate
                    });
                    collectedData.dataSource = collectedData.dataSource ? 
                        `${collectedData.dataSource}, KOSIS API` : 'KOSIS API';
                }

                // 공공데이터 처리
                if (api === 'publicData') {
                    Object.assign(collectedData, {
                        regionEmploymentStats: data.regionEmploymentStats,
                        industryGrowthRate: data.industryGrowthRate,
                        economicIndicators: data.economicIndicators
                    });
                    collectedData.dataSource = collectedData.dataSource ? 
                        `${collectedData.dataSource}, Public Data API` : 'Public Data API';
                }
            });

            // 원본 API 응답 및 에러 정보 저장
            collectedData.apiResponseData = apiResponses;
            if (errors.length > 0) {
                collectedData.apiErrors = errors;
            }

            logger.info(`[collectStatisticsFromAPIs] Collected data from ${Object.keys(apiResponses).length} APIs (${errors.length} errors)`);
            
            // 캐시 저장
            this.setCache(cacheKey, collectedData);
            
            return collectedData;

        } catch (error) {
            logger.error(`[collectStatisticsFromAPIs] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * OpenDart API에서 상장회사 정보 조회
     * @param {string} compName - 회사명
     * @param {string} businessNumber - 사업자등록번호 (선택)
     * @returns {Object} 상장회사 정보
     */
    async getCorpCode(compName) {
        if (!compName || typeof compName !== 'string') {
            throw new Error('compName은 문자열이어야 합니다.');
        }

        if (!this.apis.openDart.apiKey) {
            logger.warn('[getCorpCode] OPENDART_API_KEY 미설정');
            return null;
        }

        const normalizedName = compName.trim();
        const cacheKey = `corpcode_${normalizedName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const corpCode = await this.requestWithRetry('openDart', async () => {
                const corpListResponse = await axios.get(`${this.apis.openDart.baseUrl}/list.json`, {
                    params: {
                        crtfc_key: this.apis.openDart.apiKey,
                        corp_name: normalizedName
                    },
                    timeout: this.apis.openDart.timeout,
                    validateStatus: () => true
                });

                if (corpListResponse.status !== 200) {
                    throw new Error(`OpenDart 응답 상태 코드: ${corpListResponse.status}`);
                }

                const { status, list, message } = corpListResponse.data || {};
                if (status !== '000' || !Array.isArray(list) || list.length === 0) {
                    logger.warn(`[getCorpCode] 회사명을 찾지 못했습니다: ${normalizedName} (${message || 'no message'})`);
                    return null;
                }

                const exactMatch = list.find(corp =>
                    corp.corp_name === normalizedName ||
                    corp.corp_name === `${normalizedName}주식회사` ||
                    corp.corp_name === `주식회사${normalizedName}` ||
                    corp.corp_name === `(주)${normalizedName}`
                );

                const partialMatch = !exactMatch ? list.find(corp => corp.corp_name.includes(normalizedName)) : null;
                const target = exactMatch || partialMatch || list[0];

                if (!target?.corp_code) {
                    logger.warn(`[getCorpCode] corp_code가 없는 결과입니다: ${normalizedName}`);
                    return null;
                }

                logger.info(`[getCorpCode] corp_code ${target.corp_code} (matched: ${target.corp_name})`);
                return target.corp_code;
            });

            if (corpCode) {
                this.setCache(cacheKey, corpCode);
            }

            return corpCode;
        } catch (error) {
            logger.error(`[getCorpCode] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * OpenDart API에서 상장회사 정보 조회
     * @param {string} compName - 회사명
     * @param {string} businessNumber - 사업자등록번호 (선택)
     * @returns {Object} 상장회사 정보
     */
    async getCompanyDataFromOpenDart(compName, businessNumber = null, year = null, existingCorpCode = null) {
        if (!this.apis.openDart.apiKey) {
            logger.warn(`[getCompanyDataFromOpenDart] API Key not configured`);
            return null;
        }

        try {
            // 캐시 확인 (사업자등록번호 포함)
            const cacheKey = `opendart_${compName}_${businessNumber || 'no_biz'}_${year || 'current'}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // 1단계: DB에 corpCode가 있으면 바로 사용, 없으면 corpCode.xml에서 조회
            const corpCode = existingCorpCode || await this.getCorpCode(compName);
            if (!corpCode) {
                logger.warn(`[getCompanyDataFromOpenDart] No corp_code found for: ${compName}`);
                return null;
            }

            logger.info(`[getCompanyDataFromOpenDart] Using corp_code: ${corpCode} for ${compName}`);

            // 재시도 로직 적용
            const data = await this.requestWithRetry('openDart', async () => {

                // 2단계: 회사 개황 정보 조회
                const companyResponse = await axios.get(`${this.apis.openDart.baseUrl}/company.json`, {
                    params: {
                        crtfc_key: this.apis.openDart.apiKey,
                        corp_code: corpCode
                    },
                    timeout: this.apis.openDart.timeout
                });

                if (companyResponse.data.status !== '000') {
                    logger.warn(`[getCompanyDataFromOpenDart] API Error: ${companyResponse.data.message}`);
                    return null;
                }

                const company = companyResponse.data;
                
                // 3단계: 직원 및 재무정보 조회 (reprt_code fallback 적용)
                // 11011: 사업보고서, 11012: 반기보고서, 11013: 1분기, 11014: 3분기
                const targetYear = year || (new Date().getFullYear() - 1);
                const reprtCodes = ['11011', '11012', '11014', '11013'];
                let employeeData = null;
                let financialData = null;
                let avgSalary = null;
                let avgTenure = null;

                // 직원 현황 조회 (reprt_code fallback)
                for (const reprtCode of reprtCodes) {
                    if (employeeData) break;
                    try {
                        employeeData = await this.getEmployeeStatus(corpCode, targetYear, reprtCode);
                        if (employeeData) {
                            avgSalary = employeeData.avgSalary;
                            avgTenure = employeeData.avgTenure;
                            logger.info(`[getCompanyDataFromOpenDart] Employee data found with reprt_code: ${reprtCode} (총 ${employeeData.totalCount}명, 평균연봉 ${avgSalary?.toLocaleString()}원, 근속 ${avgTenure}년)`);
                        }
                    } catch (empError) {
                        logger.warn(`[getCompanyDataFromOpenDart] Employee status failed (reprt_code: ${reprtCode}): ${empError.message}`);
                    }
                }

                // 재무제표 조회 (CFS→OFS fallback + reprt_code fallback)
                for (const reprtCode of reprtCodes) {
                    if (financialData) break;
                    try {
                        // CFS(연결재무제표) 먼저 시도
                        financialData = await this.getFinancialStatement(corpCode, targetYear, reprtCode, 'CFS');
                        if (!financialData) {
                            // OFS(별도재무제표) fallback
                            financialData = await this.getFinancialStatement(corpCode, targetYear, reprtCode, 'OFS');
                        }
                        if (financialData) {
                            logger.info(`[getCompanyDataFromOpenDart] Financial data found with reprt_code: ${reprtCode}, fs_div: ${financialData.fsDiv}`);
                        }
                    } catch (finError) {
                        logger.warn(`[getCompanyDataFromOpenDart] Financial statement failed (reprt_code: ${reprtCode}): ${finError.message}`);
                    }
                }

                return {
                    companyName: company.corp_name || compName,
                    corpCode: corpCode,
                    businessNumber: company.jurir_no || businessNumber,
                    industry: company.induty_code || '정보없음',
                    listingDate: company.est_dt || null,
                    ceoName: company.ceo_nm || null,
                    homepage: company.hm_url || null,
                    address: company.adres || null,
                    // 직원 정보
                    employeeCount: employeeData?.totalCount || null,
                    avgSalary: avgSalary,
                    avgTenure: avgTenure,
                    estimatedNewHires: employeeData?.estimatedNewHires ?? null,
                    estimatedResignations: employeeData?.estimatedResignations ?? null,
                    // 재무 정보
                    revenue: financialData?.revenue || null,
                    operatingProfit: financialData?.operatingProfit || null,
                    profit: financialData?.netIncome || null,
                    assets: financialData?.totalAssets || null,
                    liabilities: financialData?.totalLiabilities || null,
                    equity: financialData?.totalEquity || null,
                    // 기타
                    dataSource: 'OpenDart API (corpCode.xml + company.json + empSttus.json + fnlttSinglAcntAll.json)',
                    rawData: company // 원본 데이터 보존
                };
            });

            // 캐시 저장
            if (data) {
                this.setCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            logger.error(`[getCompanyDataFromOpenDart] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * KOSIS API에서 산업별 평균 데이터 조회
     * @param {string} compName - 회사명
     * @param {string} businessNumber - 사업자등록번호 (선택)
     * @returns {Object} 산업별 평균 데이터
     */
    async getIndustryDataFromKosis(compName, businessNumber = null) {
        if (!this.apis.kosis.apiKey) {
            logger.warn(`[getIndustryDataFromKosis] API Key not configured`);
            return null;
        }

        try {
            // 캐시 확인 (사업자등록번호 포함)
            const cacheKey = `kosis_${compName}_${businessNumber || 'no_biz'}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // 재시도 로직 적용
            const data = await this.requestWithRetry('kosis', async () => {
                // KOSIS 전국사업체조사 통계표 (산업별 고용정보)
                // 실제 통계표 ID는 KOSIS 사이트에서 확인 필요
                const params = {
                    method: 'getList',
                    apiKey: this.apis.kosis.apiKey,
                    itmId: 'T1+',  // 항목 ID (종사자수 등)
                    objL1: 'ALL',  // 대분류
                    objL2: '',
                    format: 'json',
                    jsonVD: 'Y',
                    prdSe: 'Y',  // 년도
                    startPrdDe: (new Date().getFullYear() - 2).toString(),  // 최근 3년
                    endPrdDe: (new Date().getFullYear() - 1).toString(),
                    orgId: '101',  // 통계청
                    tblId: 'DT_1K52B01'  // 전국사업체조사 테이블 ID (예시)
                };

                const response = await axios.get(`${this.apis.kosis.baseUrl}/statisticsData.do`, {
                    params: params,
                    timeout: this.apis.kosis.timeout
                });

                // KOSIS API 응답 형식 처리
                if (response.data && Array.isArray(response.data)) {
                    // 실제 데이터 파싱 로직
                    // KOSIS는 통계표마다 구조가 다르므로 실제 응답에 맞춰 파싱 필요
                    
                    return {
                        industryTurnoverRate: "산업 평균 이직률 정보 (KOSIS 통계표 필요)",
                        industryAvgSalary: "산업 평균 연봉 정보 (KOSIS 통계표 필요)",
                        industryEmployeeCount: "산업 평균 직원 수 (KOSIS 통계표 필요)",
                        regionTurnoverRate: "지역 이직률 정보 (KOSIS 통계표 필요)",
                        note: "실제 데이터를 위해서는 KOSIS에서 적절한 통계표 ID를 설정해야 합니다",
                        rawData: response.data
                    };
                }

                logger.warn(`[getIndustryDataFromKosis] No valid data structure from KOSIS`);
                return null;
            });

            // 캐시 저장
            if (data) {
                this.setCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            logger.error(`[getIndustryDataFromKosis] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * 공공데이터포털에서 일반 통계 조회
     * @param {string} compName - 회사명
     * @param {string} businessNumber - 사업자등록번호 (선택)
     * @returns {Object} 공공 통계 데이터
     */
    async getPublicDataFromAPI(compName, businessNumber = null) {
        if (!this.apis.publicData.apiKey) {
            logger.warn(`[getPublicDataFromAPI] API Key not configured`);
            return null;
        }

        try {
            // 캐시 확인 (사업자등록번호 포함)
            const cacheKey = `publicdata_${compName}_${businessNumber || 'no_biz'}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // 재시도 로직 적용
            const data = await this.requestWithRetry('publicData', async () => {
                // 공공데이터포털의 특정 API를 사용해야 합니다
                // 예: 고용노동통계, 기업정보조회 등
                // 실제 사용할 데이터셋의 엔드포인트로 변경 필요
                
                // 참고: 공공데이터는 서비스마다 엔드포인트가 다릅니다
                // 예시 1) 고용행정통계: /B552015/empStatService/getEmpStat
                // 예시 2) 사업자상태조회: /B552015/status/service
                
                logger.info(`[getPublicDataFromAPI] Public Data API requires specific service endpoint`);
                logger.info(`[getPublicDataFromAPI] Current configuration is for framework testing only`);
                
                // 실제 구현 시 아래와 같이 사용:
                // const response = await axios.get(`${this.apis.publicData.baseUrl}/특정서비스/엔드포인트`, {
                //     params: {
                //         serviceKey: decodeURIComponent(this.apis.publicData.apiKey),
                //         numOfRows: 10,
                //         pageNo: 1,
                //         dataType: 'json'
                //         // 기타 필요한 파라미터
                //     },
                //     timeout: this.apis.publicData.timeout
                // });

                return {
                    regionEmploymentStats: "지역별 고용통계 (실제 API 엔드포인트 설정 필요)",
                    industryGrowthRate: "산업별 성장률 (실제 API 엔드포인트 설정 필요)",
                    economicIndicators: "경제 지표 (실제 API 엔드포인트 설정 필요)",
                    note: "공공데이터포털은 사용할 데이터셋의 실제 엔드포인트 URL이 필요합니다",
                    guide: "https://www.data.go.kr 에서 필요한 데이터를 찾고 해당 API 엔드포인트를 확인하세요"
                };
            });

            // 캐시 저장
            if (data) {
                this.setCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            logger.error(`[getPublicDataFromAPI] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * 캐시 초기화
     */
    clearCache(pattern = null) {
        if (pattern) {
            // 패턴에 맞는 캐시만 삭제
            const keys = Array.from(this.cache.keys());
            keys.forEach(key => {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                    logger.info(`[Cache] Deleted: ${key}`);
                }
            });
        } else {
            // 전체 캐시 삭제
            this.cache.clear();
            logger.info(`[Cache] Cleared all cache`);
        }
    }

    /**
     * 캐시 정보 조회
     */
    getCacheInfo() {
        const now = Date.now();
        const cacheInfo = {
            totalEntries: this.cache.size,
            validEntries: 0,
            expiredEntries: 0,
            entries: []
        };

        this.cache.forEach((value, key) => {
            const isExpired = now - value.timestamp >= this.cacheExpiry;
            if (isExpired) {
                cacheInfo.expiredEntries++;
            } else {
                cacheInfo.validEntries++;
            }
            
            cacheInfo.entries.push({
                key,
                timestamp: value.timestamp,
                age: Math.round((now - value.timestamp) / 1000),
                expired: isExpired
            });
        });

        return cacheInfo;
    }

    /**
     * API 헬스 체크
     */
    async checkApiHealth() {
        const healthStatus = {
            timestamp: new Date(),
            apis: {}
        };

        for (const [apiName, api] of Object.entries(this.apis)) {
            try {
                const start = Date.now();
                
                // 간단한 ping 요청 (각 API별로 적절한 엔드포인트 사용)
                if (api.apiKey) {
                    await axios.get(api.baseUrl, {
                        timeout: 5000,
                        validateStatus: () => true // 모든 상태 코드 허용
                    });
                }
                
                const duration = Date.now() - start;
                
                healthStatus.apis[apiName] = {
                    status: 'healthy',
                    responseTime: duration,
                    configured: !!api.apiKey
                };
            } catch (error) {
                healthStatus.apis[apiName] = {
                    status: 'unhealthy',
                    error: error.message,
                    configured: !!this.apis[apiName].apiKey
                };
            }
        }

        return healthStatus;
    }

    /**
     * 배열의 평균값 계산
     */
    calculateAverage(numbers) {
        if (!numbers || numbers.length === 0) return 0;
        return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
    }

    /**
     * 배열의 중간값 계산
     */
    calculateMedian(numbers) {
        if (!numbers || numbers.length === 0) return 0;
        const sorted = numbers.sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
        } else {
            return sorted[middle];
        }
    }

    /**
     * 여러 회사의 통계 정보를 일괄 업데이트
     * @param {Array} companies - 회사 정보 배열
     * @returns {Object} 일괄 업데이트 결과
     */
    async batchUpdateCompanyStatistics(companies) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const company of companies) {
            try {
                await this.updateCompanyStatistics(
                    company.compIdx,
                    company.compName,
                    company.businessNumber,
                    company.year || new Date().getFullYear(),
                    company.quarter
                );
                results.success++;
                
                // API 호출 간격 조절 (Rate Limiting 방지)
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results.failed++;
                results.errors.push({
                    compIdx: company.compIdx,
                    compName: company.compName,
                    error: error.message
                });
            }
        }

        logger.info(`[batchUpdateCompanyStatistics] Completed: ${results.success} success, ${results.failed} failed`);
        return results;
    }

    /**
     * OpenDart corpCode.xml 다운로드 및 파싱
     * 전체 상장회사 목록을 다운로드하여 Map으로 반환
     * @returns {Map} corp_name -> {corp_code, stock_code}
     */
    async downloadAndParseCorpCode() {
        try {
            logger.info('[downloadAndParseCorpCode] Starting corp_code download...');

            // 캐시 확인
            const cacheKey = 'corpcode_xml_map';
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                logger.info('[downloadAndParseCorpCode] Using cached corp_code map');
                return cached;
            }

            if (!this.apis.openDart.apiKey) {
                throw new Error('OpenDart API Key not configured');
            }

            // corpCode.xml 다운로드
            const response = await axios.get(`${this.apis.openDart.baseUrl}/corpCode.xml`, {
                params: {
                    crtfc_key: this.apis.openDart.apiKey
                },
                timeout: 30000, // 30초 (파일이 큼)
                responseType: 'arraybuffer'
            });

            if (!response.data) {
                throw new Error('Empty response from corpCode.xml');
            }

            const buffer = Buffer.from(response.data);
            logger.info(`[downloadAndParseCorpCode] Response size: ${buffer.length} bytes`);

            let xmlText;
            
            // ZIP 파일인지 확인 (PK 시그니처: 50 4B 03 04)
            if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
                logger.info('[downloadAndParseCorpCode] Detected ZIP format, extracting with adm-zip...');
                try {
                    // adm-zip으로 압축 해제
                    const zip = new AdmZip(buffer);
                    const zipEntries = zip.getEntries();
                    
                    logger.info(`[downloadAndParseCorpCode] ZIP contains ${zipEntries.length} file(s)`);
                    
                    if (zipEntries.length === 0) {
                        throw new Error('ZIP file is empty');
                    }
                    
                    // 첫 번째 파일 (CORPCODE.xml) 추출
                    const entry = zipEntries[0];
                    logger.info(`[downloadAndParseCorpCode] Extracting: ${entry.entryName} (${entry.header.size} bytes)`);
                    
                    xmlText = zip.readAsText(entry);
                    logger.info(`[downloadAndParseCorpCode] Successfully extracted ${xmlText.length} characters`);
                    
                } catch (zipError) {
                    logger.error(`[downloadAndParseCorpCode] ZIP extraction failed: ${zipError.message}`);
                    throw zipError;
                }
            } else {
                // ZIP이 아니면 일반 텍스트로 처리
                logger.info('[downloadAndParseCorpCode] Not ZIP format, treating as plain text');
                xmlText = buffer.toString('utf-8');
            }

            logger.info(`[downloadAndParseCorpCode] XML text size: ${xmlText.length} bytes`);

            // XML 파싱 (간단한 정규식 사용)
            const corpCodeMap = new Map();
            const corpPattern = /<list>[\s\S]*?<corp_code>(.*?)<\/corp_code>[\s\S]*?<corp_name>(.*?)<\/corp_name>[\s\S]*?<stock_code>(.*?)<\/stock_code>[\s\S]*?<\/list>/g;
            
            let match;
            while ((match = corpPattern.exec(xmlText)) !== null) {
                const corpCode = match[1].trim();
                const corpName = match[2].trim();
                const stockCode = match[3].trim();
                
                corpCodeMap.set(corpName, {
                    corp_code: corpCode,
                    stock_code: stockCode || null
                });
            }

            logger.info(`[downloadAndParseCorpCode] Downloaded ${corpCodeMap.size} companies`);

            if (corpCodeMap.size === 0) {
                // 파싱 실패시 샘플 출력
                logger.warn('[downloadAndParseCorpCode] XML parsing failed, showing first 500 chars:');
                logger.warn(xmlText.substring(0, 500));
            }

            // 캐시 저장 (1시간)
            this.setCache(cacheKey, corpCodeMap);

            return corpCodeMap;

        } catch (error) {
            logger.error(`[downloadAndParseCorpCode] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * OpenDart API에서 회사명으로 corp_code 조회
     * corpCode.xml을 사용하여 정확한 매칭
     * @param {string} compName - 회사명
     * @returns {string} corp_code
     */
    async getCorpCode(compName) {
        if (!compName) {
            throw new Error('compName is required');
        }

        if (!this.apis.openDart.apiKey) {
            logger.warn('[getCorpCode] API Key not configured');
            return null;
        }

        try {
            // 캐시 확인
            const cacheKey = `corpcode_${compName}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // corpCode.xml 다운로드 (캐시됨)
            const corpCodeMap = await this.downloadAndParseCorpCode();

            // 정확히 일치하는 회사명 찾기
            let corpCode = null;
            let matchedName = null;
            
            // 1. 정확한 매칭
            if (corpCodeMap.has(compName)) {
                corpCode = corpCodeMap.get(compName).corp_code;
                matchedName = compName;
                logger.info(`[getCorpCode] Exact match found: ${compName} -> ${corpCode}`);
            }
            // 2. 주식회사 변형 검색
            else {
                const variations = [
                    `${compName}주식회사`,
                    `주식회사${compName}`,
                    `(주)${compName}`,
                    `${compName}(주)`,
                    `주식회사 ${compName}`,
                    `(주) ${compName}`
                ];

                for (const variation of variations) {
                    if (corpCodeMap.has(variation)) {
                        corpCode = corpCodeMap.get(variation).corp_code;
                        matchedName = variation;
                        logger.info(`[getCorpCode] Variation match found: ${variation} -> ${corpCode}`);
                        break;
                    }
                }
            }

            // 3. 부분 일치 검색 (정확도 우선)
            if (!corpCode) {
                const candidates = [];
                for (const [name, info] of corpCodeMap.entries()) {
                    if (name.includes(compName)) {
                        candidates.push({ name, info, score: name.length });
                    }
                }
                
                // 짧은 이름일수록 더 정확한 매칭
                if (candidates.length > 0) {
                    candidates.sort((a, b) => a.score - b.score);
                    corpCode = candidates[0].info.corp_code;
                    matchedName = candidates[0].name;
                    logger.info(`[getCorpCode] Partial match found: ${matchedName} -> ${corpCode} (from ${candidates.length} candidates)`);
                }
            }

            if (!corpCode) {
                logger.warn(`[getCorpCode] No match found for: ${compName}`);
                return null;
            }

            // 캐시 저장
            this.setCache(cacheKey, corpCode);
            return corpCode;

        } catch (error) {
            logger.error(`[getCorpCode] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * OpenDart API에서 직원 현황 조회 (empSttus.json)
     * @param {string} corpCode - 회사 고유번호
     * @param {number} year - 조회 연도
     * @param {string} reprtCode - 보고서 코드 (11011: 사업보고서)
     * @returns {Object} 직원 현황 데이터
     */
    async getEmployeeStatus(corpCode, year, reprtCode = '11011') {
        if (!this.apis.openDart.apiKey) {
            logger.warn('[getEmployeeStatus] API Key not configured');
            return null;
        }

        try {
            // 캐시 확인
            const cacheKey = `employee_${corpCode}_${year}_${reprtCode}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // 재시도 로직 적용
            const data = await this.requestWithRetry('openDart', async () => {
                const response = await axios.get(`${this.apis.openDart.baseUrl}/empSttus.json`, {
                    params: {
                        crtfc_key: this.apis.openDart.apiKey,
                        corp_code: corpCode,
                        bsns_year: year.toString(),
                        reprt_code: reprtCode
                    },
                    timeout: this.apis.openDart.timeout
                });

                if (response.data.status !== '000') {
                    logger.warn(`[getEmployeeStatus] API Error: ${response.data.message}`);
                    return null;
                }

                if (!response.data.list || response.data.list.length === 0) {
                    logger.warn(`[getEmployeeStatus] No employee data found`);
                    return null;
                }

                // 근속연수 파싱 ("8년 6개월", "8년6월", "8.5" 등)
                const parseTenure = (str) => {
                    if (!str) return 0;
                    const cleaned = str.replace(/,/g, '').trim();
                    const match = cleaned.match(/(\d+)\s*년\s*(\d+)?\s*(개월|월)?/);
                    if (match) {
                        return parseFloat(match[1]) + (parseFloat(match[2] || 0) / 12);
                    }
                    const num = parseFloat(cleaned);
                    return isNaN(num) ? 0 : num;
                };

                const parseNum = (str) => parseInt((str || '').replace(/[^0-9-]/g, '')) || 0;

                // 직원 데이터 파싱 (OpenDart empSttus.json 필드 기준)
                const employees = response.data.list.map(item => {
                    const beginCount = parseNum(item.reform_bfe_emp_co_rgllbr)
                        + parseNum(item.reform_bfe_emp_co_cnttk)
                        + parseNum(item.reform_bfe_emp_co_etc);
                    const endCount = parseNum(item.sm);

                    return {
                        employmentType: item.fo_bbm || null,
                        sexDivision: item.sexdstn || null,
                        beginCount,
                        employeeCount: endCount,
                        avgSalary: Math.round(parseFloat((item.jan_salary_am || '').replace(/,/g, '')) * 1000) || 0, // 천원 → 원
                        avgTenure: parseTenure(item.avrg_cnwk_sdytrn),
                        annualSalaryTotal: Math.round(parseFloat((item.fyer_salary_totamt || '').replace(/,/g, '')) * 1000000) || 0 // 백만원 → 원
                    };
                });

                // 총계 계산
                let totalCount = 0;
                let totalBeginCount = 0;
                let totalSalary = 0;
                let totalTenure = 0;

                employees.forEach(emp => {
                    if (emp.employeeCount > 0) {
                        totalCount += emp.employeeCount;
                        totalBeginCount += emp.beginCount;
                        totalSalary += emp.avgSalary * emp.employeeCount;
                        totalTenure += emp.avgTenure * emp.employeeCount;
                    }
                });

                // 신규입사/퇴사 추정 (기초인원 vs 기말인원)
                const netChange = totalCount - totalBeginCount;
                const estimatedNewHires = netChange > 0 ? netChange : 0;
                const estimatedResignations = netChange < 0 ? Math.abs(netChange) : 0;

                const result = {
                    corpCode,
                    year,
                    reprtCode,
                    totalCount,
                    totalBeginCount,
                    avgSalary: totalCount > 0 ? Math.round(totalSalary / totalCount) : 0,
                    avgTenure: totalCount > 0 ? Math.round((totalTenure / totalCount) * 10) / 10 : 0,
                    estimatedNewHires,
                    estimatedResignations,
                    employees,
                    rawData: response.data.list
                };

                logger.info(`[getEmployeeStatus] Found ${employees.length} employee records for ${corpCode}`);
                return result;
            });

            // 캐시 저장
            if (data) {
                this.setCache(cacheKey, data);
            }

            return data;

        } catch (error) {
            logger.error(`[getEmployeeStatus] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * OpenDart API에서 재무제표 조회 (fnlttSinglAcntAll.json)
     * @param {string} corpCode - 회사 고유번호
     * @param {number} year - 조회 연도
     * @param {string} reprtCode - 보고서 코드 (11011: 사업보고서)
     * @param {string} fsDiv - 재무제표 구분 (CFS: 연결, OFS: 별도)
     * @returns {Object} 재무제표 데이터
     */
    async getFinancialStatement(corpCode, year, reprtCode = '11011', fsDiv = 'CFS') {
        if (!this.apis.openDart.apiKey) {
            logger.warn('[getFinancialStatement] API Key not configured');
            return null;
        }

        try {
            // 캐시 확인
            const cacheKey = `financial_${corpCode}_${year}_${reprtCode}_${fsDiv}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // 재시도 로직 적용
            const data = await this.requestWithRetry('openDart', async () => {
                const response = await axios.get(`${this.apis.openDart.baseUrl}/fnlttSinglAcntAll.json`, {
                    params: {
                        crtfc_key: this.apis.openDart.apiKey,
                        corp_code: corpCode,
                        bsns_year: year.toString(),
                        reprt_code: reprtCode,
                        fs_div: fsDiv
                    },
                    timeout: this.apis.openDart.timeout
                });

                if (response.data.status !== '000') {
                    logger.warn(`[getFinancialStatement] API Error: ${response.data.message}`);
                    return null;
                }

                if (!response.data.list || response.data.list.length === 0) {
                    logger.warn(`[getFinancialStatement] No financial data found`);
                    return null;
                }

                // 재무 항목 추출 함수 (IS → CIS fallback 적용)
                const findAmount = (accountNames, sjDivs) => {
                    const names = Array.isArray(accountNames) ? accountNames : [accountNames];
                    const divs = Array.isArray(sjDivs) ? sjDivs : [sjDivs];
                    for (const sjDiv of divs) {
                        for (const accountName of names) {
                            const item = response.data.list.find(i =>
                                i.account_nm && i.account_nm.includes(accountName) && i.sj_div === sjDiv
                            );
                            if (item && item.thstrm_amount) {
                                const value = parseInt(item.thstrm_amount.replace(/[^0-9-]/g, ''));
                                if (!isNaN(value)) return value;
                            }
                        }
                    }
                    return null;
                };

                const result = {
                    corpCode,
                    year,
                    reprtCode,
                    fsDiv,
                    // IS(손익계산서) → CIS(포괄손익계산서) fallback
                    revenue: findAmount(['매출액', '수익(매출액)', '매출', '영업수익', '순매출액'], ['IS', 'CIS']),
                    operatingProfit: findAmount(['영업이익', '영업이익(손실)'], ['IS', 'CIS']),
                    netIncome: findAmount(['당기순이익', '당기순이익(손실)', '분기순이익', '당기순손익'], ['IS', 'CIS']),
                    totalAssets: findAmount(['자산총계', '자산총액'], ['BS']),
                    totalLiabilities: findAmount(['부채총계', '부채총액'], ['BS']),
                    totalEquity: findAmount(['자본총계', '자본총액'], ['BS']),
                    rawData: response.data.list
                };

                logger.info(`[getFinancialStatement] Found financial data for ${corpCode}`);
                return result;
            });

            // 캐시 저장
            if (data) {
                this.setCache(cacheKey, data);
            }

            return data;

        } catch (error) {
            logger.error(`[getFinancialStatement] Error: ${error.message}`);
            return null;
        }
    }
}

module.exports = new ExternalApiService();
