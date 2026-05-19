# WORKLOG

## 2026-04-25 | FEATURE: 사업자번호 검증 — 국세청 휴폐업/진위확인 (Phase 3)
- `service/businessRegistryService.js` 신규: 국세청 OpenAPI(POST) 호출. checkBusinessStatus(배치 100), validateBusiness, checkSingleBusiness(어드민용 단건). 사업자번호 정규화/상태코드 라벨링 포함.
- `controller/admin/compController.js`: `validateBusiness` 컨트롤러 추가. 어드민 폼에서 휴폐업만 또는 진위(대표자명+개업일) 통합 체크.
- `routes/admin/comp.router.js`: `POST /admin/comp/validateBusiness` 라우트.
- `.env` 추가: `NTS_BUSINESS_API_URL=https://api.odcloud.kr/api`. 인증키는 기존 `PUBLIC_DATA_API_KEY` 재사용.
- 검증: `scripts/debugNTS.js` 실행 — 삼성그룹 자회사 4건 모두 '계속사업자' 식별, 미등록/형식오류 정상 분기, 배치 5건 33ms.

## 2026-04-25 | FEATURE: compType 정밀분류 — Phase 1a/1b/1c (OpenDart + 공정위 + 별칭)
- `service/conglomerateService.js` 신규: fetch + 24h 메모리 캐시. classifyCompType(공정위→상장사 순 매칭, 대기업/중견기업/null).
  - Phase 1a: OpenDart corpCode.xml ZIP fetch → 상장사 매핑(3,926건, +영문명 alias 포함 8,222건).
  - Phase 1b: 공정위 OpenAPI 두 개 체이닝(`appnGroupSttusListApi` → `appnGroupAffiListApi`), `presentnYear=YYYY` 파라미터, `unityGrupCode`/`entrprsNm` 추출. 그룹명/대표회사 보조 등록 포함 3,669건. ensureOperationSuffix로 .env URL이 base만 있어도 동작.
  - Phase 1c: 한↔영 prefix dictionary(엘지↔LG, 에스케이↔SK 등) + expandAliases() 양방향 alias 등록·조회 → LG전자/SK하이닉스 정확 분류.
- `service/companyCrawlerService.js`: 좌표보정 직후 classifyCompType 일괄 적용 + 분류통계 로깅.
- `.env` 추가: `FTC_GROUP_LIST_API_URL`, `FTC_GROUP_MEMBER_API_URL`. 인증키는 기존 PUBLIC_DATA_API_KEY 재사용 — Encoding 키이므로 코드에서 추가 인코딩 금지(이중 인코딩 시 500).
- 검증: `scripts/testCompClassify.js` — 17건 샘플 중 11건 '대기업', 정규화 매칭 정상(주식회사 카카오/(주)네이버/삼성전자(주) 모두 매칭).
- Phase 2(중기부 벤처기업)은 중소벤처24 OpenAPI가 기관 전용이라 제외.

## 2026-04-25 | BUGFIX: 회사 크롤러/어드민 3종 픽스
- `companyCrawlerService.js`: 시/도 prefix 정규화(서울→서울특별시 등) 도입, dedup이 DB 기존 주소도 normalizeAddress 후 매칭하도록 수정. 카카오/네이버 분기 및 normalizeToCompany/벌크 저장 default `compType`을 '일반'→'중소기업'으로 변경(스키마 정식 분류값).
- `routes/admin/comp.router.js`: PUT `/comp/:compIdx` 라우트 추가(레거시 `/putCompData/:compIdx` 보존). 어드민 회사 페이지에서 발생하던 404 해소.
- 기존 DB 정규화 마이그레이션은 별도 1회성 SQL 필요(아래 보고 참조).

## 2026-04-12 | FEATURE: Lunchix 벤치마킹 — 맛잘알 오빠 기능 고도화

### 배경
- https://lunchix.peo.kr/ (텔레픽스 맛집 지도) 분석 후, 맛잘알 오빠에 접목할 기능 도출
- 이모지 카테고리 필터, 랜덤 룰렛, 멀티소스 크롤러 구현 착수

### 완료

**1) 이모지 카테고리 필터 (프론트)**
- 파일: `SeniorSchool-front/src/app/matzal-al-mentor/page.tsx`
- DB의 `restaurantType`을 기반으로 🍚한식 🥟중식 🍣일식 🍝양식 ☕카페 등 이모지 칩 필터 UI 추가
- 선택 시 맛집 카드 그리드 + 랜덤 추천이 해당 카테고리로 필터링

**2) "오늘 뭐 먹지?" 랜덤 룰렛 (프론트 + 백엔드)**
- 백엔드: `GET /restaurant/random?type=한식` — `ORDER BY RAND()` 기반 랜덤 식당 1건 + 평균 평점 계산
- 프론트: Framer Motion 애니메이션 적용, 카테고리 필터 연동, 결과 카드에서 상세페이지 이동
- 파일: `restaurantService.js`, `restaurantController.js`, `restaurant.router.js`, `page.tsx`

**3) 카테고리 목록 API (백엔드)**
- `GET /restaurant/types` — `GROUP BY restaurantType` + 건수 반환
- 파일: `restaurantService.js`, `restaurantController.js`, `restaurant.router.js`

**4) 멀티소스 맛집 크롤러 (백엔드)**
- 신규 파일: `service/restaurantCrawlerService.js`, `controller/admin/crawlerController.js`, `routes/admin/crawler.router.js`
- 지원 소스: 카카오(Local API), 네이버(검색 API), 구글맵(Places API), 식신(웹 크롤링)
- 공통 정규화 → `tb_restaurant_info` 스키마 매핑, 중복 체크(이름+주소/좌표), 좌표 보정(카카오 Geocoding)
- 어드민 API: `GET /admin/crawler/sources`, `POST /admin/crawler/run`, `GET /admin/crawler/run/:source`
- `.env`에 `KAKAO_REST_API_KEY`, `NAVER_CLIENT_ID/SECRET`, `GOOGLE_MAPS_API_KEY` 템플릿 추가

**5) 어드민 크롤러 관리 UI**
- 파일: `SeniorSchool-front/src/app/myoriadmin/restaurant/crawler/page.tsx`
- 사이드바 메뉴 추가: 맛잘알 오빠 → "크롤러 관리" (Sidebar/index.tsx)
- 2탭 구조: "통합 크롤링" (여러 소스 병렬) + "개별 크롤링 수동" (단일 소스 선택)
- 기능: 소스 선택, 지역 드롭다운(17개 시도), 키워드/건수 설정, 미리보기(dryRun) → 테이블 확인 → DB 저장, 실행 결과 통계, 실행 기록 로그
- 개별 크롤링: 소스 카드 선택 → 해당 소스 전용 설정 → 미리보기/저장, `GET /admin/crawler/run/:source` API 사용

### 미완료 (TODO)

**6) .env API 키 실제 값 세팅**
- `KAKAO_REST_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `GOOGLE_MAPS_API_KEY`에 실제 키 입력 필요

**7) 카카오맵 지도 뷰 (메인 페이지)**
- 맛잘알 메인에 전체 맛집 마커를 보여주는 카카오맵 지도 추가
- 상세 페이지에는 이미 지도 있음, 메인 리스트 뷰에 지도 탭 추가 필요

**8) 찐 맛집 랭킹 (가중치 스코어링)**
- 조회수 + 좋아요 + 평균 평점 + 최근 활동도를 결합한 복합 랭킹 알고리즘
- 현재는 조회수 TOP 10만 존재

**9) 크롤러 스케줄러 등록**
- `companyDataScheduler.js` 패턴으로 맛집 크롤러도 주기적 자동 실행 (예: 매주 월요일)

**10) 크롤러 프론트 스크립트 정리**
- `SeniorSchool-front/scripts/fetchRestaurantsFromKakao.mjs` → 백엔드 크롤러로 대체되었으므로 정리/삭제 검토

---

## 2026-01-31 | FEATURE: 회사 요청 상태 업데이트 API 추가
- **원인**: 회사(comp) 도메인에만 요청 상태 업데이트 API가 누락되어 있었음 (다른 도메인에는 모두 존재)
- **추가**: PUT /admin/comp/request/:requestIdx/status 엔드포인트 추가
- **대상 파일**: compService.js (updateCompRequestStatus 함수), compController.js (핸들러), comp.router.js (라우트)
- **Body**: { status: "pending"|"completed"|"rejected", adminNote: "메모" }
- **검증**: 회사 요청 승인/거절 시 상태 정상 업데이트 확인
- **롤백**: `git revert <commit>`

## 2026-01-31 | BUGFIX: 어드민 Rate Limit 과도한 제한 완화
- **원인**: 어드민 API가 15분당 5회만 허용되어 정상적인 관리 작업 중에도 429 에러 발생 (rateLimitMiddleware.js:53)
- **수정**: strictLimiter의 max를 5 → 100으로 변경 (15분/100회)
- **대상 파일**: Backend/middlewares/rateLimitMiddleware.js:53
- **검증**: 어드민 페이지에서 정상적인 조회/수정 작업 시 429 에러 미발생 확인
- **롤백**: `git revert <commit>`

## 2026-01-31 | BUGFIX: 요청 거절(rejected) 상태 추가
- **원인**: 모든 request 모델이 `requestStatus`를 `ENUM('pending', 'completed')`로만 정의 → 프론트엔드에서 'rejected' 전송 시 Sequelize 유효성 검증 실패
- **수정**: 5개 request 모델 ENUM에 'rejected' 추가, 어드민 서비스 7곳 유효성 검증 배열에 'rejected' 추가
- **대상 파일**: tb_church_request.js, compRequest.js, tb_restaurant_request.js, tb_outsource_request.js, tb_univ_request.js (모델 5개) + 어드민 서비스 5개 (churchService, compService, restaurantService, outsourceService, univService)
- **DB 마이그레이션**: `Backend/DDL/migration_add_rejected_status.sql` 실행 필요 (5개 테이블 ALTER)
- **검증**: 프론트엔드에서 거절 시 'rejected' 상태로 정상 저장 확인
- **롤백**: `git revert <commit>` + DB 마이그레이션 롤백 (ALTER TABLE로 'rejected' 제거)

## 2026-01-24 | BUGFIX: 대시보드 최근 활동 - 조회(GET)로 인한 오염 수정
- **원인**: Info 테이블 조회수 증가 시 MySQL `ON UPDATE CURRENT_TIMESTAMP`가 `updated_at`을 갱신 → `getRecentActivities()`가 이를 "update" 활동으로 집계
- **수정**: 모든 GET 상세 핸들러의 조회수 UPDATE에 `updatedAt: literal('updated_at')` 추가하여 타임스탬프 자동갱신 억제
- **대상 파일**: churchService, compService, restaurantService, outsourceService, searchService, admin/compService (총 6파일, 7개소)
- **검증**: GET 조회 시 `updated_at` 불변 확인, 실제 수정(PUT/PATCH) 시 정상 갱신 확인
- **롤백**: `git revert <commit>` (6파일 원복)

## 2026-02-14 | FEATURE: 어드민 - 각 오빠별 후기 관리 CRUD API 추가
- **내용**: 학교/교회/회사/외주/맛잘알 오빠 메뉴별 후기(Board) 관리 CRUD API 신규 구현
- **URI**: `/api/admin/univboard`, `/api/admin/churchboard`, `/api/admin/compboard`, `/api/admin/outsourceboard`, `/api/admin/restaurantboard` (각 GET/POST/PUT/DELETE)
- **구조**: boardServiceFactory 패턴으로 공통 로직 1개 + 설정 인스턴스 5개
- **신규 파일**: service/admin/boardServiceFactory.js, {univ|church|comp|outsource|restaurant}BoardService.js, Controller.js, router.js (총 16파일)
- **수정 파일**: routes/admin/index.js (5개 라우터 등록)
- **특이사항**: CompBoard만 isDeleted(소프트 삭제), CompBoard/RestaurantBoard만 boardRating 지원
- **롤백**: `git revert <commit>`

## 2026-01-24 | BUGFIX 보완: 기존 오염 데이터 정리 + FreeBoard 조회수 수정
- **문제**: 코드 수정 후에도 기존 DB에 오염된 `updated_at` 값이 잔존하여 대시보드에 표시됨
- **추가 코드 수정**: `freeBoardService.js` - boardHits 증가 시 `boardModDate: literal('boardModDate')` 추가
- **DB 리셋**: Info 5개 테이블 `updated_at = created_at` 실행 필요 (1회성)
- **롤백**: `git revert <commit>` + DB 리셋 불필요 (원래대로 오염 재발)

## 2026-04-23 | FEATURE: 회사오빠 멀티소스 크롤러 + 어드민 관리 페이지
- **배경**: OpenDart는 상장사만 커버 → 비상장/중소기업 커버리지 구멍. 식당 크롤러 패턴 재사용해 네이버·카카오 기반 소프트 크롤 신설.
- **신규(백엔드)**: `service/companyCrawlerService.js` (kakao Local + naver Local/webkr + publicData placeholder, CompInfo NOT NULL 스키마 매핑, 카카오 Geocoding 좌표보정, `enrichFromNaver` 홈페이지/주소/업종 보강), `controller/admin/companyCrawlerController.js` (sources/stats/missing-stats/run/run:source/enrich/enrich stream), `routes/admin/companyCrawler.router.js`(authenticateToken+isAdmin), `scheduler/companyCrawlerScheduler.js`(월 04:00).
- **수정**: `routes/admin/index.js` (company-crawler 라우터 등록), `app.js` (스케줄러 시작).
- **신규(프론트)**: `SeniorSchool-front/src/app/myoriadmin/company/crawler/page.tsx` — 4탭(통합/개별/보강/관리), 미리보기→저장, NDJSON 스트리밍 보강 진행률, 관리 탭 검색/펼침/인라인 편집.
- **수정(프론트)**: `components/feature/admin/Sidebar/index.tsx` 회사오빠 메뉴에 "크롤러 관리" 추가.
- **환경변수(기존 재사용)**: `KAKAO_REST_API_KEY`, `NAVER_CLIENT_ID/SECRET`. `PUBLIC_DATA_API_KEY`는 placeholder — 실엔드포인트 연결 미완.
- **검증**: `/admin/company-crawler/sources` 상태, `/admin/company-crawler/stats` 수치, 미리보기→저장 플로우, `/enrich/stream` NDJSON 진행률, 관리 탭 검색/편집.
- **롤백**: `git revert <commit>` (신규 6파일 삭제, index.js/app.js/Sidebar 3파일 원복).
