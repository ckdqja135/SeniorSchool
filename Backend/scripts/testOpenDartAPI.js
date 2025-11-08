/**
 * OpenDART API 테스트 스크립트
 * 새로 추가된 기능 테스트:
 * 1. corpCode.xml 다운로드 및 파싱
 * 2. empSttus.json API - 직원 현황
 * 3. fnlttSinglAcntAll.json API - 재무제표 (매출액)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const externalApiService = require('../service/externalApiService');
const logger = require('../utils/logger');

// 테스트할 회사 목록
const TEST_COMPANIES = [
    '삼성전자',
    'SK하이닉스',
    '현대자동차',
    'LG전자',
    '네이버'
];

/**
 * 1. corpCode.xml 다운로드 및 파싱 테스트
 */
async function testCorpCodeDownload() {
    console.log('\n========================================');
    console.log('1. corpCode.xml 다운로드 및 파싱 테스트');
    console.log('========================================\n');

    try {
        const corpCodeMap = await externalApiService.downloadAndParseCorpCode();
        console.log(`✅ corpCode.xml 다운로드 성공`);
        console.log(`   총 ${corpCodeMap.size}개 회사 정보 로드됨\n`);

        // 샘플 데이터 출력
        let count = 0;
        for (const [corpName, info] of corpCodeMap.entries()) {
            if (count < 5) {
                console.log(`   - ${corpName}: ${info.corp_code} (종목코드: ${info.stock_code || 'N/A'})`);
                count++;
            } else {
                break;
            }
        }
        
        return true;
    } catch (error) {
        console.error(`❌ corpCode.xml 다운로드 실패: ${error.message}`);
        return false;
    }
}

/**
 * 2. corp_code 조회 테스트
 */
async function testGetCorpCode() {
    console.log('\n========================================');
    console.log('2. corp_code 조회 테스트');
    console.log('========================================\n');

    let successCount = 0;
    let failCount = 0;

    for (const compName of TEST_COMPANIES) {
        try {
            const corpCode = await externalApiService.getCorpCode(compName);
            if (corpCode) {
                console.log(`✅ ${compName}: ${corpCode}`);
                successCount++;
            } else {
                console.log(`❌ ${compName}: corp_code를 찾을 수 없음`);
                failCount++;
            }
        } catch (error) {
            console.error(`❌ ${compName}: 오류 - ${error.message}`);
            failCount++;
        }
    }

    console.log(`\n결과: 성공 ${successCount}개, 실패 ${failCount}개\n`);
    return successCount > 0;
}

/**
 * 3. 직원 현황 조회 테스트 (empSttus.json)
 */
async function testEmployeeStatus() {
    console.log('\n========================================');
    console.log('3. 직원 현황 조회 테스트 (empSttus.json)');
    console.log('========================================\n');

    const testCompany = TEST_COMPANIES[0]; // 삼성전자
    const year = 2023;

    try {
        // corp_code 조회
        const corpCode = await externalApiService.getCorpCode(testCompany);
        if (!corpCode) {
            console.error(`❌ ${testCompany}의 corp_code를 찾을 수 없음`);
            return false;
        }

        console.log(`테스트 회사: ${testCompany} (corp_code: ${corpCode})`);
        console.log(`조회 연도: ${year}\n`);

        // 직원 현황 조회
        const employeeStatus = await externalApiService.getEmployeeStatus(corpCode, year, '11011');
        
        if (employeeStatus) {
            console.log('✅ 직원 현황 조회 성공\n');
            console.log(`📊 직원 현황 요약:`);
            console.log(`   - 연도: ${employeeStatus.year}`);
            console.log(`   - 총 직원 수: ${employeeStatus.totalCount?.toLocaleString() || 'N/A'}명`);
            console.log(`   - 평균 연봉: ${employeeStatus.avgSalary?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 평균 근속: ${employeeStatus.avgTenure?.toLocaleString() || 'N/A'}년`);
            console.log(`   - 세부 데이터 항목: ${employeeStatus.employees?.length || 0}개\n`);

            // 세부 데이터 샘플 출력
            if (employeeStatus.employees && employeeStatus.employees.length > 0) {
                console.log('📋 세부 데이터 (최대 5개):');
                employeeStatus.employees.slice(0, 5).forEach((emp, idx) => {
                    console.log(`   ${idx + 1}. ${emp.employmentType || 'N/A'} (${emp.sexDivision || 'N/A'})`);
                    console.log(`      직원수: ${emp.employeeCount?.toLocaleString() || 'N/A'}명, 평균연봉: ${emp.avgSalary?.toLocaleString() || 'N/A'}원`);
                });
            }

            return true;
        } else {
            console.error(`❌ 직원 현황 조회 실패`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 직원 현황 조회 오류: ${error.message}`);
        return false;
    }
}

/**
 * 4. 재무제표 조회 테스트 (fnlttSinglAcntAll.json)
 */
async function testFinancialStatement() {
    console.log('\n========================================');
    console.log('4. 재무제표 조회 테스트 (fnlttSinglAcntAll.json)');
    console.log('========================================\n');

    const testCompany = TEST_COMPANIES[0]; // 삼성전자
    const year = 2023;

    try {
        // corp_code 조회
        const corpCode = await externalApiService.getCorpCode(testCompany);
        if (!corpCode) {
            console.error(`❌ ${testCompany}의 corp_code를 찾을 수 없음`);
            return false;
        }

        console.log(`테스트 회사: ${testCompany} (corp_code: ${corpCode})`);
        console.log(`조회 연도: ${year}\n`);

        // 재무제표 조회
        const financialStatement = await externalApiService.getFinancialStatement(corpCode, year, '11011', 'CFS');
        
        if (financialStatement) {
            console.log('✅ 재무제표 조회 성공\n');
            console.log(`💰 재무제표 요약:`);
            console.log(`   - 연도: ${financialStatement.year}`);
            console.log(`   - 재무제표 구분: ${financialStatement.fsDiv === 'CFS' ? '연결재무제표' : '별도재무제표'}`);
            console.log(`   - 매출액: ${financialStatement.revenue?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 영업이익: ${financialStatement.operatingProfit?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 당기순이익: ${financialStatement.netIncome?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 자산총계: ${financialStatement.totalAssets?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 부채총계: ${financialStatement.totalLiabilities?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 자본총계: ${financialStatement.totalEquity?.toLocaleString() || 'N/A'}원\n`);

            return true;
        } else {
            console.error(`❌ 재무제표 조회 실패`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 재무제표 조회 오류: ${error.message}`);
        return false;
    }
}

/**
 * 5. 통합 회사 정보 조회 테스트 (개선된 getCompanyDataFromOpenDart)
 */
async function testIntegratedCompanyData() {
    console.log('\n========================================');
    console.log('5. 통합 회사 정보 조회 테스트');
    console.log('========================================\n');

    const testCompany = TEST_COMPANIES[0]; // 삼성전자
    const year = 2023;

    try {
        console.log(`테스트 회사: ${testCompany}`);
        console.log(`조회 연도: ${year}\n`);

        // 통합 회사 정보 조회
        const companyData = await externalApiService.getCompanyDataFromOpenDart(testCompany, null, year);
        
        if (companyData) {
            console.log('✅ 통합 회사 정보 조회 성공\n');
            console.log(`🏢 기본 정보:`);
            console.log(`   - 회사명: ${companyData.companyName || 'N/A'}`);
            console.log(`   - corp_code: ${companyData.corpCode || 'N/A'}`);
            console.log(`   - 사업자번호: ${companyData.businessNumber || 'N/A'}`);
            console.log(`   - 업종: ${companyData.industry || 'N/A'}`);
            console.log(`   - 대표자명: ${companyData.ceoName || 'N/A'}`);
            console.log(`   - 홈페이지: ${companyData.homepage || 'N/A'}`);
            console.log(`   - 주소: ${companyData.address || 'N/A'}\n`);

            console.log(`👥 직원 정보:`);
            console.log(`   - 직원 수: ${companyData.employeeCount?.toLocaleString() || 'N/A'}명`);
            console.log(`   - 평균 연봉: ${companyData.avgSalary?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 평균 근속: ${companyData.avgTenure?.toLocaleString() || 'N/A'}년\n`);

            console.log(`💰 재무 정보:`);
            console.log(`   - 매출액: ${companyData.revenue?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 영업이익: ${companyData.operatingProfit?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 당기순이익: ${companyData.profit?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 자산총계: ${companyData.assets?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 부채총계: ${companyData.liabilities?.toLocaleString() || 'N/A'}원`);
            console.log(`   - 자본총계: ${companyData.equity?.toLocaleString() || 'N/A'}원\n`);

            console.log(`📌 데이터 출처: ${companyData.dataSource}\n`);

            return true;
        } else {
            console.error(`❌ 통합 회사 정보 조회 실패`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 통합 회사 정보 조회 오류: ${error.message}`);
        return false;
    }
}

/**
 * 메인 테스트 함수
 */
async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║     OpenDART API 기능 테스트 시작                 ║');
    console.log('╚════════════════════════════════════════════════════╝');

    // API Key 확인
    if (!process.env.OPENDART_API_KEY) {
        console.error('\n❌ 오류: OPENDART_API_KEY 환경변수가 설정되지 않았습니다.');
        console.error('   .env 파일에 OPENDART_API_KEY를 추가해주세요.\n');
        process.exit(1);
    }

    console.log(`\n✅ API Key 확인 완료: ${process.env.OPENDART_API_KEY.substring(0, 8)}...`);

    const results = {
        total: 5,
        passed: 0,
        failed: 0
    };

    // 테스트 실행
    try {
        // Test 1: corpCode.xml 다운로드
        if (await testCorpCodeDownload()) results.passed++;
        else results.failed++;
        await sleep(2000);

        // Test 2: corp_code 조회
        if (await testGetCorpCode()) results.passed++;
        else results.failed++;
        await sleep(2000);

        // Test 3: 직원 현황 조회
        if (await testEmployeeStatus()) results.passed++;
        else results.failed++;
        await sleep(2000);

        // Test 4: 재무제표 조회
        if (await testFinancialStatement()) results.passed++;
        else results.failed++;
        await sleep(2000);

        // Test 5: 통합 회사 정보 조회
        if (await testIntegratedCompanyData()) results.passed++;
        else results.failed++;

    } catch (error) {
        console.error(`\n❌ 테스트 실행 중 오류 발생: ${error.message}`);
        console.error(error.stack);
    }

    // 결과 요약
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║     테스트 결과 요약                               ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`   총 테스트: ${results.total}개`);
    console.log(`   성공: ${results.passed}개 ✅`);
    console.log(`   실패: ${results.failed}개 ❌`);
    console.log(`   성공률: ${Math.round((results.passed / results.total) * 100)}%\n`);

    if (results.failed === 0) {
        console.log('🎉 모든 테스트가 성공적으로 완료되었습니다!\n');
    } else {
        console.log('⚠️  일부 테스트가 실패했습니다. 로그를 확인해주세요.\n');
    }

    process.exit(results.failed === 0 ? 0 : 1);
}

/**
 * Sleep 함수
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 테스트 실행
if (require.main === module) {
    runTests().catch(error => {
        console.error('테스트 실행 실패:', error);
        process.exit(1);
    });
}

module.exports = { runTests };

