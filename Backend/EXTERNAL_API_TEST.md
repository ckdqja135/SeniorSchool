# 외부 API 실제 테스트 가이드

## 준비사항

### 1. 환경 변수 설정

`.env` 파일에 실제 API 키를 설정하세요:

```env
# OpenDart API (금융감독원)
OPENDART_API_KEY=your_opendart_api_key_here
OPENDART_API_URL=https://opendart.fss.or.kr/api

# KOSIS API (통계청)
KOSIS_API_KEY=your_kosis_api_key_here
KOSIS_API_URL=https://kosis.kr/openapi

# 공공데이터포털 API
PUBLIC_DATA_API_KEY=your_public_data_api_key_here
PUBLIC_DATA_API_URL=https://apis.data.go.kr
```

### 2. API 키 발급 방법

#### OpenDart API 키
1. https://opendart.fss.or.kr 접속
2. 회원가입 및 로그인
3. API 신청 → API 키 발급

#### KOSIS API 키
1. https://kosis.kr 접속
2. 회원가입 및 로그인
3. 오픈API → 인증키 신청

#### 공공데이터포털 API 키
1. https://www.data.go.kr 접속
2. 회원가입 및 로그인
3. 데이터 찾기 → API 신청

## 테스트 방법

### 방법 1: 빠른 테스트 (추천)

간단하게 모든 기능을 한 번에 테스트:

```bash
cd Backend
node testApi.js
```

**실행 내용:**
1. API 헬스체크
2. OpenDart API 테스트 (삼성전자)
3. 캐시 정보 확인
4. 통합 테스트 (모든 API)

### 방법 2: 대화형 테스트

메뉴를 통해 원하는 테스트만 선택 실행:

```bash
cd Backend
node scripts/testExternalApi.js
```

**메뉴:**
```
1. OpenDart API 테스트 (회사 정보 조회)
2. KOSIS API 테스트 (산업별 통계)
3. 공공데이터 API 테스트
4. 통합 테스트 (모든 API 동시 호출)
5. 캐시 정보 조회
6. 캐시 초기화
7. API 헬스체크
8. 회사 통계 업데이트 (DB 저장)
9. 일괄 업데이트 (여러 회사)
0. 종료
```

### 방법 3: 프로그래밍 방식

직접 코드에서 호출:

```javascript
const externalApiService = require('./service/externalApiService');

async function test() {
    // 1. 회사 정보 조회
    const companyData = await externalApiService.getCompanyDataFromOpenDart(
        '삼성전자',
        '1248100998'
    );
    console.log(companyData);
    
    // 2. 통계 수집
    const stats = await externalApiService.collectStatisticsFromAPIs(
        '삼성전자',
        '1248100998',
        2024,
        null
    );
    console.log(stats);
    
    // 3. DB에 저장
    const result = await externalApiService.updateCompanyStatistics(
        1,              // compIdx
        '삼성전자',     // compName
        '1248100998',   // businessNumber
        2024,           // year
        null            // quarter
    );
    console.log(result);
}

test();
```

## 테스트 시나리오

### 시나리오 1: 기본 동작 확인

```bash
node testApi.js
```

1. API 연결 상태 확인
2. 데이터 조회 성공 여부
3. 캐시 동작 확인
4. 에러 처리 확인

### 시나리오 2: 캐싱 동작 확인

```bash
node scripts/testExternalApi.js
```

1. 메뉴 `4` 선택 - 통합 테스트 실행
2. 메뉴 `5` 선택 - 캐시 정보 확인 (30분간 유효)
3. 메뉴 `4` 다시 선택 - 캐시에서 빠르게 조회됨
4. 메뉴 `6` 선택 - 캐시 초기화
5. 메뉴 `4` 다시 선택 - API 재호출

### 시나리오 3: Rate Limiting 확인

```bash
node scripts/testExternalApi.js
```

1. 메뉴 `1` 선택 - OpenDart API 테스트
2. 여러 회사 정보를 순차적으로 조회
3. Rate Limit 로그 확인

### 시나리오 4: 재시도 로직 확인

인터넷 연결을 불안정하게 만든 후:

```bash
node testApi.js
```

로그에서 재시도 시도 확인:
```
[OpenDart] Request attempt 1/3
[OpenDart] Attempt 1 failed: ...
[OpenDart] Retrying in 1000ms...
[OpenDart] Request attempt 2/3
```

### 시나리오 5: DB 저장 테스트

```bash
node scripts/testExternalApi.js
```

1. 메뉴 `8` 선택 - 회사 통계 업데이트
2. DB에 저장 확인
3. 메뉴 `9` 선택 - 여러 회사 일괄 업데이트

## 예상 결과

### 성공 케이스

```json
{
  "success": true,
  "message": "회사 통계 정보가 성공적으로 업데이트되었습니다.",
  "data": {
    "compIdx": 1,
    "companyName": "삼성전자",
    "businessNumber": "1248100998",
    "employeeCount": 123456,
    "industry": "전자부품, 컴퓨터, 영상, 음향 및 통신장비 제조업",
    ...
  }
}
```

### 실패 케이스

```json
{
  "success": false,
  "message": "외부 API에서 데이터를 찾을 수 없습니다.",
  "data": null
}
```

## 문제 해결

### API 키가 없을 때
```
⚠️ [getCompanyDataFromOpenDart] API Key not configured
```
→ `.env` 파일에 API 키 설정

### Rate Limit 에러
```
[Rate Limit] openDart: waiting 1000ms
```
→ 정상 동작 (자동으로 대기 후 재시도)

### 타임아웃 에러
```
Error: timeout of 15000ms exceeded
```
→ 네트워크 연결 확인 또는 타임아웃 시간 조정

### 데이터 없음
```
❌ 데이터를 찾을 수 없습니다.
```
→ 회사명 또는 사업자등록번호 확인

## 로그 확인

테스트 실행 중 로그는 다음 위치에 저장됩니다:

```
Backend/logs/
  - combined-YYYY-MM-DD.log  (모든 로그)
  - error-YYYY-MM-DD.log     (에러만)
```

로그 레벨별 확인:
- `[INFO]`: 정상 동작
- `[WARN]`: 경고 (계속 실행)
- `[ERROR]`: 에러 (재시도 또는 실패)

## 성능 확인

### 캐시 효과 측정

1차 호출 (캐시 없음):
```
[collectStatisticsFromAPIs] Collected data from 3 APIs (0 errors)
Time: ~3000ms
```

2차 호출 (캐시 있음):
```
[Cache] Hit: statistics_삼성전자_1248100998_2024_null
Time: ~10ms
```

→ **300배 빠름!**

### Rate Limiting 효과

Rate Limit 없이:
```
429 Too Many Requests
```

Rate Limit 적용:
```
[Rate Limit] openDart: waiting 1000ms
→ 안전하게 재시도
```

## 테스트 체크리스트

- [ ] API 키가 모두 설정되었는가?
- [ ] API 헬스체크가 성공하는가?
- [ ] 회사 정보를 조회할 수 있는가?
- [ ] 캐싱이 정상 동작하는가?
- [ ] Rate Limiting이 동작하는가?
- [ ] 재시도 로직이 동작하는가?
- [ ] DB에 저장이 되는가?
- [ ] 에러가 적절히 처리되는가?

## 추가 정보

- **캐시 만료 시간**: 30분
- **재시도 횟수**: 3회
- **타임아웃**: 15초
- **Rate Limit**: 
  - OpenDart: 10 requests/sec
  - KOSIS: 5 requests/sec
  - Public Data: 10 requests/sec

