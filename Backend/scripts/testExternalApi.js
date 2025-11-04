/**
 * 외부 API 서비스 실제 테스트 스크립트
 * 실제 API를 호출하여 동작을 확인합니다.
 * 
 * 사용법:
 * node scripts/testExternalApi.js
 */

require('dotenv').config();
const externalApiService = require('../service/externalApiService');
const logger = require('../utils/logger');

// 테스트할 회사 정보
const testCompanies = [
    {
        compIdx: 1,
        compName: '삼성전자',
        businessNumber: '1248100998'
    },
    {
        compIdx: 2,
        compName: '네이버',
        businessNumber: '2208100997'
    },
    {
        compIdx: 3,
        compName: '카카오',
        businessNumber: '1208800767'
    }
];

/**
 * 테스트 메뉴 출력
 */
function printMenu() {
    console.log('\n========================================');
    console.log('   외부 API 서비스 테스트');
    console.log('========================================');
    console.log('1. OpenDart API 테스트 (회사 정보 조회)');
    console.log('2. KOSIS API 테스트 (산업별 통계)');
    console.log('3. 공공데이터 API 테스트');
    console.log('4. 통합 테스트 (모든 API 동시 호출)');
    console.log('5. 캐시 정보 조회');
    console.log('6. 캐시 초기화');
    console.log('7. API 헬스체크');
    console.log('8. 회사 통계 업데이트 (DB 저장)');
    console.log('9. 일괄 업데이트 (여러 회사)');
    console.log('0. 종료');
    console.log('========================================\n');
}

/**
 * 1. OpenDart API 테스트
 */
async function testOpenDartAPI() {
    console.log('\n📊 OpenDart API 테스트 시작...\n');
    
    for (const company of testCompanies) {
        try {
            console.log(`\n[${company.compName}] 정보 조회 중...`);
            const result = await externalApiService.getCompanyDataFromOpenDart(
                company.compName,
                company.businessNumber
            );
            
            if (result) {
                console.log('✅ 성공:');
                console.log(`  - 회사명: ${result.companyName}`);
                console.log(`  - 사업자번호: ${result.businessNumber}`);
                console.log(`  - 업종: ${result.industry}`);
                console.log(`  - 상장일: ${result.listingDate}`);
                console.log(`  - 시가총액: ${result.marketCap}`);
                console.log(`  - 직원 수: ${result.employeeCount}명`);
            } else {
                console.log('❌ 데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error(`❌ 에러: ${error.message}`);
        }
        
        // API Rate Limit 방지를 위한 대기
        await sleep(2000);
    }
}

/**
 * 2. KOSIS API 테스트
 */
async function testKosisAPI() {
    console.log('\n📊 KOSIS API 테스트 시작...\n');
    
    for (const company of testCompanies) {
        try {
            console.log(`\n[${company.compName}] 산업 통계 조회 중...`);
            const result = await externalApiService.getIndustryDataFromKosis(
                company.compName,
                company.businessNumber
            );
            
            if (result) {
                console.log('✅ 성공:');
                console.log(`  - 산업 평균 이직률: ${result.industryTurnoverRate}`);
                console.log(`  - 산업 평균 연봉: ${result.industryAvgSalary}`);
                console.log(`  - 산업 평균 직원 수: ${result.industryEmployeeCount}`);
                console.log(`  - 지역 이직률: ${result.regionTurnoverRate}`);
            } else {
                console.log('❌ 데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error(`❌ 에러: ${error.message}`);
        }
        
        await sleep(2000);
    }
}

/**
 * 3. 공공데이터 API 테스트
 */
async function testPublicDataAPI() {
    console.log('\n📊 공공데이터 API 테스트 시작...\n');
    
    for (const company of testCompanies) {
        try {
            console.log(`\n[${company.compName}] 공공 통계 조회 중...`);
            const result = await externalApiService.getPublicDataFromAPI(
                company.compName,
                company.businessNumber
            );
            
            if (result) {
                console.log('✅ 성공:');
                console.log(`  - 지역 고용 통계: ${result.regionEmploymentStats}`);
                console.log(`  - 산업 성장률: ${result.industryGrowthRate}`);
                console.log(`  - 경제 지표: ${result.economicIndicators}`);
            } else {
                console.log('❌ 데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error(`❌ 에러: ${error.message}`);
        }
        
        await sleep(2000);
    }
}

/**
 * 4. 통합 테스트
 */
async function testIntegrated() {
    console.log('\n📊 통합 테스트 시작 (모든 API 동시 호출)...\n');
    
    const company = testCompanies[0]; // 삼성전자로 테스트
    
    try {
        console.log(`[${company.compName}] 모든 API에서 데이터 수집 중...`);
        const result = await externalApiService.collectStatisticsFromAPIs(
            company.compName,
            company.businessNumber,
            2024,
            null
        );
        
        console.log('\n✅ 수집 완료:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.apiErrors && result.apiErrors.length > 0) {
            console.log('\n⚠️ 일부 API 에러:');
            result.apiErrors.forEach(error => {
                console.log(`  - ${error.api}: ${error.error}`);
            });
        }
    } catch (error) {
        console.error(`❌ 에러: ${error.message}`);
    }
}

/**
 * 5. 캐시 정보 조회
 */
function showCacheInfo() {
    console.log('\n📦 캐시 정보:\n');
    
    const cacheInfo = externalApiService.getCacheInfo();
    
    console.log(`전체 엔트리: ${cacheInfo.totalEntries}개`);
    console.log(`유효한 엔트리: ${cacheInfo.validEntries}개`);
    console.log(`만료된 엔트리: ${cacheInfo.expiredEntries}개\n`);
    
    if (cacheInfo.entries.length > 0) {
        console.log('캐시 상세:');
        cacheInfo.entries.forEach(entry => {
            const status = entry.expired ? '❌ 만료' : '✅ 유효';
            console.log(`  ${status} [${entry.age}초] ${entry.key}`);
        });
    } else {
        console.log('캐시가 비어있습니다.');
    }
}

/**
 * 6. 캐시 초기화
 */
function clearCache() {
    console.log('\n🗑️  캐시 초기화 중...');
    externalApiService.clearCache();
    console.log('✅ 캐시가 초기화되었습니다.');
}

/**
 * 7. API 헬스체크
 */
async function checkApiHealth() {
    console.log('\n🏥 API 헬스체크 시작...\n');
    
    try {
        const health = await externalApiService.checkApiHealth();
        
        console.log(`검사 시각: ${health.timestamp}\n`);
        
        Object.entries(health.apis).forEach(([apiName, status]) => {
            const icon = status.status === 'healthy' ? '✅' : '❌';
            const configIcon = status.configured ? '🔑' : '⚠️';
            
            console.log(`${icon} ${apiName}:`);
            console.log(`  상태: ${status.status}`);
            console.log(`  API 키 설정: ${configIcon} ${status.configured ? '설정됨' : '미설정'}`);
            
            if (status.responseTime) {
                console.log(`  응답 시간: ${status.responseTime}ms`);
            }
            if (status.error) {
                console.log(`  에러: ${status.error}`);
            }
            console.log('');
        });
    } catch (error) {
        console.error(`❌ 헬스체크 실패: ${error.message}`);
    }
}

/**
 * 8. 회사 통계 업데이트 (DB 저장)
 */
async function updateCompanyStatistics() {
    console.log('\n💾 회사 통계 업데이트 (DB 저장)...\n');
    
    const company = testCompanies[0]; // 삼성전자로 테스트
    
    try {
        console.log(`[${company.compName}] 통계 업데이트 중...`);
        const result = await externalApiService.updateCompanyStatistics(
            company.compIdx,
            company.compName,
            company.businessNumber,
            2024,
            null
        );
        
        if (result.success) {
            console.log('✅ 성공:');
            console.log(`  메시지: ${result.message}`);
            console.log(`  데이터:`, result.data);
        } else {
            console.log(`❌ 실패: ${result.message}`);
        }
    } catch (error) {
        console.error(`❌ 에러: ${error.message}`);
    }
}

/**
 * 9. 일괄 업데이트
 */
async function batchUpdate() {
    console.log('\n📦 일괄 업데이트 시작...\n');
    
    try {
        const companies = testCompanies.map(c => ({
            ...c,
            year: 2024
        }));
        
        console.log(`${companies.length}개 회사 업데이트 중...`);
        const result = await externalApiService.batchUpdateCompanyStatistics(companies);
        
        console.log('\n✅ 일괄 업데이트 완료:');
        console.log(`  성공: ${result.success}개`);
        console.log(`  실패: ${result.failed}개`);
        
        if (result.errors.length > 0) {
            console.log('\n❌ 실패 목록:');
            result.errors.forEach(error => {
                console.log(`  - ${error.compName}: ${error.error}`);
            });
        }
    } catch (error) {
        console.error(`❌ 에러: ${error.message}`);
    }
}

/**
 * 유틸리티: 대기 함수
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 사용자 입력 받기
 */
function getUserInput(prompt) {
    return new Promise(resolve => {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question(prompt, answer => {
            readline.close();
            resolve(answer.trim());
        });
    });
}

/**
 * 메인 함수
 */
async function main() {
    console.log('\n🚀 외부 API 서비스 테스트 도구를 시작합니다...\n');
    
    // 환경 변수 확인
    console.log('📋 환경 설정 확인:');
    console.log(`  - OpenDart API Key: ${process.env.OPENDART_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`  - KOSIS API Key: ${process.env.KOSIS_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`  - Public Data API Key: ${process.env.PUBLIC_DATA_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
    
    let running = true;
    
    while (running) {
        printMenu();
        const choice = await getUserInput('선택하세요 (0-9): ');
        
        switch (choice) {
            case '1':
                await testOpenDartAPI();
                break;
            case '2':
                await testKosisAPI();
                break;
            case '3':
                await testPublicDataAPI();
                break;
            case '4':
                await testIntegrated();
                break;
            case '5':
                showCacheInfo();
                break;
            case '6':
                clearCache();
                break;
            case '7':
                await checkApiHealth();
                break;
            case '8':
                await updateCompanyStatistics();
                break;
            case '9':
                await batchUpdate();
                break;
            case '0':
                console.log('\n👋 프로그램을 종료합니다.\n');
                running = false;
                process.exit(0);
                break;
            default:
                console.log('\n❌ 잘못된 선택입니다. 0-9 사이의 숫자를 입력하세요.\n');
        }
        
        if (running) {
            await getUserInput('\nEnter를 눌러 계속...');
        }
    }
}

// 스크립트 실행
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 치명적 에러:', error);
        process.exit(1);
    });
}

module.exports = {
    testOpenDartAPI,
    testKosisAPI,
    testPublicDataAPI,
    testIntegrated,
    showCacheInfo,
    clearCache,
    checkApiHealth,
    updateCompanyStatistics,
    batchUpdate
};

