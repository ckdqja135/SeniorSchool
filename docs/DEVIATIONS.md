# 원본 대비 의도적 차이 (DEVIATIONS)

원칙: API 계약(경로/상태코드/응답 형태)은 100% 보존한다.
단, **원본 코드가 도달 불가능하거나 항상 실패(500)하던 "죽은 경로"**는 크래시를 재현하는 대신
의도된 스펙대로 동작하게 구현하고 여기에 기록한다. (실측: 구 서버를 로컬 구동해 확인)

## univ (학교 오빠)

원본 `service/univBoardService.js`는 Sequelize 모델 속성과 불일치하는 이름을 다수 사용:
- `boardHit` (실제: `boardHits`), `boardPw` (실제: `boardPW`), `boardModDate` (존재하지 않음)
- association 별칭 `'University'` (실제: `'university'`), `univLocation` (실제: `univLocate`)
- `boardRegDate`(VARCHAR)에 Date 객체 전달 → string violation

실측 결과 (2026-07-18, 구 서버 로컬 구동):

| 엔드포인트 | 원본 동작 | Backend2 동작 |
|---|---|---|
| `GET /univ/board` | 200 정상 | 동일 |
| `GET /univ/board/detail` | 200 정상. 단, 조회수 증가는 존재하지 않는 `boardHit` 속성이라 **무시되던 no-op** | 동일 (no-op 유지 — 조회수 증가 안 함) |
| `POST /univ/board/insert` | **항상 500** (boardPW notNull violation + boardRegDate string violation) | 정상 등록되도록 구현 (boardPW 해시 저장, boardRegDate는 ISO 문자열) |
| `PUT /univ/board/correct` | **항상 500** (`board.boardPw`가 undefined → 항상 'Incorrect password') | 정상 수정되도록 구현 (boardPW 비교) |
| `DELETE /univ/board/delete` | **항상 500** (동일 원인) | 정상 삭제되도록 구현 |
| `POST /univ/board/like`, `GET /univ/board/like/:id` | 정상 | 동일 |
| `GET /univ/board/recent` | **항상 500** (association 별칭 불일치) | 정상 구현: 최근 20개 + `University: { univName, univLocate }` |
| `GET /univ/board/top-viewed` | **항상 500** (동일 원인) | 정상 구현: TOP10 + 동일 구조 |

주의: recent/top-viewed의 원본 의도 필드명 `boardHit`/`univLocation`은 실존 컬럼인
`boardHits`/`univLocate`로 구현했다 (원본은 한 번도 응답을 반환한 적이 없어 프론트 계약 없음).

## 인프라

- Nest 10 사용 (Nest 11은 Express 5 기반이라 라우팅/쿼리 파싱 동작이 달라짐 → Express 4 유지)
- 구 스택의 Sequelize 초기화 버그(conf의 host/port/timezone 미전달 → localhost:3306, UTC)는
  동작 보존을 위해 그대로 유지: PrismaService도 RDB_* 기반, DATETIME은 UTC 해석.
- BIGINT/DECIMAL은 구 스택(bigNumberStrings)과 동일하게 JSON에서 문자열로 직렬화
  (main.ts json replacer + serializeRow 헬퍼).

## 부동소수점(DOUBLE) 직렬화 — 1 ULP 차이 (허용)

`churchLatX/Y`, `univLateX/Y`, restaurant 위경도 등 **DOUBLE 컬럼**은 구 mariadb 드라이버와
Prisma 쿼리 엔진(Rust)이 f64를 파싱하는 방식 차이로 **마지막 비트 1 ULP(약 4e-15)** 만큼
다르게 직렬화될 수 있다 (예: `37.500878828442694` vs `37.50087882844269`).
- 위도 기준 약 10나노미터 수준으로 물리적 의미 없음, 프론트(지도 렌더링)에 영향 없음.
- Prisma 엔진 레벨 특성이라 raw SQL 없이는 제거 불가 → **의도적 허용**.
- 패리티 하네스(`tools/parity.js`)는 float를 상대오차 1e-9까지 동일로 간주하도록 deepEqual 비교.
  정수/문자열/키 순서는 여전히 엄격 비교.

## restaurant (맛잘알 오빠) — 죽은 경로

실측(구 서버 로컬 구동)으로 확인한 도달 불가 경로:

| 엔드포인트 | 원본 동작 | Backend2 동작 |
|---|---|---|
| `GET /restaurant/board/:boardIdx` | **항상 500**: `include`에 `as:'restaurant'` 별칭 누락 → Sequelize EagerLoadingError | 의도 스펙 구현 (상세 + `restaurant`{name/addr/location} + `RestaurantComments` + 조회수 증가). **패리티 제외**(보장된 크래시는 재현 불가) |
| `GET /restaurant/recent` | **항상 400** `{"error":"restaurantIdx is required"}`: 컨트롤러가 `req.params.restaurantIdx`를 읽는데 라우트에 `:restaurantIdx` 파라미터가 없음 → 항상 undefined | **그대로 재현**(결정적 400, 크래시 아님. 프론트 계약 유지). 도달 불가한 서비스 메서드는 구현만 해둠 |
| `GET /restaurant/random` | 무작위 1건 | 구현하되 비결정적이라 **패리티 제외** |

`POST /restaurant/requests`(name 누락)는 원본이 `next(error)`로 전역 필터를 타는 유일한 케이스라
바디가 NODE_ENV 의존적(dev: `{message:'식당명은 필수입니다.'}`, prod: `'서버 오류가 발생했습니다.'`).
구/신 서버는 반드시 같은 NODE_ENV로 구동해야 이 케이스가 일치한다.

## 비결정적 정렬(동점) — 순서 무관 비교

`GET /restaurant/types`, `GET /restaurant/top-viewed`, `GET /restaurant/board/top-viewed`는 원본이
**단일 키 정렬(2차 키 없음)** 이라, **동점 값(같은 count/viewCount/boardHits)의 순서가 구 서버에서도
실행마다 뒤바뀌는 비결정적 순서**다 (실측: `/restaurant/types`의 count=87 동점이 호출마다 순서 변동 확인).
즉 동점 순서는 프론트 계약이 아니다.
- **Backend2는 재현성을 위해 결정적 2차 정렬을 추가**한다: types→`restaurantType ASC`,
  restaurant top-viewed→`restaurantIdx ASC`, board top-viewed→`boardIdx ASC` (원본보다 안정적, {값} 집합 동일).
- 패리티 하네스는 이 케이스들을 `"unordered": true`로 표시해 **최상위 배열을 정규 정렬 후 비교**(multiset 동등성).
  1차 정렬 키(count/viewCount desc) 자체는 양쪽 동일하므로 순서 무관 비교로 충분하다.
- 주의: `LIMIT N` 경계에서 동점이 걸치면 원본이 어떤 멤버를 N번째로 뽑을지 자체가 비결정적이라
  이론상 멤버가 달라질 수 있으나, 현재 데이터셋에서는 3회 반복 패리티 모두 일치.

## admin 가드: admin vs master 구분

원본 `middlewares/authMiddleware.js`:
- `isAdmin`: userRole이 `'admin'` 또는 `'master'`면 통과 (403 "권한이 없습니다. (admin 계정 필요)")
- `isMaster`: userRole이 `'master'`일 때만 통과 (403 "권한이 없습니다. (master 계정 필요)")

**전체 Backend에서 `isMaster`(master 전용)를 쓰는 라우트는 `/admin/user/`의 4개뿐**:
`POST createAdmin`, `DELETE deleteAdmin`, `PATCH patchAdmin`, `GET getAdminlist` → `@UseGuards(JwtAuthGuard, MasterGuard)`.
그 외 모든 admin 라우트는 `isAdmin` → `@UseGuards(JwtAuthGuard, AdminGuard)`.
`/admin/user/signIn`·`verify`는 무가드, `signOut`은 `JwtAuthGuard`만.
검증: admin(ori) 토큰 → getAdminlist 403, master(bami) 토큰 → 200, 구·신 동일.

### admin/user — createAdmin/signUp 죽은 경로
원본 `service/admin/userService.js`는 `crypto`를 import하지 않은 채 `crypto.randomBytes(16)`로 salt를
생성 → Node 18+ 전역 `crypto`는 Web Crypto라 `randomBytes`가 없어 **항상 TypeError → 500**.
Backend2는 의도 스펙대로 `import * as crypto`로 salt를 생성해 정상 등록되게 구현(해시는 원본과 동일하게
salt 미사용 SHA256(userPw)). signIn 실패(아이디/비번 오류)는 원본이 plain Error→`next(e)`라 500으로
내려가는 계약을 그대로 보존(AllExceptionsFilter, dev는 한국어 메시지/prod는 '서버 오류가 발생했습니다.').

## 동적 서비스 엔진 (/services, /admin/services)

런타임에 `dynamic_<slug>_{entities,boards,comments,requests}` 4개 테이블을 CREATE/DROP하는 엔진.
검증된 slug(정규식+예약어)만 테이블명에 보간, 값은 전부 `?` 바인딩(`$queryRawUnsafe`/`$executeRawUnsafe`).

- **slugResolver는 미들웨어가 아니라 가드(SlugResolverGuard)로 포팅**: 원본 어드민 라우트는
  `authenticateToken → isAdmin → slugResolver` 순서인데, Nest 미들웨어는 가드보다 먼저 실행되어
  순서가 뒤집힌다. 가드로 만들어 `@UseGuards(JwtAuthGuard, AdminGuard, SlugResolverGuard)`로
  원본 순서를 보존한다(사용자 지시 "미들웨어→가드"와도 일치). 400/404/500 응답 바디는 동일한
  HttpException을 throw → AllExceptionsFilter가 그대로 방출.
- **`POST /services/:slug/boards/:id/like`의 `boardLike`는 문자열 "01" 형태**: 원본이 board_like(BIGINT)를
  bigNumberStrings로 문자열로 받아 `"0" + 1 = "01"` 문자열 연결이 되는 버그. 계약 보존을 위해 그대로
  재현(serializeRows도 board_like를 문자열화). 실측: 좋아요 0 게시글에 구·신 모두 `{boardLike:"01"}`.
- **INSERT insertId**: 원본은 Sequelize 메타(숫자)를 반환. Prisma는 $executeRawUnsafe가 영향행수만
  주므로, `$executeRawUnsafe + SELECT LAST_INSERT_ID()`를 한 트랜잭션(커넥션 고정)으로 조회해 숫자로 반환.
- **엔티티 상세 조회수 증가**: `view_count +1` UPDATE가 `updated_at`(ON UPDATE CURRENT_TIMESTAMP)까지
  갱신하므로, 패리티는 `ignoreKeys: ['view_count','updated_at']`. 게시글 상세는 `board_hits`만(다른 컬럼 불변).
- **동적 테이블 DECIMAL(board_rating/average_rating, scale 1)**: serializeRows의 `Decimal.toString()`은 "4"로
  나와 원본 "4.0"과 다를 수 있다. E2E는 basic 템플릿 + rating null로 회피했다. rating을 쓰는 서비스가
  생기면 정적 도메인처럼 `.toFixed(1)` 처리가 필요(정적은 formatRating으로 이미 해결). 미해결 caveat.
- **top-viewed(entities/boards)**: 원본 단일 키 정렬이라 동점은 비결정적 → 패리티 `unordered` 비교.
- E2E 검증 방법: 로컬 ReviewSiteDB에 테스트 slug로 서비스 생성 → 엔티티/게시글/댓글 삽입 →
  구(3001)/신(3100) 공유 DB 패리티 23건 일치 확인 → DROP+config 삭제로 정리. (scratchpad의 dyn_*.js)

## 패리티 하네스 운영 주의

구 서버(mariadb 드라이버)는 `dialectOptions.requestTimeout: 3000`(3초)이라, 로컬 DB가
느리거나 커넥션 풀이 앞선 요청으로 막히면 실제 계약과 무관하게 `Operation timeout` → 500을
낸다. 스위트 실패 시 구 서버를 재시작해 풀을 비우고 재실행할 것 (데이터/포팅 문제와 구분).

하네스 옵션: 케이스에 `"ignoreKeys": [...]`(깊이 무관 키 제외 — 조회수 증가처럼 경합하는 필드),
`"unordered": true`(최상위 배열 순서 무관 비교 — 위 비결정적 정렬)를 지정할 수 있다.

## 로컬 개발 DB 관련 (운영과 무관)

- 로컬 `churchoppa` DB는 운영(`ReviewSiteDB`) 스키마의 오래된 부분 사본:
  comp/restaurant/freeboard/service_configs 등 부재, `tb_univcomment.regDate/modDate` 부재,
  `*_request.request_status` ENUM에 `rejected` 부재.
- Prisma 스키마는 운영 DB introspect로 확정 필요 (SSH 터널 대기 중).
