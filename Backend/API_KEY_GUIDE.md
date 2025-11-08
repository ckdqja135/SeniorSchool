# API 키 발급 가이드

## 📌 KOSIS API 키 발급 방법

### 1단계: KOSIS 회원가입
1. **KOSIS 홈페이지 접속**
   - URL: https://kosis.kr
   - 또는: https://kostat.go.kr

2. **회원가입**
   - 우측 상단 "회원가입" 클릭
   - 일반회원 또는 기관회원 선택
   - 필수 정보 입력 후 가입 완료

### 2단계: 오픈API 서비스 신청
1. **오픈API 페이지 접속**
   - KOSIS 홈페이지 → 메뉴에서 "오픈API" 또는 "공유서비스" 찾기
   - 또는 직접: https://kosis.kr/openapi (페이지 확인 필요)

2. **서비스 신청**
   - "오픈API 서비스 신청" 또는 "활용신청" 클릭
   - 활용신청 양식 작성:
     - 사업자 정보
     - 활용 목적
     - 서비스 설명
   - 제출

3. **인증키 발급**
   - 신청 후 자동으로 인증키 발급
   - 마이페이지 또는 이메일로 인증키 확인

### 3단계: 환경 변수 설정
`.env` 파일에 추가:
```env
KOSIS_API_KEY=발급받은_인증키
KOSIS_API_URL=https://kosis.kr/openapi
KOSIS_TBL_ID=DT_1K52B01  # 통계표 ID (선택사항, 기본값 사용 가능)
```

**⚠️ 주의**: 
- `KOSIS_API_URL`은 변경하지 마세요. 기본값이 올바른 엔드포인트입니다.
- `KOSIS_TBL_ID`는 사용할 통계표의 ID입니다. 기본값은 `DT_1K52B01`입니다.
- 통계표 ID를 찾으려면 [KOSIS 홈페이지](https://kosis.kr)에서 원하는 통계표를 검색하고, 해당 통계표의 ID를 확인하세요.
- 예: 고용통계, 산업별 고용현황, 전국사업체조사 등

---

## 📌 OpenDart API 키 발급 방법

### 1단계: OpenDart 회원가입
1. **OpenDart 홈페이지 접속**
   - URL: https://opendart.fss.or.kr

2. **회원가입**
   - 우측 상단 "회원가입" 클릭
   - 일반회원 또는 기관회원 선택
   - 필수 정보 입력 후 가입 완료

### 2단계: API 키 발급
1. **로그인 후 마이페이지 접속**
2. **API 신청**
   - "API 신청" 또는 "인증키 발급" 메뉴 클릭
   - 서비스 신청 양식 작성 및 제출
3. **인증키 확인**
   - 마이페이지에서 발급된 인증키 확인

### 3단계: 환경 변수 설정
```env
OPENDART_API_KEY=발급받은_인증키
OPENDART_API_URL=https://opendart.fss.or.kr/api
```

### 4단계: 사용 가능한 OpenDart API

본 시스템에서는 다음 OpenDart API들을 활용합니다:

#### 1) corpCode.xml - 회사 고유번호 조회
- **용도**: 회사명으로 OpenDart 고유번호(corp_code) 조회
- **엔드포인트**: `GET /api/corpCode.xml`
- **파라미터**: `crtfc_key` (API 키)
- **특징**: ZIP 압축된 XML 파일 다운로드 후 파싱 필요
- **주기**: 일일 1회 다운로드 후 캐싱 권장 (24시간)

#### 2) empSttus.json - 직원 현황 조회
- **용도**: 회사의 직원 수, 평균 연봉, 평균 근속연수 조회
- **엔드포인트**: `GET /api/empSttus.json`
- **파라미터**:
  - `crtfc_key`: API 키
  - `corp_code`: 회사 고유번호 (8자리)
  - `bsns_year`: 사업연도 (예: 2023)
  - `reprt_code`: 보고서 코드
    - 11011: 사업보고서 (연간)
    - 11012: 반기보고서
    - 11013: 1분기보고서
    - 11014: 3분기보고서
- **응답 데이터**:
  - 성별/고용형태별 직원 수
  - 1인 평균 급여액 (`jan_salary_am`)
  - 평균 근속연수 (`avrg_cnwk_sdytrn`)

#### 3) fnlttSinglAcntAll.json - 재무제표 조회
- **용도**: 회사의 매출액, 이익, 자산, 부채 등 재무 정보 조회
- **엔드포인트**: `GET /api/fnlttSinglAcntAll.json`
- **파라미터**:
  - `crtfc_key`: API 키
  - `corp_code`: 회사 고유번호
  - `bsns_year`: 사업연도
  - `reprt_code`: 보고서 코드 (위와 동일)
  - `fs_div`: 재무제표 구분
    - CFS: 연결재무제표 (연결 기준)
    - OFS: 별도재무제표 (개별 기준)
- **응답 데이터**:
  - 손익계산서(IS): 매출액, 영업이익, 당기순이익
  - 재무상태표(BS): 자산총계, 부채총계, 자본총계

#### 4) company.json - 기업 개황
- **용도**: 회사의 기본 정보 (주소, 대표자, 홈페이지 등)
- **엔드포인트**: `GET /api/company.json`
- **파라미터**:
  - `crtfc_key`: API 키
  - `corp_code`: 회사 고유번호

### 5단계: API 사용 예시

```javascript
// 1. corpCode 조회
const corpCode = await externalApiService.getCorpCode('삼성전자');

// 2. 직원 현황 조회
const employeeStatus = await externalApiService.getEmployeeStatus(corpCode, 2023, '11011');
console.log(`직원 수: ${employeeStatus.totalCount}명`);
console.log(`평균 연봉: ${employeeStatus.avgSalary}원`);

// 3. 재무제표 조회
const financial = await externalApiService.getFinancialStatement(corpCode, 2023, '11011', 'CFS');
console.log(`매출액: ${financial.revenue}원`);
console.log(`당기순이익: ${financial.netIncome}원`);

// 4. 통합 정보 조회 (한 번에 모든 정보)
const companyData = await externalApiService.getCompanyDataFromOpenDart('삼성전자', null, 2023);
```

### 6단계: 테스트 실행

```bash
# OpenDart API 테스트 스크립트 실행
cd Backend/scripts
node testOpenDartAPI.js
```

---

## 📌 공공데이터포털 API 키 발급 방법

### 1단계: 회원가입
1. **공공데이터포털 접속**
   - URL: https://www.data.go.kr

2. **회원가입**
   - 우측 상단 "회원가입" 클릭
   - 일반회원 또는 기관회원 선택
   - 필수 정보 입력 후 가입 완료

### 2단계: API 키 발급
1. **로그인 후 마이페이지 접속**
2. **인증키 발급**
   - "마이페이지" → "인증키 발급" 클릭
   - 즉시 발급 (승인 불필요)

### 3단계: 원하는 데이터 찾기
1. **데이터 검색**
   - "데이터 찾기" 메뉴에서 원하는 데이터 검색
   - 예: "고용통계", "경제지표" 등
2. **활용신청**
   - 원하는 데이터 클릭
   - "활용신청" 버튼 클릭
   - 인증키와 함께 사용

### 4단계: 환경 변수 설정
```env
PUBLIC_DATA_API_KEY=발급받은_인증키
PUBLIC_DATA_API_URL=https://apis.data.go.kr
```

---

## 🔍 빠른 링크

### KOSIS
- 홈페이지: https://kosis.kr
- 오픈API 가이드: https://kosis.kr/openapi/file/openApi_manual_v1.0.pdf
- 회원가입: https://kosis.kr/websquare/websquare.html?w2xPath=/web/stat/nw/NW0010.xml

### OpenDart
- 홈페이지: https://opendart.fss.or.kr
- API 문서: https://opendart.fss.or.kr/guide/main.do
- 회원가입: https://opendart.fss.or.kr/uss/umt/EidRetrievePopup.do

### 공공데이터포털
- 홈페이지: https://www.data.go.kr
- API 가이드: https://www.data.go.kr/iim/api/selectAPIAcountView.do
- 회원가입: https://www.data.go.kr/iim/member/joinMember.do

---

## ⚠️ 주의사항

### KOSIS
- **신청 후 승인 시간 필요** (1-2일 소요 가능)
- 승인 후 인증키 발급
- 무료 사용 가능

### OpenDart
- **무료 사용 가능**
- 일일 호출 제한 있음 (회원 등급에 따라 다름)
- 일반회원: 10,000건/일

### 공공데이터포털
- **무료 사용 가능**
- 인증키 즉시 발급
- 각 데이터별로 별도 활용신청 필요

---

## 📝 테스트 방법

API 키 발급 후:

```bash
# 1. .env 파일에 키 추가
# KOSIS_API_KEY=your_key_here

# 2. 테스트 실행
node testApi.js
```

---

## 🆘 문제 해결

### KOSIS 인증키가 안 나올 때
- 신청 완료 후 1-2일 대기
- 마이페이지에서 승인 상태 확인
- 이메일 확인

### API 호출이 안 될 때
- 인증키가 올바르게 입력되었는지 확인
- `.env` 파일이 제대로 로드되는지 확인
- API 서비스 신청이 완료되었는지 확인

### 권한 에러가 발생할 때
- 해당 서비스의 활용신청이 완료되었는지 확인
- 인증키가 활성화 상태인지 확인

---

## 💡 팁

1. **개발 단계**: 무료로 충분합니다
2. **테스트**: API 키 없이도 테스트는 실행되지만, 실제 데이터는 받을 수 없습니다
3. **보안**: API 키는 절대 공개 저장소에 올리지 마세요 (`.gitignore`에 `.env` 추가)
4. **백업**: 발급받은 API 키는 안전한 곳에 보관하세요

