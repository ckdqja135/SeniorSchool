# Backend → Backend2 마이그레이션 진행 현황

> Express 4 + Sequelize 6 (`Backend/`) → **NestJS 10 + Prisma 6 + TypeScript** (`Backend2/`) 전체 포팅.
> 최상위 원칙: **API 계약 100% 보존** (경로·상태코드·응답 JSON 형태/키순서·한국어 메시지). 프론트 무수정.
> 의도적 차이는 [`DEVIATIONS.md`](./DEVIATIONS.md), 진행 상태 요약은 이 문서로 관리한다.
> 문서 위치: `SeniorSchool/docs/` (Backend/·Backend2/의 형제 디렉토리).

최종 업데이트: 2026-07-18

---

## 1. 진행 단계 (9단계)

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 스캐폴드 + main.ts 부트스트랩 (미들웨어 체인, health, 예외필터, 로거) | ✅ 완료 |
| 2 | Prisma 스키마 (운영 덤프 introspect → @map 정리 → BigInt/Decimal 직렬화) | ✅ 완료 |
| 3 | 횡단 요소 (가드, rate limit, XSS/콘텐츠 필터, 업로드 인터셉터, BoardLikeHelper) | ✅ 완료 |
| 4 | 템플릿 도메인 univ 포팅 + 패리티 하네스 | ✅ 완료 |
| 5 | 나머지 버티컬 포팅 (church/comp/outsource/restaurant/freeboard/legacy board 등) | ✅ 완료 (229건 패리티 일치) |
| 6 | 동적 서비스 엔진 (/services + serviceConfig 사가) | ✅ 완료 (E2E 패리티 23건 일치) |
| 7 | admin 서브라우터 (dashboard raw SQL 마지막) | ✅ 완료 (user·게시판5·도메인5·report·freeboard·pageview·dashboard, tsc 0에러) |
| 8 | 스케줄러(node-cron→@nestjs/schedule) + external axios 서비스 | ✅ 완료 (회사측/맛집측 배선, ScheduleModule.forRoot, tsc 0에러) |
| 9 | 전체 패리티 스윕 + 교체 준비 | 🟡 코드 완료·`npm run build`→dist 확인. 실제 교체(PM2+.env)는 사용자 담당 |

---

## 2. 도메인별 포팅 현황 (5단계)

패리티 = 구(3001)/신(3100) 서버를 **같은 로컬 DB(ReviewSiteDB)**로 띄우고 `tools/parity.js`로 status+JSON deep-diff 비교한 결과.

| 도메인 | 경로 | 모듈 위치 | 패리티 | 비고 |
|---|---|---|---|---|
| univ (학교 오빠) | `/univ/board`, `/univ/comment` | `modules/univ` | 14/14 ✅ | 템플릿. 원본 죽은 경로는 의도 스펙 구현 (DEVIATIONS) |
| **legacy board** | `/board`, `/comment` | `modules/univ` (통합) | 19/19 ✅ | univ 도메인의 초기 라우터. 같은 테이블/다른 코드. 아래 3절 참조 |
| church (교회 오빠) | `/church`, `/church/board`, `/church/comment` | `modules/church` | 43/43 ✅ | |
| comp (회사 오빠) | `/comp`, `/comp/board`, `/comp/comment` | `modules/comp` | 38/38 ✅ | boardRating DECIMAL→`.toFixed(1)` |
| outsource (외주 오빠) | `/outsource`, `/outsource/boards`(복수), `/outsource/comment` | `modules/outsource` | 34/34 ✅ | |
| freeboard (자유게시판) | `/freeboard` | `modules/freeboard` | 20/20 ✅ | tags JSON 파싱, 계층 댓글, isDeleted tinyint |
| best-posts | `/best-posts` | `modules/best-posts` | 2/2 ✅ | UNION 집계 raw SQL |
| requests | `/requests/recent` | `modules/requests` | 6/6 ✅ | limit 1~50 클램프 |
| report | `/report` | `modules/report` | 5/5 ✅ | serviceType 검증 |
| search | `/search/*` | `modules/search` | 15/15 ✅ | compAvgTenure DECIMAL(4,1)→`.toFixed(1)` |
| restaurant (맛잘알 오빠) | `/restaurant`, `/restaurant/boards`(복수), `/restaurant/comment` | `modules/restaurant` | 33/33 ✅ | 죽은 경로 2개, 비결정 정렬 3개(순서 무관 비교) — DEVIATIONS 참조 |

**5단계 패리티 누계: 229건 전부 일치.** 회귀 없음 (전체 도메인 스윕 그린).

---

## 3. 주요 구조 결정

- **레거시 `/board`,`/comment`는 univ 도메인에 통합**한다 (별도 board-legacy 모듈 아님).
  `modules/univ/` 안에 `board.controller/service`, `comment.controller/service`를 두고 `UnivModule`에 함께 등록.
  - 같은 `tb_univboard`/`tb_univcomment`를 쓰지만 `univBoardService`와 **다른 코드**다:
    - `GET /board/detail`: 조회수(boardHits) **실제 증가** + `university`(소문자) 조인 (univ는 no-op였음)
    - `GET /board/recent`: raw SQL, `LIMIT 5`, 평면 필드 `{status,data,totalCount,currentCount}`
    - `GET /board/top-viewed`: raw SQL, `LIMIT 10`, `{status,data}`
    - `GET /board/like/:id`: `throwOnNotFound:true` — 없는 글이면 **500**
    - 댓글 삭제는 `DELETE`가 아니라 **`PUT /comment/delete`**
- **NestJS 10 고정** (11은 Express 5라 라우팅/쿼리 파싱 동작 차이). 미들웨어는 main.ts에서 raw Express에 원본 순서대로.
- **@Res()/@Req() passthrough**: ValidationPipe·전역 응답 래핑 없이 컨트롤러에서 직접 status/json 응답 → 바이트 단위 계약 유지.
- **직렬화**: BIGINT→문자열(전역 json replacer + `serializeRows`), DECIMAL(x,1)→`.toFixed(1)`, DOUBLE 1 ULP 차이는 허용(DEVIATIONS).
- **admin 가드**: `isAdmin`(admin+master)→`@UseGuards(JwtAuthGuard, AdminGuard)`, `isMaster`(master전용)→`@UseGuards(JwtAuthGuard, MasterGuard)`. isMaster는 `/admin/user`의 createAdmin/deleteAdmin/patchAdmin/getAdminlist 4개뿐, 그 외 admin은 전부 isAdmin. 라우트별로 다르면 메서드 단위 @UseGuards로 부착. (DEVIATIONS 참조)

---

## 4. 실행/검증 방법

```bash
# 구 서버 (레거시)
cd Backend  && PORT=3001 NODE_ENV=development RDB_DATABASE=ReviewSiteDB node ./bin/www
# 신 서버 (Backend2)
cd Backend2 && PORT=3100 NODE_ENV=development RDB_DATABASE=ReviewSiteDB npx ts-node src/main.ts

# 타입체크
npx tsc --noEmit
# 도메인별 패리티
node tools/parity.js tools/cases/<domain>.json
```

- 구 서버가 `Operation timeout`(3초) 500을 뿌리면 커넥션 풀 막힘 → **구 서버 재시작** 후 재실행 (계약 문제 아님).
- 쓰기 엔드포인트는 공유 DB를 변형하지 않도록 **검증실패/미존재(400·404·500)** 케이스로만 패리티. 조회수 증가로 값이 경합하는 detail은 `ignoreKeys`로 해당 필드 제외.
- 하네스 케이스 옵션: `ignoreKeys`(깊이 무관 키 제외), `unordered`(최상위 배열 순서 무관 multiset 비교 — 원본이 동점에서 비결정적으로 정렬하는 top-N/group-by 엔드포인트용).

---

## 5. 동적 엔진 구조 (6단계)

- `common/utils/`: `slug-validator`(정규식+예약어+백틱 테이블명), `dynamic-query-builder`(CREATE/SELECT/INSERT/UPDATE 빌더) — 순수 함수 verbatim.
- `modules/dynamic/`:
  - **SlugResolverGuard**(미들웨어→가드 전환): slug 검증 → ServiceConfig(active) 조회 + 5분 캐시 → req 주입.
  - 퍼블릭 컨트롤러 5 + 서비스 5: `/services`(목록), `/services/:slug/{entities,boards,comments,requests}`.
  - **ServiceConfigService**(사가): Phase A config/fields insert(tx) + Phase B DDL 4테이블(tx밖) + 실패 시 DROP+config삭제 보상.
  - admin 컨트롤러 2: `/admin/services`(설정 CRUD), `/admin/services/:slug/...`(엔티티/보드/요청 관리) — Jwt+Admin+Slug 가드.
- E2E: 로컬 DB에 테스트 slug 생성→CRUD→공유 DB 패리티 23건→정리. 상세는 DEVIATIONS 참조.

## 6. 남은 작업

- [x] ~~5단계 버티컬 (229건)~~ · ~~6단계 동적 엔진 (E2E 23건)~~ 완료
- [ ] 7단계: admin 나머지 서브라우터 (serviceConfig admin은 6단계에서 완료. univ/comp/user/board/report/church/outsource/restaurant/freeboard/*board/dashboard/scheduler/pageview/crawler/company-crawler 등 남음. dashboard raw SQL 마지막)
- [ ] 8단계: 스케줄러 3종(companyData/restaurantCrawler/companyCrawler) + external 6종
- [ ] 9단계: 전체 스윕 + 교체 (ecosystem.config.js → dist/main.js, .env·public/uploads 복사)
