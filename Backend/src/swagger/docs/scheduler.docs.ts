// 스케줄러·크롤러 어드민 API 설명 (src/modules/scheduler/)
//  - admin/scheduler        : OpenDart 회사 정보 갱신 (company-scheduler.controller.ts)
//  - admin/company-crawler  : 회사 크롤러 (company-scheduler.controller.ts)
//  - admin/crawler          : 식당 크롤러 (restaurant-crawler.controller.ts)
//  - admin/scheduler-run    : 스케줄러 수동 실행·실행 기록 (scheduler-run.controller.ts)
import { ApiDocMap } from '../api-doc.types';

// 크롤링 진행 상황(progress/:runId) 응답 설명. 회사·식당이 같은 형태라 한 번만 적는다.
const CRAWL_PROGRESS_200 =
    'found=false 면 아직 시작 전이거나 이미 정리된 runId. found=true 면 phase(fetching → dedup → geocoding → preview | saving → done), ' +
    'message, sources(소스별 status·fetched·error), totalFetched, alreadyInDB, crossSourceDuplicate, done, saved, failed, startedAt, updatedAt';

// 보강 NDJSON 스트림 응답 설명
const ENRICH_STREAM_200 =
    'application/x-ndjson. 한 줄에 JSON 하나씩 흘려보냄. ' +
    '{type:"start", total, field} → 대상마다 {type:"progress", index, total, updated, elapsedMs, name, status, matched?, error?} → ' +
    '{type:"done", success, message, total, updated, results}. status 는 updated | no_data | not_found | error';

export const schedulerDocs: ApiDocMap = {
    // --- admin/scheduler (OpenDart 회사 정보 갱신) -----------------
    'GET /admin/scheduler/status': {
        summary: 'OpenDart 갱신 스케줄러 상태',
        description: '회사 정보 갱신 잡이 지금 도는지, 마지막 실행 시각과 통계를 메모리에서 읽어 옵니다. 서버를 재시작하면 초기화됩니다.',
        auth: 'admin-menu',
        responses: {
            200: 'success, data{isRunning, lastRunTime, stats{totalCompanies, successCount, failedCount, skippedCount, startTime, endTime, duration(초), errors[]}}',
            500: '상태 조회 실패',
        },
    },
    'POST /admin/scheduler/run-now': {
        summary: 'OpenDart 회사 정보 즉시 갱신',
        description:
            '활성 회사 전체의 대표·주소·직원수·재무 정보를 OpenDart 에서 받아 갱신합니다. 대상 연도는 전년도로 고정됩니다. ' +
            '백그라운드로 돌고 응답은 바로 옵니다. 회사당 2초씩 쉬어서 오래 걸리므로 진행 상황은 status 로 확인하면 됩니다. ' +
            'scheduler-run 큐를 거치지 않아 실행 기록(tb_scheduler_run)은 남지 않습니다.',
        auth: 'admin-menu',
        responses: {
            200: '업데이트 시작됨 (완료가 아니라 시작 알림)',
            400: '이미 업데이트가 진행 중',
            500: '실행 실패',
        },
    },

    // --- admin/company-crawler (회사 크롤러) -----------------------
    'GET /admin/company-crawler/stats': {
        summary: '회사 DB 현황',
        description: '활성 회사 수와 홈페이지·대표이사·업종이 채워진 회사 수, 최근 7일 추가 수를 셉니다. 대표 "미정", 업종 "기타"는 빈 값으로 간주합니다.',
        auth: 'admin-menu',
        responses: {
            200: 'totalCompanies, withURL, withCEO, withIndustry, recentAdded',
            500: '{ error: "Internal Server Error" }',
        },
    },
    'GET /admin/company-crawler/sources': {
        summary: '회사 크롤링 소스 목록',
        description: '환경변수에 API 키가 있는지만 보고 소스별 사용 가능 여부를 알려 줍니다. publicData 는 키가 있어도 아직 엔드포인트가 연결되지 않았습니다.',
        auth: 'admin-menu',
        responses: {
            200: '배열. { name(kakao | naver | publicData), label, ready, reason?(미설정 사유), note? }',
            500: '{ error: "Internal Server Error" }',
        },
    },
    'GET /admin/company-crawler/missing-stats': {
        summary: '회사 빈 필드 통계',
        description: '활성 회사 중 홈페이지·대표이사·업종·도로명주소가 비어 있는 건수를 컬럼별로 셉니다. 대표 "미정", 업종 "기타"도 빈 값으로 봅니다.',
        auth: 'admin-menu',
        responses: {
            200: '배열. { key(compURL | compCEO | compIndustry | compAddr), label, total, missing, filled }',
            500: '서버 오류',
        },
    },
    'POST /admin/company-crawler/enrich': {
        summary: '회사 빈 필드 보강',
        description:
            '지정한 필드가 빈 활성 회사를 조회수 순으로 골라 네이버 웹검색(홈페이지)과 네이버 지역검색(주소·좌표·업종)으로 채웁니다. ' +
            '한 건씩 외부 API 를 부르고 끝날 때까지 응답을 잡고 있어서 요청 타임아웃을 10분으로 늘려 두었습니다. ' +
            'compAddr·compIndustry 는 NOT NULL 컬럼인데 대상 조회에서 null 비교를 해서 500 이 날 수 있습니다 (확인 필요).',
        auth: 'admin-menu',
        body: [
            { name: 'field', required: true, description: '보강할 필드. compURL | compAddr | compIndustry', example: 'compURL' },
            { name: 'limit', type: 'integer', description: '처리할 회사 수 (기본 10, 최대 50)', example: 10 },
        ],
        responses: {
            200: 'success, message, total, updated, results[{ name, status(updated | no_data | not_found | error), matched?, error? }]. 대상이 없으면 updated=0 과 안내 메시지만',
            400: 'field 가 허용 값이 아님',
            500: '서버 오류',
        },
    },
    'POST /admin/company-crawler/enrich/stream': {
        summary: '회사 빈 필드 보강 (실시간 스트림)',
        description:
            'enrich 와 같은 작업을 하되 회사 하나가 끝날 때마다 결과를 NDJSON 한 줄로 바로 흘려보냅니다. 화면의 진행 바 표시에 사용합니다. ' +
            'compAddr·compIndustry 는 대상 조회 단계에서 500 이 날 수 있습니다 (확인 필요).',
        auth: 'admin-menu',
        body: [
            { name: 'field', required: true, description: '보강할 필드. compURL | compAddr | compIndustry', example: 'compURL' },
            { name: 'limit', type: 'integer', description: '처리할 회사 수 (기본 10, 최대 50)', example: 10 },
        ],
        responses: {
            200: ENRICH_STREAM_200,
            400: 'field 가 허용 값이 아님 (스트림 시작 전 JSON 응답)',
            500: '대상 조회 실패 (스트림 시작 전 JSON 응답)',
        },
    },
    'POST /admin/company-crawler/run': {
        summary: '회사 크롤링 실행',
        description:
            '카카오·네이버 지역검색으로 회사를 모아 DB 기존 건과 대조하고, 좌표 보정(카카오 지오코딩)과 대기업·중견기업 분류까지 한 뒤 저장합니다. ' +
            '외부 API 를 여러 번 불러 오래 걸리고 끝날 때까지 응답이 오지 않습니다. runId 를 함께 보내면 progress/:runId 로 중간 상황을 폴링할 수 있습니다. ' +
            'dryRun 이면 저장 없이 기존 건(_existsInDb)과 소스 간 중복(_duplicateOf) 표시까지 붙여 전부 돌려주고, 아니면 기존 건을 뺀 나머지를 새로 INSERT 합니다.',
        auth: 'admin-menu',
        body: [
            { name: 'sources', type: 'array', items: 'string', description: '수집 소스. kakao | naver | publicData (기본 kakao, naver). publicData 는 아직 빈 결과', example: ['kakao', 'naver'] },
            { name: 'query', description: '검색 키워드 (기본 "회사")', example: '회사' },
            { name: 'region', description: '지역 (기본 "서울"). 좌표가 없을 때 카카오 검색 기준점을 정함', example: '서울' },
            { name: 'lat', type: 'number', description: '카카오 검색 중심 위도. lng 와 함께 줘야 적용' },
            { name: 'lng', type: 'number', description: '카카오 검색 중심 경도' },
            { name: 'radius', type: 'integer', description: '카카오 검색 반경 m (기본 20000)' },
            { name: 'countPerSource', type: 'integer', description: '소스당 수집 건수 (기본 50)' },
            { name: 'dryRun', type: 'boolean', description: 'true 면 수집·미리보기만 하고 저장하지 않음' },
            { name: 'runId', description: '진행 상황 조회 키. 클라이언트가 만들어 보냄' },
        ],
        responses: {
            200: 'success, message, stats{sources, totalFetched, alreadyInDB, crossSourceDuplicate, duplicateSkipped, coordFixed, classifiedAsLarge, classifiedAsMid, saved, failed}. dryRun 이면 data(수집 행 배열), 아니면 saved(저장한 회사명 배열)',
            500: '크롤링 실패',
        },
    },
    'GET /admin/company-crawler/progress/:runId': {
        summary: '회사 크롤링 진행 상황',
        description: 'run 요청이 떠 있는 동안 같은 runId 로 폴링합니다. 진행 정보는 서버 메모리에만 있고 끝난 뒤 10분이 지나면 지워집니다.',
        auth: 'admin-menu',
        params: [{ name: 'runId', required: true, description: 'run 호출 때 보낸 runId' }],
        responses: { 200: CRAWL_PROGRESS_200, 500: '서버 오류' },
    },
    'POST /admin/company-crawler/save': {
        summary: '미리보기에서 고른 회사 저장',
        description:
            '크롤링을 다시 돌리지 않고 넘어온 행을 그대로 저장합니다. 주소를 정규화해 이름+주소로 기존 회사를 찾고, 있으면 좌표·회사 유형을 덮어쓰고 홈페이지·대표·업종은 값이 있을 때만 바꿉니다. ' +
            '없으면 새로 만듭니다. 이름·좌표·주소가 빠진 행과 같은 요청 안의 중복은 건너뜁니다.',
        auth: 'admin-menu',
        body: [
            { name: 'items', type: 'array', items: 'object', required: true, description: 'run(dryRun) 응답 data 의 행. compName, compAddr, compLateX, compLateY 필수, 나머지 comp* 필드는 선택' },
        ],
        responses: {
            200: 'success, message, stats{requested, saved, updated, skipped, failed}, saved(처리한 회사명 배열)',
            400: 'items 가 비었거나 배열이 아님',
            500: '저장 실패',
        },
    },
    'GET /admin/company-crawler/run/:source': {
        summary: '회사 단일 소스 크롤링 (테스트용)',
        description:
            '소스 하나만 골라 run 과 같은 과정을 돌립니다. dryRun 을 빼면 저장까지 합니다. ' +
            'dryRun=false 처럼 true 가 아닌 값을 넘기면 미리보기도 아니고 저장도 되지 않으니 저장하려면 아예 빼야 합니다.',
        auth: 'admin-menu',
        params: [{ name: 'source', required: true, description: 'kakao | naver | publicData', example: 'kakao' }],
        query: [
            { name: 'query', description: '검색 키워드 (기본 "회사")' },
            { name: 'region', description: '지역 (기본 "서울")' },
            { name: 'count', type: 'integer', description: '수집 건수 (기본 10)' },
            { name: 'dryRun', description: '"true" 면 미리보기만', example: 'true' },
        ],
        responses: {
            200: 'success, source, message, stats, data(미리보기) 또는 saved(저장한 회사명)',
            400: '지원하지 않는 source ({ error } 형태)',
            500: '크롤링 실패',
        },
    },

    // --- admin/crawler (식당 크롤러) -------------------------------
    'GET /admin/crawler/sources': {
        summary: '식당 크롤링 소스 목록',
        description: '카카오·네이버는 API 키 설정 여부로 사용 가능 여부를 판단하고, 식신은 웹 크롤링이라 늘 ready 입니다. google 은 run 에서 쓸 수 있지만 이 목록에는 없습니다.',
        auth: 'admin-menu',
        responses: {
            200: '배열. { name(kakao | naver | siksin), label, ready, reason?, note? }',
            500: '{ error: "Internal Server Error" }',
        },
    },
    'POST /admin/crawler/run': {
        summary: '식당 크롤링 실행',
        description:
            '카카오·네이버·구글 Places·식신에서 식당을 병렬로 모아 DB 기존 건과 대조하고 카카오 지오코딩으로 좌표를 보정합니다. ' +
            '끝날 때까지 응답이 오지 않으니 runId 를 보내 progress/:runId 로 폴링하면 됩니다. ' +
            'dryRun 이면 기존 건(_existsInDb)·소스 간 중복(_duplicateOf) 표시와 함께 전부 돌려주고, 아니면 신규 건만 이름+주소 기준 upsert 합니다 (메뉴·이미지는 값이 있을 때만 덮어씀).',
        auth: 'admin-menu',
        body: [
            { name: 'sources', type: 'array', items: 'string', description: '수집 소스. kakao | naver | google | siksin (기본 전부)', example: ['kakao', 'naver'] },
            { name: 'query', description: '검색 키워드 (기본 "맛집")', example: '맛집' },
            { name: 'region', description: '지역 (기본 "서울"). 검색어 앞에 붙음', example: '서울' },
            { name: 'lat', type: 'number', description: '검색 중심 위도 (카카오·구글)' },
            { name: 'lng', type: 'number', description: '검색 중심 경도 (카카오·구글)' },
            { name: 'radius', type: 'integer', description: '검색 반경 m (기본 20000)' },
            { name: 'countPerSource', type: 'integer', description: '소스당 수집 건수 (기본 50)' },
            { name: 'dryRun', type: 'boolean', description: 'true 면 수집·미리보기만 하고 저장하지 않음' },
            { name: 'runId', description: '진행 상황 조회 키. 클라이언트가 만들어 보냄' },
        ],
        responses: {
            200: 'success, message, stats{sources, totalFetched, alreadyInDB, crossSourceDuplicate, duplicateSkipped, coordFixed, saved, failed}. dryRun 이면 data(수집 행 배열), 아니면 saved(저장한 식당명 배열)',
            500: '크롤링 실패',
        },
    },
    'GET /admin/crawler/progress/:runId': {
        summary: '식당 크롤링 진행 상황',
        description: '진행 중인 run 과 같은 runId 로 폴링합니다. 메모리에만 보관되어 종료 10분 뒤 사라지고, 저장에 실패하면 phase 가 error 로 끝납니다.',
        auth: 'admin-menu',
        params: [{ name: 'runId', required: true, description: 'run 호출 때 보낸 runId' }],
        responses: { 200: CRAWL_PROGRESS_200, 500: '서버 오류' },
    },
    'POST /admin/crawler/save': {
        summary: '미리보기에서 고른 식당 저장',
        description:
            '크롤링을 다시 돌리지 않고 넘어온 행을 한 트랜잭션으로 upsert 합니다 (이름+정규화 주소 기준). 기존 식당은 URL·업종·좌표를 갱신하고, 메뉴·이미지는 값이 있을 때만 덮어씁니다. ' +
            '이름이나 좌표가 없는 행은 제외됩니다.',
        auth: 'admin-menu',
        body: [
            { name: 'items', type: 'array', items: 'object', required: true, description: 'run(dryRun) 응답 data 의 행. restaurantName, restaurantLatX, restaurantLatY 필수, 나머지 restaurant* 필드는 선택' },
        ],
        responses: {
            200: 'success, message, stats{requested, saved, skipped, failed}, saved(저장한 식당명 배열)',
            400: 'items 가 비었거나 배열이 아님',
            500: '저장 실패 (트랜잭션 전체 롤백)',
        },
    },
    'GET /admin/crawler/stats': {
        summary: '식당 DB 현황',
        description: '활성 식당 수와 메뉴·이미지·평점이 있는 식당 수, 최근 7일 추가 수를 셉니다.',
        auth: 'admin-menu',
        responses: {
            200: 'totalRestaurants, withMenu, withImage, withRating, recentAdded',
            500: '{ error: "Internal Server Error" }',
        },
    },
    'GET /admin/crawler/missing-stats': {
        summary: '식당 빈 필드 통계',
        description: '활성 식당 중 메뉴·이미지·URL·지번주소가 비어 있는 건수를 컬럼별로 셉니다.',
        auth: 'admin-menu',
        responses: {
            200: '배열. { key(restaurantMenu | restaurantImage | restaurantURL | restaurantLotAddr), label, total, missing, filled }',
            500: '서버 오류',
        },
    },
    'POST /admin/crawler/enrich': {
        summary: '식당 빈 필드 보강',
        description:
            '메뉴나 이미지가 빈 활성 식당을 조회수 순으로 골라 식신 웹페이지를 검색·파싱해 채웁니다. 이름이 정확히 같거나 서로 포함될 때만 매칭합니다. ' +
            '한 건씩 외부 사이트를 긁어 오래 걸리므로 요청 타임아웃을 10분으로 늘려 뒀습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'field', required: true, description: '보강할 필드. restaurantMenu | restaurantImage', example: 'restaurantMenu' },
            { name: 'limit', type: 'integer', description: '처리할 식당 수 (기본 10, 최대 50)', example: 10 },
        ],
        responses: {
            200: 'success, message, total, updated, results[{ name, status(updated | no_data | not_found | error), matched?, error? }]. 대상이 없으면 updated=0 과 안내 메시지만',
            400: 'field 가 허용 값이 아님',
            500: '서버 오류',
        },
    },
    'POST /admin/crawler/enrich/stream': {
        summary: '식당 빈 필드 보강 (실시간 스트림)',
        description: 'enrich 와 같은 작업을 하면서 식당 하나가 끝날 때마다 NDJSON 한 줄로 결과를 흘려보냅니다.',
        auth: 'admin-menu',
        body: [
            { name: 'field', required: true, description: '보강할 필드. restaurantMenu | restaurantImage', example: 'restaurantMenu' },
            { name: 'limit', type: 'integer', description: '처리할 식당 수 (기본 10, 최대 50)', example: 10 },
        ],
        responses: {
            200: ENRICH_STREAM_200,
            400: 'field 가 허용 값이 아님 (스트림 시작 전 JSON 응답)',
            500: '대상 조회 실패 (스트림 시작 전 JSON 응답)',
        },
    },
    'GET /admin/crawler/run/:source': {
        summary: '식당 단일 소스 크롤링 (테스트용)',
        description:
            '지정한 소스 하나로 run 과 같은 과정을 실행하며, dryRun 을 빼면 저장까지 진행합니다. ' +
            'dryRun=false 처럼 true 가 아닌 값을 넘기면 미리보기도 저장도 되지 않으니, 저장하려면 파라미터를 아예 빼야 합니다.',
        auth: 'admin-menu',
        params: [{ name: 'source', required: true, description: 'kakao | naver | google | siksin', example: 'siksin' }],
        query: [
            { name: 'query', description: '검색 키워드 (기본 "맛집")' },
            { name: 'region', description: '지역 (기본 "서울")' },
            { name: 'count', type: 'integer', description: '수집 건수 (기본 10)' },
            { name: 'dryRun', description: '"true" 면 미리보기만', example: 'true' },
        ],
        responses: {
            200: 'success, source, message, stats, data(미리보기) 또는 saved(저장한 식당명)',
            400: '지원하지 않는 source ({ error } 형태)',
            500: '크롤링 실패',
        },
    },

    // --- admin/scheduler-run (수동 실행·실행 기록) -----------------
    'GET /admin/scheduler-run/jobs': {
        summary: '실행 가능한 스케줄러 목록',
        description: '식당 주간 수집(restaurant-crawl), 회사 주간 수집(company-crawl), OpenDart 회사 정보 갱신(company-data) 세 가지 잡과 각 잡의 마지막 실행 기록을 돌려줍니다.',
        auth: 'admin-menu',
        responses: {
            200: 'success, data[{ key, label, description, group, cron, supportsPeriod, lastRun{jobKey, status, startedAt, finishedAt, durationMs, resultMessage} | null }]',
            500: '목록 조회 실패',
        },
    },
    'POST /admin/scheduler-run/run': {
        summary: '스케줄러 수동 실행',
        description:
            '고른 잡을 서버 메모리 큐에 넣고 바로 응답합니다. 큐는 한 번에 하나씩 순서대로 돌리고, 시작·종료 결과를 tb_scheduler_run 에 남깁니다 (크론 정기 실행도 같은 큐를 탑니다). ' +
            '이미 대기·실행 중인 잡과 없는 key 는 조용히 건너뜁니다. 진행 상황은 progress 로 확인할 수 있습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'keys', type: 'array', items: 'string', required: true, description: '실행할 잡 key. restaurant-crawl | company-crawl | company-data', example: ['company-data'] },
            { name: 'periodFrom', description: '대상 기간 시작 YYYY-MM-DD. company-data 만 사용하며 연도만 봄 (비우면 전년도)', example: '2025-01-01' },
            { name: 'periodTo', description: '대상 기간 끝. 기록에만 남고 실행에는 쓰이지 않음' },
        ],
        responses: {
            200: 'success, message, data[{ id(큐 항목 id), jobKey, jobLabel }]. 새로 넣은 게 없으면 data 가 빈 배열',
            400: 'keys 가 비었거나 배열이 아님',
            500: '실행 실패',
        },
    },
    'GET /admin/scheduler-run/progress': {
        summary: '스케줄러 큐 진행 상황',
        description: '지금 큐에 있는 대기·실행 중 항목을 보여 줍니다. 잡 자체는 진행률을 모르므로, 진행 바용으로 같은 잡의 직전 성공 소요 시간(expectedMs)을 함께 내려줍니다.',
        auth: 'admin-menu',
        responses: {
            200: 'success, items[{ id, jobKey, jobLabel, status(waiting | running), trigger(manual | cron), startedAt, elapsedMs, canCancel }], runningCount, waitingCount, expectedMs',
            500: '진행 상황 조회 실패',
        },
    },
    'DELETE /admin/scheduler-run/queue/:id': {
        summary: '대기 중인 스케줄러 취소',
        description: '대기 중인 항목만 큐에서 뺍니다. 실행 중인 잡은 중간에 끊으면 데이터가 어중간해지므로 취소할 수 없습니다.',
        auth: 'admin-menu',
        params: [{ name: 'id', required: true, description: '큐 항목 id (run·progress 응답의 id)', example: 'q_1727600000000_1' }],
        responses: {
            200: '취소됨',
            400: '이미 끝났거나 없는 항목, 또는 실행 중이라 취소 불가',
            500: '취소 실패',
        },
    },
    'GET /admin/scheduler-run/runs': {
        summary: '스케줄러 실행 기록',
        description: '수동·정기 실행 기록을 최신순으로 돌려주고 상태별 건수를 함께 집계합니다. 여기서는 runIdx 가 문자열이 아니라 숫자입니다.',
        auth: 'admin-menu',
        query: [
            { name: 'limit', type: 'integer', description: '가져올 개수 (기본 100, 최대 300)' },
            { name: 'offset', type: 'integer', description: '건너뛸 개수 (기본 0)' },
        ],
        responses: {
            200: 'success, rows[{ runIdx, jobKey, jobLabel, trigger, status(running | success | failed), periodFrom, periodTo, startedAt, finishedAt, durationMs, resultMessage, error }], counts{total, running, success, failed}',
            500: '실행 기록 조회 실패',
        },
    },
};
