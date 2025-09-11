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
            // 사람인 API
            saramin: {
                baseUrl: process.env.SARAMIN_API_URL,
                apiKey: process.env.SARAMIN_API_KEY
            },
            // 공공데이터포털 API
            publicData: {
                baseUrl: process.env.PUBLIC_DATA_API_URL,
                apiKey: process.env.PUBLIC_DATA_API_KEY
            },
            // OpenDart API (금융감독원)
            openDart: {
                baseUrl: process.env.OPENDART_API_URL,
                apiKey: process.env.OPENDART_API_KEY
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
            // 1. 사람인 API에서 연봉 정보 수집
            try {
                const salaryData = await this.getSalaryDataFromSaramin(compName);
                if (salaryData) {
                    collectedData.avgSalary = salaryData.avgSalary;
                    collectedData.minSalary = salaryData.minSalary;
                    collectedData.maxSalary = salaryData.maxSalary;
                    collectedData.medianSalary = salaryData.medianSalary;
                    apiResponses.saramin = salaryData;
                    collectedData.dataSource = 'Saramin API';
                }
            } catch (error) {
                logger.warn(`[collectStatisticsFromAPIs] Saramin API error: ${error.message}`);
            }

            // 2. 공공데이터포털에서 고용 정보 수집
            try {
                const employmentData = await this.getEmploymentDataFromPublicAPI(businessNumber || compName, year);
                if (employmentData) {
                    collectedData.totalEmployees = employmentData.totalEmployees;
                    collectedData.newHires = employmentData.newHires;
                    collectedData.resignations = employmentData.resignations;
                    collectedData.hireRate = employmentData.hireRate;
                    collectedData.turnoverRate = employmentData.turnoverRate;
                    collectedData.netGrowth = (employmentData.newHires || 0) - (employmentData.resignations || 0);
                    apiResponses.publicData = employmentData;
                    collectedData.dataSource = collectedData.dataSource ? 
                        `${collectedData.dataSource}, Public Data API` : 'Public Data API';
                }
            } catch (error) {
                logger.warn(`[collectStatisticsFromAPIs] Public Data API error: ${error.message}`);
            }

            // 3. OpenDart API에서 상장기업 정보 수집 (상장기업인 경우)
            try {
                const dartData = await this.getCompanyDataFromOpenDart(compName);
                if (dartData) {
                    // 상장기업의 경우 더 정확한 직원 수 정보 가능
                    if (dartData.employeeCount) {
                        collectedData.totalEmployees = dartData.employeeCount;
                    }
                    if (dartData.avgSalary) {
                        collectedData.avgSalary = dartData.avgSalary;
                    }
                    apiResponses.openDart = dartData;
                    collectedData.dataSource = collectedData.dataSource ? 
                        `${collectedData.dataSource}, OpenDart API` : 'OpenDart API';
                }
            } catch (error) {
                logger.warn(`[collectStatisticsFromAPIs] OpenDart API error: ${error.message}`);
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
     * 사람인 API에서 연봉 정보 조회
     * @param {string} compName - 회사명
     * @returns {Object} 연봉 정보
     */
    async getSalaryDataFromSaramin(compName) {
        try {
            // 실제 API 구현 예시 (API 문서에 따라 수정 필요)
            const response = await axios.get(`${this.apis.saramin.baseUrl}/job-search`, {
                params: {
                    access_token: this.apis.saramin.apiKey,
                    keywords: compName,
                    fields: 'salary'
                },
                timeout: 10000
            });

            if (response.data && response.data.jobs) {
                // API 응답 데이터 파싱 (실제 응답 구조에 맞게 수정)
                const jobs = response.data.jobs.job || [];
                const salaries = jobs.map(job => job.salary?.code).filter(s => s);
                
                if (salaries.length > 0) {
                    return {
                        avgSalary: this.calculateAverage(salaries),
                        minSalary: Math.min(...salaries),
                        maxSalary: Math.max(...salaries),
                        medianSalary: this.calculateMedian(salaries)
                    };
                }
            }

            return null;
        } catch (error) {
            logger.error(`[getSalaryDataFromSaramin] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * 공공데이터포털에서 고용 정보 조회
     * @param {string} compIdentifier - 회사 식별자 (사업자번호 또는 회사명)
     * @param {number} year - 연도
     * @returns {Object} 고용 정보
     */
    async getEmploymentDataFromPublicAPI(compIdentifier, year) {
        try {
            // 실제 API 구현 예시 (API 문서에 따라 수정 필요)
            const response = await axios.get(`${this.apis.publicData.baseUrl}/employment-info`, {
                params: {
                    serviceKey: this.apis.publicData.apiKey,
                    company: compIdentifier,
                    year: year,
                    type: 'json'
                },
                timeout: 10000
            });

            if (response.data && response.data.response) {
                const data = response.data.response.body;
                return {
                    totalEmployees: data.totalEmployees,
                    newHires: data.newHires,
                    resignations: data.resignations,
                    hireRate: data.hireRate,
                    turnoverRate: data.turnoverRate
                };
            }

            return null;
        } catch (error) {
            logger.error(`[getEmploymentDataFromPublicAPI] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * OpenDart API에서 상장기업 정보 조회
     * @param {string} compName - 회사명
     * @returns {Object} 상장기업 정보
     */
    async getCompanyDataFromOpenDart(compName) {
        try {
            // 실제 API 구현 예시
            const response = await axios.get(`${this.apis.openDart.baseUrl}/company.json`, {
                params: {
                    crtfc_key: this.apis.openDart.apiKey,
                    corp_name: compName
                },
                timeout: 10000
            });

            if (response.data && response.data.list) {
                const companyData = response.data.list[0];
                return {
                    employeeCount: companyData.employee_count,
                    avgSalary: companyData.avg_salary
                };
            }

            return null;
        } catch (error) {
            logger.error(`[getCompanyDataFromOpenDart] Error: ${error.message}`);
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
