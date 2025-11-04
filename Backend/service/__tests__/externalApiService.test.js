const externalApiService = require('../externalApiService');
const axios = require('axios');
const { CompStatistics } = require('../../model/index');

// axios 모킹
jest.mock('axios');

describe('ExternalApiService', () => {
    beforeEach(() => {
        // 각 테스트 전에 캐시 초기화
        externalApiService.clearCache();
        jest.clearAllMocks();
    });

    describe('캐시 기능', () => {
        test('캐시에 데이터 저장 및 조회', () => {
            const key = 'test_key';
            const data = { test: 'data' };
            
            externalApiService.setCache(key, data);
            const cached = externalApiService.getFromCache(key);
            
            expect(cached).toEqual(data);
        });

        test('만료된 캐시는 조회되지 않음', () => {
            const key = 'expired_key';
            const data = { test: 'data' };
            
            externalApiService.setCache(key, data);
            
            // 캐시 만료 시간을 강제로 변경
            externalApiService.cacheExpiry = 0;
            
            const cached = externalApiService.getFromCache(key);
            expect(cached).toBeNull();
        });

        test('캐시 정보 조회', () => {
            externalApiService.setCache('key1', { data: 1 });
            externalApiService.setCache('key2', { data: 2 });
            
            const cacheInfo = externalApiService.getCacheInfo();
            
            expect(cacheInfo.totalEntries).toBe(2);
            expect(cacheInfo.validEntries).toBe(2);
        });

        test('패턴별 캐시 삭제', () => {
            externalApiService.setCache('opendart_company1', { data: 1 });
            externalApiService.setCache('kosis_company1', { data: 2 });
            externalApiService.setCache('opendart_company2', { data: 3 });
            
            externalApiService.clearCache('opendart');
            
            expect(externalApiService.getFromCache('opendart_company1')).toBeNull();
            expect(externalApiService.getFromCache('opendart_company2')).toBeNull();
            expect(externalApiService.getFromCache('kosis_company1')).not.toBeNull();
        });
    });

    describe('OpenDart API', () => {
        test('회사 정보 조회 성공', async () => {
            const mockResponse = {
                data: {
                    list: [{
                        corp_name: '삼성전자',
                        bizr_no: '1234567890',
                        corp_cls: 'Y',
                        listing_date: '20200101',
                        capital_stock: '1000000000000',
                        corp_code: '00123456'
                    }]
                }
            };

            const mockReportResponse = {
                data: {
                    list: [{
                        account_nm: '종업원수',
                        thstrm_amount: '100000'
                    }]
                }
            };

            axios.get
                .mockResolvedValueOnce(mockResponse)
                .mockResolvedValueOnce(mockReportResponse);

            const result = await externalApiService.getCompanyDataFromOpenDart('삼성전자');

            expect(result).not.toBeNull();
            expect(result.companyName).toBe('삼성전자');
            expect(result.employeeCount).toBe(100000);
            expect(axios.get).toHaveBeenCalledTimes(2);
        });

        test('API 키가 없으면 null 반환', async () => {
            const originalApiKey = externalApiService.apis.openDart.apiKey;
            externalApiService.apis.openDart.apiKey = null;

            const result = await externalApiService.getCompanyDataFromOpenDart('삼성전자');

            expect(result).toBeNull();
            
            // 복구
            externalApiService.apis.openDart.apiKey = originalApiKey;
        });

        test('데이터가 없으면 null 반환', async () => {
            axios.get.mockResolvedValueOnce({
                data: {
                    list: []
                }
            });

            const result = await externalApiService.getCompanyDataFromOpenDart('없는회사');

            expect(result).toBeNull();
        });

        test('사업자등록번호로 검색', async () => {
            const mockResponse = {
                data: {
                    list: [{
                        corp_name: '삼성전자',
                        bizr_no: '1234567890',
                        corp_cls: 'Y',
                        listing_date: '20200101',
                        capital_stock: '1000000000000',
                        corp_code: '00123456'
                    }]
                }
            };

            axios.get.mockResolvedValueOnce(mockResponse);

            const result = await externalApiService.getCompanyDataFromOpenDart('삼성전자', '1234567890');

            expect(result).not.toBeNull();
            expect(axios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: expect.objectContaining({
                        bizr_no: '1234567890'
                    })
                })
            );
        });
    });

    describe('통계 데이터 수집', () => {
        test('여러 API에서 데이터 수집 성공', async () => {
            const mockOpenDartData = {
                companyName: '삼성전자',
                employeeCount: 100000
            };

            const mockKosisData = {
                industryTurnoverRate: '12.5%',
                industryAvgSalary: '4500만원'
            };

            // 모킹
            jest.spyOn(externalApiService, 'getCompanyDataFromOpenDart')
                .mockResolvedValue(mockOpenDartData);
            jest.spyOn(externalApiService, 'getIndustryDataFromKosis')
                .mockResolvedValue(mockKosisData);
            jest.spyOn(externalApiService, 'getPublicDataFromAPI')
                .mockResolvedValue(null);

            const result = await externalApiService.collectStatisticsFromAPIs(
                '삼성전자',
                null,
                2024,
                null
            );

            expect(result.companyName).toBe('삼성전자');
            expect(result.employeeCount).toBe(100000);
            expect(result.industryTurnoverRate).toBe('12.5%');
            expect(result.dataSource).toContain('OpenDart API');
        });

        test('캐시된 데이터 사용', async () => {
            const cachedData = {
                companyName: '삼성전자',
                employeeCount: 100000
            };

            // 캐시 키 형식: statistics_${compName}_${businessNumber || 'no_biz'}_${year}_${quarter}
            externalApiService.setCache('statistics_삼성전자_no_biz_2024_null', cachedData);

            const result = await externalApiService.collectStatisticsFromAPIs(
                '삼성전자',
                null,
                2024,
                null
            );

            expect(result).toEqual(cachedData);
            // API 호출이 발생하지 않아야 함
            expect(externalApiService.getCompanyDataFromOpenDart).not.toHaveBeenCalled();
        });
    });

    describe('통계 업데이트', () => {
        test('새로운 통계 데이터 생성', async () => {
            const mockStatisticsData = {
                companyName: '삼성전자',
                employeeCount: 100000
            };

            jest.spyOn(externalApiService, 'collectStatisticsFromAPIs')
                .mockResolvedValue(mockStatisticsData);

            CompStatistics.findOne = jest.fn().mockResolvedValue(null);
            CompStatistics.create = jest.fn().mockResolvedValue({
                compIdx: 1,
                year: 2024,
                ...mockStatisticsData
            });

            const result = await externalApiService.updateCompanyStatistics(
                1,
                '삼성전자',
                null,
                2024,
                null
            );

            expect(result.success).toBe(true);
            expect(CompStatistics.create).toHaveBeenCalled();
        });

        test('기존 통계 데이터 업데이트', async () => {
            const mockStatisticsData = {
                companyName: '삼성전자',
                employeeCount: 100000
            };

            const existingData = {
                compIdx: 1,
                year: 2024,
                update: jest.fn().mockResolvedValue(true)
            };

            jest.spyOn(externalApiService, 'collectStatisticsFromAPIs')
                .mockResolvedValue(mockStatisticsData);

            CompStatistics.findOne = jest.fn().mockResolvedValue(existingData);

            const result = await externalApiService.updateCompanyStatistics(
                1,
                '삼성전자',
                null,
                2024,
                null
            );

            expect(result.success).toBe(true);
            expect(existingData.update).toHaveBeenCalled();
        });
    });

    describe('헬스체크', () => {
        test('API 헬스체크 성공', async () => {
            axios.get.mockResolvedValue({ status: 200 });

            const health = await externalApiService.checkApiHealth();

            expect(health.timestamp).toBeDefined();
            expect(health.apis).toBeDefined();
            expect(health.apis.openDart).toBeDefined();
        });
    });

    describe('계산 함수', () => {
        test('평균값 계산', () => {
            const numbers = [1, 2, 3, 4, 5];
            const avg = externalApiService.calculateAverage(numbers);
            expect(avg).toBe(3);
        });

        test('빈 배열의 평균값은 0', () => {
            const avg = externalApiService.calculateAverage([]);
            expect(avg).toBe(0);
        });

        test('중간값 계산 (홀수)', () => {
            const numbers = [1, 2, 3, 4, 5];
            const median = externalApiService.calculateMedian(numbers);
            expect(median).toBe(3);
        });

        test('중간값 계산 (짝수)', () => {
            const numbers = [1, 2, 3, 4];
            const median = externalApiService.calculateMedian(numbers);
            expect(median).toBe(3); // (2+3)/2 = 2.5 -> 3
        });
    });
});

