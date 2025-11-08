/**
 * 간단한 외부 API 테스트 스크립트
 * 
 * 사용법:
 * node testApi.js
 */

require('dotenv').config();
const externalApiService = require('./service/externalApiService');

async function quickTest() {
    console.log('🚀 외부 API 빠른 테스트 시작...\n');
    
    // 1. API 헬스체크
    console.log('1️⃣ API 헬스체크...');
    try {
        const health = await externalApiService.checkApiHealth();
        console.log(JSON.stringify(health, null, 2));
    } catch (error) {
        console.error('헬스체크 실패:', error.message);
    }
    
    console.log('\n---\n');
    
    // 2. OpenDart API 테스트
    console.log('2️⃣ OpenDart API 테스트 (삼성전자)...');
    try {
        const result = await externalApiService.getCompanyDataFromOpenDart('삼성전자', '1248100998');
        if (result) {
            console.log('✅ 성공:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ 데이터 없음');
        }
    } catch (error) {
        console.error('❌ 에러:', error.message);
    }
    
    console.log('\n---\n');
    
    // 3. 캐시 정보
    console.log('3️⃣ 캐시 정보...');
    const cacheInfo = externalApiService.getCacheInfo();
    console.log(JSON.stringify(cacheInfo, null, 2));
    
    console.log('\n---\n');
    
    // 4. 통합 테스트
    console.log('4️⃣ 통합 테스트 (모든 API)...');
    try {
        const result = await externalApiService.collectStatisticsFromAPIs(
            '삼성전자',
            '1248100998',
            2024,
            null
        );
        console.log('✅ 수집 완료:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ 에러:', error.message);
    }
    
    console.log('\n✅ 테스트 완료!');
    process.exit(0);
}

quickTest().catch(error => {
    console.error('❌ 치명적 에러:', error);
    process.exit(1);
});

