/**
 * 환경변수 확인 스크립트
 * OpenDart API 키 설정이 제대로 되어 있는지 확인
 */

const path = require('path');
const fs = require('fs');

// .env 파일 경로를 명시적으로 지정
const envPath = path.join(__dirname, '../.env');
console.log(`\n📁 .env 파일 경로: ${envPath}`);
console.log(`📁 .env 파일 존재: ${fs.existsSync(envPath) ? '✅ 예' : '❌ 아니오'}\n`);

require('dotenv').config({ path: envPath });

console.log('\n========================================');
console.log('환경변수 확인');
console.log('========================================\n');

// 1. .env 파일 로드 확인
console.log('1️⃣  dotenv 로드: ✅ 성공\n');

// 2. OpenDart API 키 확인
console.log('2️⃣  OpenDart API 키 확인:');
const apiKey = process.env.OPENDART_API_KEY;

if (!apiKey) {
    console.log('   ❌ OPENDART_API_KEY가 설정되지 않았습니다.');
    console.log('\n📝 해결 방법:');
    console.log('   1. .env 파일을 열어주세요');
    console.log('   2. 다음 형식으로 작성되어 있는지 확인:');
    console.log('      OPENDART_API_KEY=여기에키값');
    console.log('      (등호 앞뒤에 공백 없음, 따옴표 없음)');
    console.log('   3. .env 파일이 Backend 폴더에 있는지 확인');
    console.log('   4. 파일명이 정확히 ".env" 인지 확인 (.env.example 아님)\n');
} else {
    console.log(`   ✅ 설정됨: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`   길이: ${apiKey.length}자`);
    
    // 공백이나 줄바꿈 확인
    if (apiKey.includes(' ')) {
        console.log('   ⚠️  경고: API 키에 공백이 포함되어 있습니다. 제거해주세요.');
    }
    if (apiKey.includes('\n') || apiKey.includes('\r')) {
        console.log('   ⚠️  경고: API 키에 줄바꿈이 포함되어 있습니다. 제거해주세요.');
    }
    if (apiKey.startsWith('"') || apiKey.startsWith("'")) {
        console.log('   ⚠️  경고: API 키가 따옴표로 시작합니다. 따옴표를 제거해주세요.');
    }
    
    console.log();
}

// 3. 다른 환경변수들도 확인
console.log('3️⃣  기타 API 키 확인:');

const kosis = process.env.KOSIS_API_KEY;
const publicData = process.env.PUBLIC_DATA_API_KEY;

console.log(`   KOSIS_API_KEY: ${kosis ? '✅ 설정됨' : '❌ 미설정'}`);
console.log(`   PUBLIC_DATA_API_KEY: ${publicData ? '✅ 설정됨' : '❌ 미설정'}`);

console.log('\n========================================');
console.log('4️⃣  전체 환경변수 목록 (OPENDART 관련):');
console.log('========================================\n');

// OpenDart 관련 환경변수 모두 출력
Object.keys(process.env).forEach(key => {
    if (key.includes('OPENDART') || key.includes('OPEN_DART')) {
        const value = process.env[key];
        console.log(`   ${key} = ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
    }
});

console.log('\n========================================');
console.log('5️⃣  .env 파일 위치 확인:');
console.log('========================================\n');

const possiblePaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'Backend/.env')
];

console.log('   확인된 .env 파일 위치:');
possiblePaths.forEach(p => {
    if (fs.existsSync(p)) {
        console.log(`   ✅ ${p}`);
        
        // 파일 내용 미리보기 (첫 5줄만, 민감정보 마스킹)
        try {
            const content = fs.readFileSync(p, 'utf8');
            const lines = content.split('\n').slice(0, 20);
            console.log('\n   📄 .env 파일 내용 미리보기 (OpenDart 관련):');
            lines.forEach((line, idx) => {
                if (line.includes('OPENDART') || line.includes('OPEN_DART')) {
                    // API 키 값 마스킹
                    const masked = line.replace(/=(.+)$/, (match, key) => {
                        if (key.length > 10) {
                            return `=${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
                        }
                        return `=***`;
                    });
                    console.log(`      ${idx + 1}: ${masked}`);
                }
            });
        } catch (err) {
            console.log(`   ⚠️  파일을 읽을 수 없습니다: ${err.message}`);
        }
    }
});

console.log('\n========================================');
console.log('6️⃣  OpenDart API 연결 테스트:');
console.log('========================================\n');

if (apiKey) {
    const axios = require('axios');
    
    (async () => {
        try {
            console.log('   OpenDart API 서버 연결 중...\n');
            
            // 간단한 API 호출 테스트 (회사 목록 조회)
            const response = await axios.get('https://opendart.fss.or.kr/api/list.json', {
                params: {
                    crtfc_key: apiKey,
                    corp_name: '삼성전자'
                },
                timeout: 10000
            });
            
            if (response.data.status === '000') {
                console.log('   ✅ API 연결 성공!');
                console.log(`   응답 상태: ${response.data.status} (정상)`);
                if (response.data.list && response.data.list.length > 0) {
                    console.log(`   검색 결과: ${response.data.list.length}개 회사 발견`);
                    console.log(`   예시: ${response.data.list[0].corp_name} (${response.data.list[0].corp_code})`);
                }
                console.log('\n   🎉 OpenDart API 키가 정상적으로 작동합니다!\n');
            } else {
                console.log(`   ❌ API 오류: ${response.data.status}`);
                console.log(`   메시지: ${response.data.message || '알 수 없는 오류'}\n`);
                
                if (response.data.status === '010') {
                    console.log('   💡 해결 방법: API 키가 유효하지 않습니다.');
                    console.log('      - OpenDart 사이트에서 발급한 키를 다시 확인해주세요');
                    console.log('      - https://opendart.fss.or.kr\n');
                }
            }
        } catch (error) {
            console.log(`   ❌ 연결 실패: ${error.message}`);
            
            if (error.code === 'ENOTFOUND') {
                console.log('   💡 인터넷 연결을 확인해주세요.\n');
            } else if (error.response) {
                console.log(`   응답 코드: ${error.response.status}`);
                console.log(`   응답 메시지: ${JSON.stringify(error.response.data)}\n`);
            }
        }
    })();
} else {
    console.log('   ⏭️  API 키가 설정되지 않아 연결 테스트를 건너뜁니다.\n');
}

