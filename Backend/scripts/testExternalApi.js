/**
 * 외부 API 서비스 실제 테스트 스크립트
 * 실제 API를 호출하여 동작을 확인합니다.
 * 
 * 사용법:
 * node scripts/testExternalApi.js
 */

const path = require('path');
const fs = require('fs');

// .env 파일 로드 (Backend 디렉토리 기준)
const envPath = path.join(__dirname, '..', '.env');
const envResult = require('dotenv').config({ path: envPath });

// .env 파일 확인
if (!fs.existsSync(envPath)) {
    console.warn(`⚠️  .env 파일을 찾을 수 없습니다: ${envPath}`);
    console.warn('   .env 파일을 생성하고 API Key를 설정하세요.');
    console.warn('   자세한 내용은 Backend/API_KEY_GUIDE.md를 참고하세요.\n');
} else if (envResult.error) {
    console.warn(`⚠️  .env 파일 로드 중 오류 발생: ${envResult.error.message}\n`);
}

const externalApiService = require('../service/externalApiService');
const logger = require('../utils/logger');

// 테스트할 회사 정보
const testCompanies = [
    {
        compIdx: 1,
        compName: '삼성전자주식회사',  // OpenDart 정식 등록명
        businessNumber: '1248100998'
    },
    {
        compIdx: 2,
        compName: '네이버주식회사',  // OpenDart 정식 등록명
        businessNumber: '2208100997'
    },
    {
        compIdx: 3,
        compName: '카카오주식회사',  // OpenDart 정식 등록명
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
    
    // API 키 확인
    if (!process.env.OPENDART_API_KEY) {
        console.log('❌ OpenDart API Key가 설정되지 않았습니다.');
        console.log('\n💡 API Key 설정 방법:');
        console.log('  1. https://opendart.fss.or.kr 에서 회원가입 및 API Key 발급');
        console.log('  2. .env 파일에 다음을 추가:');
        console.log('     OPENDART_API_KEY=발급받은_API_Key');
        console.log('  3. 자세한 내용은 Backend/API_KEY_GUIDE.md 참고\n');
        return;
    }
    
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
                console.log(`  - 시가총액: ${result.marketCap || 'N/A'}`);
                console.log(`  - 직원 수: ${result.employeeCount || 'N/A'}명`);
            } else {
                console.log('❌ 데이터를 찾을 수 없습니다.');
                console.log('  💡 가능한 원인:');
                console.log('     - OpenDart에 등록되지 않은 회사명일 수 있습니다');
                console.log('     - 회사명이 정확하지 않을 수 있습니다 (예: "삼성전자" vs "삼성전자주식회사")');
                console.log('     - 사업자등록번호를 확인해보세요');
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
    
    // API 키 확인
    if (!process.env.KOSIS_API_KEY) {
        console.log('❌ KOSIS API Key가 설정되지 않았습니다.');
        console.log('\n💡 API Key 설정 방법:');
        console.log('  1. https://kosis.kr 에서 회원가입 및 API Key 발급');
        console.log('  2. .env 파일에 다음을 추가:');
        console.log('     KOSIS_API_KEY=발급받은_API_Key');
        console.log('     KOSIS_TBL_ID=통계표_ID (선택사항)');
        console.log('  3. 자세한 내용은 Backend/API_KEY_GUIDE.md 참고\n');
        return;
    }
    
    for (const company of testCompanies) {
        try {
            console.log(`\n[${company.compName}] 산업 통계 조회 중...`);
            const result = await externalApiService.getIndustryDataFromKosis(
                company.compName,
                company.businessNumber
            );
            
            if (result) {
                console.log('✅ 성공:');
                console.log(`  - 데이터 항목 수: ${result.dataCount || 0}개`);
                if (result.industryTurnoverRate) {
                    console.log(`  - 산업 평균 이직률: ${result.industryTurnoverRate}`);
                }
                if (result.industryAvgSalary) {
                    console.log(`  - 산업 평균 연봉: ${result.industryAvgSalary}`);
                }
                if (result.industryEmployeeCount) {
                    console.log(`  - 산업 평균 직원 수: ${result.industryEmployeeCount}`);
                }
                if (result.regionTurnoverRate) {
                    console.log(`  - 지역 이직률: ${result.regionTurnoverRate}`);
                }
                if (result.note) {
                    console.log(`  - 참고: ${result.note}`);
                }
                if (result.rawData && result.rawData.length > 0) {
                    console.log(`  - 원본 데이터 샘플 (첫 번째 항목):`);
                    console.log(`    ${JSON.stringify(result.rawData[0]).substring(0, 200)}...`);
                }
            } else {
                console.log('❌ 데이터를 찾을 수 없습니다.');
                console.log('  💡 KOSIS API 사용 방법:');
                console.log('     1. KOSIS_TBL_ID 환경변수 설정 (선택사항, 기본값 사용 가능)');
                console.log('     2. https://kosis.kr 에서 원하는 통계표 검색');
                console.log('     3. 통계표 ID를 확인하고 환경변수에 설정');
                console.log('     4. 예: 고용통계, 산업별 고용현황, 전국사업체조사 등');
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
    
    // API 키 확인
    if (!process.env.PUBLIC_DATA_API_KEY) {
        console.log('❌ Public Data API Key가 설정되지 않았습니다.');
        console.log('\n💡 API Key 설정 방법:');
        console.log('  1. https://www.data.go.kr 에서 회원가입 및 API Key 발급');
        console.log('  2. 원하는 데이터셋을 찾아 활용신청');
        console.log('  3. .env 파일에 다음을 추가:');
        console.log('     PUBLIC_DATA_API_KEY=발급받은_API_Key');
        console.log('  4. 자세한 내용은 Backend/API_KEY_GUIDE.md 참고\n');
        return;
    }
    
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
                console.log('  💡 공공데이터 API는 실제 서비스 엔드포인트 설정이 필요합니다');
                console.log('     - https://www.data.go.kr 에서 필요한 데이터셋을 찾으세요');
                console.log('     - 해당 API의 엔드포인트 URL을 설정하세요');
                console.log('     - 현재는 프레임워크 구조만 제공됩니다');
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
    
    // API 키 확인
    const hasAnyApiKey = process.env.OPENDART_API_KEY || 
                         process.env.KOSIS_API_KEY || 
                         process.env.PUBLIC_DATA_API_KEY;
    
    if (!hasAnyApiKey) {
        console.log('❌ 모든 API Key가 설정되지 않았습니다.');
        console.log('\n💡 최소 하나의 API Key를 설정해주세요:');
        console.log('  - OpenDart API: OPENDART_API_KEY');
        console.log('  - KOSIS API: KOSIS_API_KEY');
        console.log('  - Public Data API: PUBLIC_DATA_API_KEY');
        console.log('\n  자세한 내용은 Backend/API_KEY_GUIDE.md 참고\n');
        return;
    }
    
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
        
        if (Object.keys(result.apiResponseData || {}).length === 0) {
            console.log('\n⚠️ 수집된 데이터가 없습니다.');
            console.log('   API Key가 제대로 설정되었는지 확인하세요.');
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
    
    // .env 파일 경로 표시
    const envPath = path.join(__dirname, '..', '.env');
    console.log(`📁 .env 파일 경로: ${envPath}`);
    if (fs.existsSync(envPath)) {
        console.log('   ✅ .env 파일 존재 확인\n');
    } else {
        console.log('   ❌ .env 파일이 없습니다\n');
    }
    
    // 환경 변수 확인
    console.log('📋 환경 설정 확인:');
    const hasOpenDart = !!process.env.OPENDART_API_KEY;
    const hasKosis = !!process.env.KOSIS_API_KEY;
    const hasPublicData = !!process.env.PUBLIC_DATA_API_KEY;
    
    console.log(`  - OpenDart API Key: ${hasOpenDart ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`  - KOSIS API Key: ${hasKosis ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`  - Public Data API Key: ${hasPublicData ? '✅ 설정됨' : '❌ 미설정'}`);
    
    if (!hasOpenDart && !hasKosis && !hasPublicData) {
        console.log('\n⚠️  모든 API Key가 설정되지 않았습니다.');
        console.log('   API 테스트를 사용하려면 최소 하나의 API Key가 필요합니다.');
        console.log(`   .env 파일(${envPath})을 생성하고 API Key를 설정하세요.`);
        console.log('   자세한 설정 방법은 Backend/API_KEY_GUIDE.md를 참고하세요.\n');
    }
    
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

