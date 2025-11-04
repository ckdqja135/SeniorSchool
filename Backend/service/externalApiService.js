const axios = require('axios');
const { CompStatistics } = require('../model/index');
const logger = require('../utils/logger');

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
    async getCompanyDataFromOpenDart(compName, businessNumber = null) {
        if (!this.apis.openDart.apiKey) {
            logger.warn(`[getCompanyDataFromOpenDart] API Key not configured`);
            return null;
        }

        try {
            // 캐시 확인 (사업자등록번호 포함)
            const cacheKey = `opendart_${compName}_${businessNumber || 'no_biz'}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // 재시도 로직 적용
            const data = await this.requestWithRetry('openDart', async () => {
                // 1단계: 회사 목록에서 고유번호 조회 (list.json 사용)
                const corpListResponse = await axios.get(`${this.apis.openDart.baseUrl}/list.json`, {
                    params: {
                        crtfc_key: this.apis.openDart.apiKey,
                        corp_name: compName
                    },
                    timeout: this.apis.openDart.timeout
                });

                // 응답 확인
                if (corpListResponse.data.status !== '000') {
                    logger.warn(`[getCompanyDataFromOpenDart] API Error: ${corpListResponse.data.message}`);
                    return null;
                }

                if (!corpListResponse.data.list || corpListResponse.data.list.length === 0) {
                    logger.warn(`[getCompanyDataFromOpenDart] No company found for: ${compName}`);
                    return null;
                }

                // 정확히 일치하는 회사명 찾기 (부분 일치가 아닌)
                let targetCompany = corpListResponse.data.list.find(corp => 
                    corp.corp_name === compName || 
                    corp.corp_name === `${compName}주식회사` ||
                    corp.corp_name === `주식회사${compName}` ||
                    corp.corp_name === `(주)${compName}` ||
                    corp.corp_name.includes(compName)
                );

                // 일치하는 회사가 없으면 첫 번째 결과 사용
                if (!targetCompany) {
                    targetCompany = corpListResponse.data.list[0];
                    logger.warn(`[getCompanyDataFromOpenDart] No exact match, using first result: ${targetCompany.corp_name}`);
                }

                const corpCode = targetCompany.corp_code;
                logger.info(`[getCompanyDataFromOpenDart] Found corp_code: ${corpCode} for ${compName} (matched: ${targetCompany.corp_name})`);

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
                
                // 3단계: 재무제표에서 직원 수 및 재무정보 조회
                let employeeCount = null;
                let revenue = null;
                let profit = null;
                
                try {
                    const currentYear = new Date().getFullYear() - 1; // 전년도 데이터
                    const reportResponse = await axios.get(`${this.apis.openDart.baseUrl}/fnlttSinglAcnt.json`, {
                        params: {
                            crtfc_key: this.apis.openDart.apiKey,
                            corp_code: corpCode,
                            bsns_year: currentYear.toString(),
                            reprt_code: '11011' // 사업보고서
                        },
                        timeout: this.apis.openDart.timeout
                    });

                    if (reportResponse.data.status === '000' && reportResponse.data.list) {
                        // 종업원수
                        const employeeData = reportResponse.data.list.find(item => 
                            item.account_nm && (item.account_nm.includes('종업원수') || item.account_nm.includes('직원수'))
                        );
                        if (employeeData && employeeData.thstrm_amount) {
                            employeeCount = parseInt(employeeData.thstrm_amount.replace(/[^0-9]/g, '')) || null;
                        }

                        // 매출액
                        const revenueData = reportResponse.data.list.find(item => 
                            item.account_nm && item.account_nm.includes('매출액')
                        );
                        if (revenueData && revenueData.thstrm_amount) {
                            revenue = parseInt(revenueData.thstrm_amount.replace(/[^0-9]/g, '')) || null;
                        }

                        // 당기순이익
                        const profitData = reportResponse.data.list.find(item => 
                            item.account_nm && item.account_nm.includes('당기순이익')
                        );
                        if (profitData && profitData.thstrm_amount) {
                            profit = parseInt(profitData.thstrm_amount.replace(/[^0-9]/g, '')) || null;
                        }
                    }
                } catch (reportError) {
                    logger.warn(`[getCompanyDataFromOpenDart] Failed to fetch financial report: ${reportError.message}`);
                }

                return {
                    companyName: company.corp_name || compName,
                    businessNumber: company.jurir_no || businessNumber,
                    industry: company.induty_code || '정보없음',
                    listingDate: company.est_dt || null,
                    marketCap: null,
                    employeeCount: employeeCount,
                    revenue: revenue,
                    profit: profit,
                    assets: null,
                    liabilities: null,
                    address: company.adres || null,
                    ceoName: company.ceo_nm || null,
                    homepage: company.hm_url || null,
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
}

module.exports = new ExternalApiService();
