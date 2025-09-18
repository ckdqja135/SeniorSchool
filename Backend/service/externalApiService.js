const axios = require('axios');
const { CompStatistics } = require('../model/index');
const logger = require('../utils/logger');

/**
 * 외부 API 연동 서비스
 * 회사 통계 정보를 외부 API에서 가져와서 DB에 저장
 */

class ExternalApiService {
    constructor() {
        // API 설정 (환경변수로 관리 권장)
        this.apis = {
            // OpenDart API (금융감독원) - 상장회사 정보
            openDart: {
                baseUrl: process.env.OPENDART_API_URL || 'https://opendart.fss.or.kr/api',
                apiKey: process.env.OPENDART_API_KEY
            },
            // 통계청 KOSIS API - 산업별 통계
            kosis: {
                baseUrl: process.env.KOSIS_API_URL || 'https://kosis.kr/openapi',
                apiKey: process.env.KOSIS_API_KEY
            },
            // 공공데이터포털 API - 기타 공공데이터
            publicData: {
                baseUrl: process.env.PUBLIC_DATA_API_URL || 'https://www.data.go.kr/api/rest',
                apiKey: process.env.PUBLIC_DATA_API_KEY
            }
        };
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
        const collectedData = {};
        const apiResponses = {};

        try {
            // 1. OpenDart API에서 상장회사 정보 수집
            try {
                const dartData = await this.getCompanyDataFromOpenDart(compName);
                if (dartData) {
                    collectedData.companyName = dartData.companyName;
                    collectedData.businessNumber = dartData.businessNumber;
                    collectedData.industry = dartData.industry;
                    collectedData.listingDate = dartData.listingDate;
                    collectedData.marketCap = dartData.marketCap;
                    collectedData.employeeCount = dartData.employeeCount;
                    collectedData.revenue = dartData.revenue;
                    collectedData.profit = dartData.profit;
                    collectedData.assets = dartData.assets;
                    collectedData.liabilities = dartData.liabilities;
                    collectedData.isListed = true;
                    apiResponses.openDart = dartData;
                    collectedData.dataSource = 'OpenDart API';
                }
            } catch (error) {
                logger.warn(`[collectStatisticsFromAPIs] OpenDart API error: ${error.message}`);
            }

            // 2. KOSIS API에서 산업별 평균 데이터 수집
            try {
                const kosisData = await this.getIndustryDataFromKosis(compName);
                if (kosisData) {
                    collectedData.industryTurnoverRate = kosisData.industryTurnoverRate;
                    collectedData.industryAvgSalary = kosisData.industryAvgSalary;
                    collectedData.industryEmployeeCount = kosisData.industryEmployeeCount;
                    collectedData.regionTurnoverRate = kosisData.regionTurnoverRate;
                    apiResponses.kosis = kosisData;
                    collectedData.dataSource = collectedData.dataSource ? 
                        `${collectedData.dataSource}, KOSIS API` : 'KOSIS API';
                }
            } catch (error) {
                logger.warn(`[collectStatisticsFromAPIs] KOSIS API error: ${error.message}`);
            }

            // 3. 공공데이터포털에서 일반 통계 수집
            try {
                const publicData = await this.getPublicDataFromAPI(compName);
                if (publicData) {
                    collectedData.regionEmploymentStats = publicData.regionEmploymentStats;
                    collectedData.industryGrowthRate = publicData.industryGrowthRate;
                    collectedData.economicIndicators = publicData.economicIndicators;
                    apiResponses.publicData = publicData;
                    collectedData.dataSource = collectedData.dataSource ? 
                        `${collectedData.dataSource}, Public Data API` : 'Public Data API';
                }
            } catch (error) {
                logger.warn(`[collectStatisticsFromAPIs] Public Data API error: ${error.message}`);
            }

            // 4. 원본 API 응답 데이터 저장
            collectedData.apiResponseData = apiResponses;

            logger.info(`[collectStatisticsFromAPIs] Collected data from ${Object.keys(apiResponses).length} APIs`);
            return collectedData;

        } catch (error) {
            logger.error(`[collectStatisticsFromAPIs] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * OpenDart API에서 상장회사 정보 조회
     * @param {string} compName - 회사명
     * @returns {Object} 상장회사 정보
     */
    async getCompanyDataFromOpenDart(compName) {
        try {
            // 회사 기본정보 조회
            const companyResponse = await axios.get(`${this.apis.openDart.baseUrl}/company.json`, {
                params: {
                    crtfc_key: this.apis.openDart.apiKey,
                    corp_name: compName
                },
                timeout: 10000
            });

            if (companyResponse.data && companyResponse.data.list && companyResponse.data.list.length > 0) {
                const company = companyResponse.data.list[0];
                
                // 사업보고서에서 직원 수 조회
                const reportResponse = await axios.get(`${this.apis.openDart.baseUrl}/fnlttSinglAcnt.json`, {
                    params: {
                        crtfc_key: this.apis.openDart.apiKey,
                        corp_code: company.corp_code,
                        bsns_year: new Date().getFullYear().toString(),
                        reprt_code: '11011' // 사업보고서
                    },
                    timeout: 10000
                });

                let employeeCount = null;
                if (reportResponse.data && reportResponse.data.list) {
                    const employeeData = reportResponse.data.list.find(item => 
                        item.account_nm === '종업원수' || item.account_nm === '직원수'
                    );
                    if (employeeData) {
                        employeeCount = parseInt(employeeData.thstrm_amount) || null;
                    }
                }

                return {
                    companyName: company.corp_name,
                    businessNumber: company.bizr_no,
                    industry: company.corp_cls,
                    listingDate: company.listing_date,
                    marketCap: company.capital_stock,
                    employeeCount: employeeCount,
                    revenue: null, // 별도 API 호출 필요
                    profit: null,  // 별도 API 호출 필요
                    assets: null,  // 별도 API 호출 필요
                    liabilities: null // 별도 API 호출 필요
                };
            }

            return null;
        } catch (error) {
            logger.error(`[getCompanyDataFromOpenDart] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * KOSIS API에서 산업별 평균 데이터 조회
     * @param {string} compName - 회사명
     * @returns {Object} 산업별 평균 데이터
     */
    async getIndustryDataFromKosis(compName) {
        try {
            // 실제 API 구현 예시 (API 문서에 따라 수정 필요)
            const response = await axios.get(`${this.apis.kosis.baseUrl}/statistics`, {
                params: {
                    apiKey: this.apis.kosis.apiKey,
                    method: 'getList',
                    format: 'json',
                    jsonVD: 'JSON',
                    prdSe: 'M', // 월별
                    startPrdDe: '202401',
                    endPrdDe: '202412',
                    objL1: '10', // 산업별
                    objL2: '10', // 전체
                    objL3: '10'  // 전체
                },
                timeout: 10000
            });

            if (response.data && response.data.RESULT) {
                // 실제 응답 구조에 맞게 파싱 (예시)
                return {
                    industryTurnoverRate: "12.5%", // 업종별 평균 이직률
                    industryAvgSalary: "4500만원", // 업종별 평균 연봉
                    industryEmployeeCount: "150명", // 업종별 평균 직원 수
                    regionTurnoverRate: "10.8%" // 지역별 평균 이직률
                };
            }

            return null;
        } catch (error) {
            logger.error(`[getIndustryDataFromKosis] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * 공공데이터포털에서 일반 통계 조회
     * @param {string} compName - 회사명
     * @returns {Object} 공공 통계 데이터
     */
    async getPublicDataFromAPI(compName) {
        try {
            // 실제 API 구현 예시 (API 문서에 따라 수정 필요)
            const response = await axios.get(`${this.apis.publicData.baseUrl}/statistics`, {
                params: {
                    serviceKey: this.apis.publicData.apiKey,
                    type: 'json',
                    numOfRows: 100,
                    pageNo: 1
                },
                timeout: 10000
            });

            if (response.data && response.data.response) {
                // 실제 응답 구조에 맞게 파싱 (예시)
                return {
                    regionEmploymentStats: "서울특별시 고용률 60.2%", // 지역별 고용통계
                    industryGrowthRate: "IT서비스업 성장률 8.5%", // 업종별 성장률
                    economicIndicators: "경제성장률 2.1%, 고용률 60.8%" // 경제지표
                };
            }

            return null;
        } catch (error) {
            logger.error(`[getPublicDataFromAPI] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * 배열의 평균값 계산
     */
    calculateAverage(numbers) {
        return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
    }

    /**
     * 배열의 중간값 계산
     */
    calculateMedian(numbers) {
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
