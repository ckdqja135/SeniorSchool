# 회사 데이터 자동 업데이트 스케줄러

OpenDart API를 활용하여 매일 자동으로 회사 정보를 업데이트하는 스케줄러입니다.

## 📋 설치 및 설정

### 1. 패키지 설치

```bash
cd Backend
npm install node-cron
```

### 2. 데이터베이스 마이그레이션

```sql
-- Backend/DDL/ddl_add_company_financial_columns.sql 실행
mysql -u your_username -p your_database < DDL/ddl_add_company_financial_columns.sql
```

### 3. 환경 변수 설정

`.env` 파일에 OpenDart API 키가 설정되어 있는지 확인:

```env
OPENDART_API_KEY=your_api_key_here
OPENDART_API_URL=https://opendart.fss.or.kr/api
```

### 4. app.js에 스케줄러 연동

`Backend/app.js`에 다음 코드 추가:

```javascript
// 스케줄러 시작
const companyDataScheduler = require('./scheduler/companyDataScheduler');
companyDataScheduler.start();
```

### 5. 관리자 API 라우터 연동

`Backend/routes/admin/index.js` 또는 메인 라우터에 추가:

```javascript
const schedulerRouter = require('./admin/companyDataScheduler.router');
app.use('/admin/scheduler', schedulerRouter);
```

## 🚀 사용법

### 자동 실행
스케줄러는 **매일 새벽 2시**에 자동으로 실행됩니다.

### 수동 실행

#### API로 실행
```bash
# 스케줄러 상태 확인
curl http://localhost:3000/admin/scheduler/status

# 즉시 업데이트 실행
curl -X POST http://localhost:3000/admin/scheduler/run-now
```

#### 스크립트로 실행
```bash
node -e "require('./scheduler/companyDataScheduler').runUpdateNow()"
```

## 📊 업데이트되는 데이터

### 직원 정보
- `compEmployeeCount`: 직원 수
- `totalEmployees`: 총 직원 수
- `compAvgSalary`: 평균 연봉 (원)
- `compAvgTenure`: 평균 근속 연수 (년)

### 재무 정보
- `compSales`: 매출액 (원)
- `compOperatingProfit`: 영업이익 (원)
- `compNetIncome`: 당기순이익 (원)
- `compTotalAssets`: 자산총계 (원)
- `compTotalLiabilities`: 부채총계 (원)
- `compTotalEquity`: 자본총계 (원)
- `compCapital`: 자본금 (원)

### 기타 정보
- `compCEO`: 대표자명
- `compURL`: 홈페이지
- `compAddr`: 주소
- `compCorpCode`: OpenDart 고유번호
- `compDataUpdatedAt`: 데이터 업데이트 일시

## 📝 로그 확인

```bash
# 실시간 로그 확인
tail -f logs/backend-$(date +%Y-%m-%d).log

# 스케줄러 로그 필터링
tail -f logs/backend-$(date +%Y-%m-%d).log | grep CompanyDataScheduler
```

## ⚙️ 설정 변경

### 스케줄 시간 변경

`Backend/scheduler/companyDataScheduler.js` 파일의 `start()` 메서드에서:

```javascript
// 매일 새벽 2시 (기본값)
const schedule = '0 2 * * *';

// 다른 시간 예시:
// - 매일 오전 8시: '0 8 * * *'
// - 매주 월요일 오전 3시: '0 3 * * 1'
// - 매시간: '0 * * * *'
```

### API Rate Limiting 조정

업데이트 간 딜레이 조정 (기본 2초):

```javascript
// runUpdate() 메서드 내부
await this.sleep(2000); // 2000ms = 2초
```

## 🔍 문제 해결

### 1. 스케줄러가 실행되지 않음
- `app.js`에 `companyDataScheduler.start()`가 호출되는지 확인
- node-cron 패키지가 설치되었는지 확인
- 로그에서 에러 메시지 확인

### 2. 데이터가 업데이트되지 않음
- OpenDart API 키가 유효한지 확인
- 회사명이 OpenDart에 등록되어 있는지 확인
- `compStatus = 1` (활성) 상태인지 확인

### 3. API Rate Limit 에러
- 딜레이 시간을 늘려주세요 (2초 → 3초)
- OpenDart API 요청 한도 확인

## 📌 주의사항

1. **대용량 업데이트**: 회사가 많을 경우 (100개+) 완료까지 시간이 오래 걸립니다.
2. **API 한도**: OpenDart API는 하루 10,000건 제한이 있습니다.
3. **동시 실행 방지**: 이미 실행 중일 때는 새로운 업데이트가 시작되지 않습니다.
4. **에러 핸들링**: 일부 회사 실패해도 계속 진행됩니다.

## 📈 모니터링

### 상태 확인 API
```javascript
GET /admin/scheduler/status

{
  "success": true,
  "data": {
    "isRunning": false,
    "lastRunTime": "2025-11-10T17:00:00.000Z",
    "stats": {
      "totalCompanies": 100,
      "successCount": 95,
      "failedCount": 3,
      "skippedCount": 2,
      "duration": 350
    }
  }
}
```

## 🛠️ 테스트

```bash
# 테스트 실행
cd Backend/scheduler
node -e "
const scheduler = require('./companyDataScheduler');
scheduler.runUpdateNow();
"
```

