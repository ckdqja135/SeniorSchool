// 동적 서비스(services/:slug, admin/services) + 자유게시판(freeboard) API 설명.
// 동적 서비스는 slug 마다 dynamic_<slug>_{entities,boards,comments,requests} 테이블을 따로 쓴다.
import { ApiDocMap } from '../api-doc.types';

const SLUG_PARAM = { name: 'slug', required: true, description: '서비스 슬러그 (소문자로 시작, 소문자·숫자·밑줄 2~30자)', example: 'hospital' } as const;
const SLUG_400 = 'slug 형식 오류 또는 예약어';
const SLUG_404 = '없거나 활성 상태가 아닌 서비스';

export const dynamicFreeboardDocs: ApiDocMap = {
    // ------------- 동적 서비스 (퍼블릭) -------------

    'GET /services': {
        summary: '활성 서비스 목록',
        description: 'status 가 active 인 서비스만 serviceOrder, serviceIdx 순으로 반환하며, 필드 설정은 포함하지 않습니다.',
        responses: {
            200: 'data: 서비스 배열 (serviceIdx, serviceSlug, serviceName, serviceDisplay, serviceEmoji, serviceColor, templateType, serviceStatus=1, serviceOrder)',
            500: '서버 오류',
        },
    },

    'GET /services/:slug/entities': {
        summary: '서비스 엔티티 목록',
        description: 'status=1 인 엔티티를 최신 등록순(entity_idx 내림차순)으로 페이지 단위로 조회합니다. 행에는 해당 서비스 템플릿과 커스텀 필드에 따른 컬럼이 그대로 담깁니다.',
        params: [SLUG_PARAM],
        query: [
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
            { name: 'location', description: 'location 컬럼 일치 필터' },
            { name: 'type', description: 'type 컬럼 일치 필터' },
        ],
        responses: {
            200: 'totalCount, totalPages, currentPage, currentCount, data(엔티티 행 배열)',
            400: SLUG_400,
            404: SLUG_404,
            500: '서버 오류',
        },
    },

    'GET /services/:slug/entities/top-viewed': {
        summary: '조회수 상위 엔티티',
        description: 'status=1 인 엔티티를 view_count 내림차순으로 가져옵니다.',
        params: [SLUG_PARAM],
        query: [{ name: 'limit', type: 'integer', description: '개수 (기본 10)' }],
        responses: { 200: 'data: 엔티티 행 배열', 400: SLUG_400, 404: SLUG_404, 500: '서버 오류' },
    },

    'GET /services/:slug/entities/auto-search': {
        summary: '엔티티 이름 자동완성',
        description: 'name 부분 일치로 활성 엔티티를 최대 10개, 이름순으로 찾습니다. keyword 가 비어 있으면 곧바로 빈 배열을 반환합니다.',
        params: [SLUG_PARAM],
        query: [{ name: 'keyword', description: '검색어', example: '서울' }],
        responses: { 200: 'data: [{ entity_idx, name, location }]', 400: SLUG_400, 404: SLUG_404, 500: '서버 오류' },
    },

    'GET /services/:slug/entities/:id': {
        summary: '엔티티 상세',
        description: '조회할 때마다 view_count 가 1 오르고, 응답에는 오르기 전 값이 담깁니다. status 를 거르지 않으므로 비활성(삭제된) 엔티티도 조회됩니다.',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '엔티티 ID (entity_idx)' }],
        responses: { 200: 'data: 엔티티 행 전체', 400: SLUG_400, 404: `${SLUG_404} 또는 엔티티 없음`, 500: '서버 오류' },
    },

    'GET /services/:slug/boards': {
        summary: '서비스 게시글(후기) 목록',
        description: '삭제되지 않은 글을 등록일 최신순으로 페이지 단위로 조회합니다. 목록 키가 data 가 아닌 posts 라는 점에 유의해야 합니다.',
        params: [SLUG_PARAM],
        query: [
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
            { name: 'entityIdx', type: 'integer', description: '특정 엔티티의 글만 (entity_idx 로 보내도 됨)' },
            { name: 'category', description: 'board_category 일치 필터' },
        ],
        responses: {
            200: 'totalCount, totalPages, currentPage, posts(게시글 행 배열)',
            400: SLUG_400,
            404: SLUG_404,
            500: '서버 오류',
        },
    },

    'GET /services/:slug/boards/recent': {
        summary: '서비스 최근 게시글',
        params: [SLUG_PARAM],
        query: [{ name: 'limit', type: 'integer', description: '개수 (기본 5)' }],
        responses: { 200: 'data: 게시글 행 배열 (등록일 최신순)', 400: SLUG_400, 404: SLUG_404, 500: '서버 오류' },
    },

    'GET /services/:slug/boards/top-viewed': {
        summary: '서비스 조회수 상위 게시글',
        params: [SLUG_PARAM],
        query: [{ name: 'limit', type: 'integer', description: '개수 (기본 10)' }],
        responses: { 200: 'data: 게시글 행 배열 (board_hits 내림차순)', 400: SLUG_400, 404: SLUG_404, 500: '서버 오류' },
    },

    'GET /services/:slug/boards/:id': {
        summary: '서비스 게시글 상세',
        description: '글과 댓글(등록순)을 함께 반환합니다. 조회 시 board_hits 가 1 오르지만 응답에는 오르기 전 값이 담깁니다.',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '게시글 ID (board_idx)' }],
        responses: {
            200: 'data: 게시글 행 + comments(댓글 행 배열)',
            400: SLUG_400,
            404: `${SLUG_404} 또는 게시글 없음(삭제 포함)`,
            500: '서버 오류',
        },
    },

    'POST /services/:slug/boards/insert': {
        summary: '서비스 게시글(후기) 작성',
        description: '비밀번호는 SHA-256 해시로 저장됩니다. boardRating 범위는 서버에서 따로 검사하지 않습니다.',
        params: [SLUG_PARAM],
        body: [
            { name: 'boardTitle', required: true, description: '제목 (최대 100자)' },
            { name: 'boardID', required: true, description: '작성자 ID' },
            { name: 'boardPW', required: true, description: '비밀번호 (수정·삭제 확인용)' },
            { name: 'boardContent', description: '본문' },
            { name: 'entityIdx', type: 'integer', description: '연결할 엔티티 ID' },
            { name: 'boardCategory', description: '카테고리 (최대 20자)' },
            { name: 'boardRating', type: 'number', description: '평점 (0.5~5.0 용도)', example: 4.5 },
        ],
        responses: {
            201: 'data: { boardIdx } (숫자)',
            400: `boardTitle, boardID, boardPW 중 누락 또는 ${SLUG_400}`,
            404: SLUG_404,
            500: '서버 오류',
        },
    },

    'POST /services/:slug/boards/:id/like': {
        summary: '서비스 게시글 좋아요',
        description: '이름과 달리 토글이 아니라 호출할 때마다 board_like 를 1 올립니다. 중복 방지나 요청 횟수 제한이 없고, 응답의 boardLike 는 기존 값(문자열)에 1을 이어 붙인 값이라 실제 숫자와 다릅니다 (예: "0" → "01").',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        responses: {
            200: 'data: { boardLike }',
            400: SLUG_400,
            404: `${SLUG_404} 또는 게시글 없음(삭제 포함)`,
            500: '서버 오류',
        },
    },

    'GET /services/:slug/comments/:boardId': {
        summary: '서비스 게시글 댓글 목록',
        description: '삭제되지 않은 댓글을 등록순의 평평한 배열로 내려줍니다. 계층 구성은 comment_parent 를 기준으로 클라이언트에서 처리해야 합니다.',
        params: [SLUG_PARAM, { name: 'boardId', type: 'integer', required: true, description: '게시글 ID' }],
        responses: { 200: 'data: 댓글 행 배열', 400: SLUG_400, 404: SLUG_404, 500: '서버 오류' },
    },

    'POST /services/:slug/comments': {
        summary: '서비스 댓글 작성',
        description: '삭제되지 않은 게시글에만 달 수 있습니다. commentDepth 는 서버가 계산하지 않고 받은 값을 그대로 저장합니다.',
        params: [SLUG_PARAM],
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 ID' },
            { name: 'writerId', required: true, description: '작성자 ID' },
            { name: 'writerPw', required: true, description: '비밀번호' },
            { name: 'commentContent', required: true, description: '내용 (최대 200자)' },
            { name: 'commentParent', type: 'integer', description: '부모 댓글 ID (대댓글일 때)' },
            { name: 'commentDepth', type: 'integer', description: '댓글 깊이 (기본 0)' },
        ],
        responses: {
            201: 'data: { commentIdx } (숫자)',
            400: `필수값 누락 또는 ${SLUG_400}`,
            404: `${SLUG_404} 또는 게시글 없음`,
            500: '서버 오류',
        },
    },

    'DELETE /services/:slug/comments/:id': {
        summary: '서비스 댓글 삭제',
        description: 'password 를 보내면 저장된 해시와 비교하고, **보내지 않으면 확인 없이 삭제**됩니다. 작성자 ID 는 확인하지 않으며, soft delete 로 처리됩니다.',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '댓글 ID' }],
        body: [{ name: 'password', description: '댓글 비밀번호' }],
        responses: {
            200: '삭제 완료 메시지',
            400: SLUG_400,
            403: '비밀번호 불일치',
            404: `${SLUG_404} 또는 댓글 없음(이미 삭제 포함)`,
            500: '서버 오류',
        },
    },

    'POST /services/:slug/requests': {
        summary: '서비스 항목 추가 요청',
        description: '사용자가 목록에 없는 항목의 등록을 요청합니다. pending 상태로 저장되며 어드민에서 처리합니다. 요청 횟수 제한 대상은 아닙니다.',
        params: [SLUG_PARAM],
        body: [
            { name: 'requestName', required: true, description: '요청 항목 이름 (최대 60자)' },
            { name: 'requestData', type: 'object', description: '부가 정보. JSON 으로 저장' },
            { name: 'requesterId', description: '요청자 ID' },
        ],
        responses: {
            201: 'data: { requestIdx } (숫자)',
            400: `requestName 누락 또는 ${SLUG_400}`,
            404: SLUG_404,
            500: '서버 오류',
        },
    },

    // ------------- 동적 서비스 설정 (어드민) -------------

    'GET /admin/services': {
        summary: '서비스 설정 목록',
        description: '기본으로 active, inactive 서비스를 필드 설정과 함께 가져옵니다. status 를 지정하면 해당 상태만 조회합니다.',
        auth: 'admin-menu',
        query: [{ name: 'status', description: 'active | inactive | deleted', example: 'active' }],
        responses: {
            200: 'data: 서비스 배열. serviceStatus 는 1(active)/0(inactive)/-1(deleted), fields 에 fieldIdx·fieldKey·fieldLabel·fieldType·isRequired·showInList·showInDetail·showInSearch·sortOrder',
            500: '서버 오류',
        },
    },

    'POST /admin/services': {
        summary: '서비스 생성',
        description:
            '설정과 필드를 저장한 뒤 dynamic_<slug>_ 로 시작하는 테이블 4개(entities, boards, comments, requests)를 만듭니다. ' +
            '중간에 실패하면 만든 테이블과 설정 레코드를 되돌리고 500 으로 응답합니다. 템플릿 기본 필드 뒤에 customFields 가 붙습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'serviceSlug', required: true, description: '슬러그 (slug 로 보내도 됨)', example: 'hospital' },
            { name: 'serviceName', description: '서비스 이름 (name)' },
            { name: 'serviceDisplay', description: '표시 이름 (displayName). 없으면 응답에서 이름으로 대체' },
            { name: 'serviceEmoji', description: '이모지 (emoji)' },
            { name: 'serviceColor', description: '색상 (color)' },
            { name: 'templateType', description: 'basic | company | restaurant (기본 basic)' },
            { name: 'serviceOrder', type: 'integer', description: '정렬 순서 (sortOrder, 기본 0)' },
            {
                name: 'customFields',
                type: 'array',
                items: 'object',
                description: '추가 필드. 항목마다 fieldKey, fieldLabel, fieldType(기본 text), fieldLength, isRequired, showInSearch, showInList, showInDetail, showInAdmin, sortOrder',
            },
        ],
        responses: {
            201: 'data: 생성된 서비스 (목록과 같은 형식, fields 포함)',
            400: 'slug 형식 오류 또는 예약어',
            409: '이미 쓰는 slug (삭제된 서비스 포함)',
            500: '서버 오류 (DDL 실패 시 보상 처리 후)',
        },
    },

    'GET /admin/services/:slug': {
        summary: '서비스 설정 상세',
        description: '상태와 상관없이 slug 로 찾으므로 비활성·삭제된 서비스도 조회됩니다.',
        auth: 'admin-menu',
        params: [{ name: 'slug', required: true, description: '서비스 슬러그' }],
        responses: { 200: 'data: 서비스 + fields', 404: '서비스 없음', 500: '서버 오류' },
    },

    'PUT /admin/services/:slug': {
        summary: '서비스 설정 수정',
        description: '보낸 항목만 바꿉니다. slug, 템플릿, 필드 구성은 여기서 바꿀 수 없습니다. 수정 후 슬러그 캐시를 비웁니다.',
        auth: 'admin-menu',
        params: [{ name: 'slug', required: true, description: '서비스 슬러그' }],
        body: [
            { name: 'serviceName', description: '서비스 이름 (name)' },
            { name: 'serviceDisplay', description: '표시 이름 (displayName)' },
            { name: 'serviceEmoji', description: '이모지 (emoji)' },
            { name: 'serviceColor', description: '색상 (color)' },
            { name: 'serviceOrder', type: 'integer', description: '정렬 순서 (sortOrder)' },
            { name: 'serviceStatus', description: '1/0/-1 또는 active/inactive/deleted. status 로 보내면 문자열 그대로 저장' },
        ],
        responses: { 200: '수정 완료 메시지', 404: '서비스 없음', 500: '서버 오류' },
    },

    'DELETE /admin/services/:slug': {
        summary: '서비스 삭제',
        description: 'status 를 deleted 로 바꾸는 soft delete 입니다. 동적 테이블과 데이터는 그대로 남습니다.',
        auth: 'admin-menu',
        params: [{ name: 'slug', required: true, description: '서비스 슬러그' }],
        responses: { 200: '비활성화 완료 메시지', 404: '서비스 없음', 500: '서버 오류' },
    },

    // ------------- 동적 서비스 데이터 관리 (어드민) -------------

    'GET /admin/services/:slug/search': {
        summary: '어드민 엔티티 목록',
        description: '퍼블릭 엔티티 목록과 같은 로직이라 status=1 인 엔티티만 나오고, 이름 검색은 지원하지 않습니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM],
        query: [
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
            { name: 'location', description: 'location 일치 필터' },
            { name: 'type', description: 'type 일치 필터' },
        ],
        responses: {
            200: 'totalCount, totalPages, currentPage, currentCount, data',
            400: SLUG_400,
            404: SLUG_404,
            500: '서버 오류',
        },
    },

    'POST /admin/services/:slug/entities': {
        summary: '엔티티 등록',
        description:
            '본문 키는 테이블 컬럼명(snake_case) 그대로 씁니다. 공통 컬럼, 템플릿 컬럼, 서비스 필드 설정의 fieldKey 에 해당하는 키만 저장되고 나머지는 무시됩니다. ' +
            '쓸 수 있는 키가 하나도 없거나 name 처럼 필수 컬럼이 빠지면 500 이 납니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM],
        body: [
            { name: 'name', required: true, description: '이름' },
            { name: 'location', description: '위치 (시/도)' },
            { name: 'type', description: '유형' },
            { name: 'addr', description: '도로명 주소' },
            { name: 'lat_x', type: 'number', description: '위도' },
            { name: 'lat_y', type: 'number', description: '경도' },
            { name: '(기타 컬럼)', description: 'established, leader, url, lot_addr, map_img, status, 템플릿 컬럼(ceo, food_type 등), 커스텀 필드 키' },
        ],
        responses: {
            201: 'data: { entityIdx } (숫자)',
            400: SLUG_400,
            404: SLUG_404,
            500: '유효한 컬럼 없음, 필수 컬럼 누락 등 DB 오류',
        },
    },

    'PUT /admin/services/:slug/entities/:id': {
        summary: '엔티티 수정',
        description: '등록과 같은 컬럼 화이트리스트를 적용해 보낸 컬럼만 바꿉니다. 유효한 키가 없으면 500 오류가 발생합니다. status 를 1 로 보내 삭제된 엔티티를 되살릴 수도 있습니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '엔티티 ID' }],
        body: [{ name: '(컬럼명)', description: '바꿀 컬럼과 값. 키 규칙은 엔티티 등록과 동일' }],
        responses: {
            200: '수정 완료 메시지',
            400: SLUG_400,
            404: `${SLUG_404} 또는 엔티티 없음`,
            500: '유효한 컬럼 없음 또는 DB 오류',
        },
    },

    'DELETE /admin/services/:slug/entities/:id': {
        summary: '엔티티 삭제',
        description: 'status 를 0 으로 바꾸는 soft delete 입니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '엔티티 ID' }],
        responses: { 200: '삭제 완료 메시지', 400: SLUG_400, 404: `${SLUG_404} 또는 엔티티 없음`, 500: '서버 오류' },
    },

    'GET /admin/services/:slug/board': {
        summary: '어드민 게시글 목록',
        description: '퍼블릭 게시글 목록과 같은 로직이며, 삭제된 글은 제외됩니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM],
        query: [
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
            { name: 'entityIdx', type: 'integer', description: '엔티티 ID 필터 (entity_idx 도 가능)' },
            { name: 'category', description: 'board_category 일치 필터' },
        ],
        responses: {
            200: 'totalCount, totalPages, currentPage, posts',
            400: SLUG_400,
            404: SLUG_404,
            500: '서버 오류',
        },
    },

    'DELETE /admin/services/:slug/board/:id': {
        summary: '게시글 삭제 (어드민)',
        description: '비밀번호 확인 없이 is_deleted=1 로 표시합니다. 이미 삭제된 글이어도 200 으로 응답합니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        responses: { 200: '삭제 완료 메시지', 400: SLUG_400, 404: `${SLUG_404} 또는 게시글 없음`, 500: '서버 오류' },
    },

    'GET /admin/services/:slug/requests': {
        summary: '추가 요청 목록',
        description: '요청일 최신순으로 조회합니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM],
        query: [
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
            { name: 'status', description: 'pending | completed | rejected' },
        ],
        responses: {
            200: 'totalCount, totalPages, currentPage, data(요청 행 배열)',
            400: SLUG_400,
            404: SLUG_404,
            500: '서버 오류',
        },
    },

    'PUT /admin/services/:slug/requests/:id': {
        summary: '추가 요청 처리',
        description: '상태를 바꾸고 processed_date 를 현재 시각으로 기록합니다. 숫자로 보내면 0=pending, 1=completed, 2=rejected 로 변환해 처리합니다.',
        auth: 'admin-menu',
        params: [SLUG_PARAM, { name: 'id', type: 'integer', required: true, description: '요청 ID' }],
        body: [
            { name: 'requestStatus', required: true, description: 'pending | completed | rejected 또는 0/1/2', example: 'completed' },
            { name: 'adminNote', description: '관리자 메모. 보낼 때만 갱신' },
        ],
        responses: {
            200: '변경 완료 메시지',
            400: `상태값이 없거나 잘못됨, 또는 ${SLUG_400}`,
            404: `${SLUG_404} 또는 요청 없음`,
            500: '서버 오류',
        },
    },

    // ------------- 자유게시판 -------------

    'GET /freeboard': {
        summary: '자유게시판 글 목록',
        description: 'search 는 제목, 본문, 카테고리, 태그 문자열을 부분 일치로 찾습니다. tags 는 배열로 파싱해 내려줍니다.',
        query: [
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
            { name: 'search', description: '검색어' },
            { name: 'category', description: '카테고리 일치 필터' },
            { name: 'sort', description: 'latest(기본) | oldest | popular (좋아요 → 조회수 → 최신순)' },
        ],
        responses: {
            200: 'data(boardIdx, boardTitle, boardContent, boardRegDate, boardLike, boardHits, boardID, category, tags), totalCount, currentCount, pagination{ currentPage, totalPages, hasNext, hasPrev }',
            500: '서버 오류',
        },
    },

    'GET /freeboard/recent': {
        summary: '자유게시판 최근 글',
        description: '삭제되지 않은 글 중 최신 5개입니다.',
        responses: { 200: 'data: 글 배열 (목록과 같은 필드)', 500: '서버 오류' },
    },

    'GET /freeboard/stats': {
        summary: '자유게시판 카테고리·태그 통계',
        description: '삭제되지 않은 글을 기준으로 그때그때 집계합니다. 둘 다 상위 10개까지 집계합니다.',
        responses: {
            200: 'data: { topCategories: [{ category, count(문자열) }], topTags: [{ tag, count(숫자) }] }',
            500: '서버 오류',
        },
    },

    'GET /freeboard/:id': {
        summary: '자유게시판 글 상세',
        description: '글과 댓글 트리를 함께 반환하고 조회수를 1 올립니다. 응답의 boardHits 는 오르기 전 값이며, 대댓글은 최상위 댓글의 replies 에 담깁니다.',
        params: [{ name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        responses: {
            200: 'data: { post, comments[{ commentIdx, commentContent, writerId, commentLike, commentDepth, commentParent, commentRegDate, replies }] }',
            404: '게시글 없음(삭제 포함)',
            500: '서버 오류',
        },
    },

    'POST /freeboard': {
        summary: '자유게시판 글 작성 (일괄)',
        description:
            '본문으로 글 배열을 그대로 보내거나 { boards: [...] } 로 감싸 보냅니다. 한 건씩 저장하며, 일부가 실패해도 나머지는 저장되고 응답은 200 입니다. ' +
            '저장된 글마다 카테고리·태그 누적 통계도 올립니다.',
        body: [
            { name: 'boards', type: 'array', items: 'object', required: true, description: '글 배열 (본문 자체가 배열이어도 됨)' },
            { name: 'boards[].boardTitle', required: true, description: '제목 (최대 200자)' },
            { name: 'boards[].boardContent', required: true, description: '본문' },
            { name: 'boards[].category', required: true, description: '카테고리' },
            { name: 'boards[].boardID', required: true, description: '작성자 ID' },
            { name: 'boards[].boardPW', required: true, description: '비밀번호' },
            { name: 'boards[].tags', type: 'array', items: 'string', description: '태그 목록 (기본 [])' },
        ],
        responses: {
            200: 'data: { message, totalProcessed, successCount, errorCount, results[{ index, boardIdx, boardTitle, status }], errors[{ index, error, data }] }',
            400: 'boards 배열이 없거나 비어 있음',
            500: '서버 오류',
        },
    },

    'PUT /freeboard/:id': {
        summary: '자유게시판 글 수정',
        description: '작성자 ID 와 비밀번호가 모두 맞아야 합니다. 제목, 본문, 카테고리, 태그를 통째로 덮어쓰므로 tags 를 빼면 빈 배열로 바뀝니다.',
        params: [{ name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        body: [
            { name: 'boardTitle', required: true, description: '제목' },
            { name: 'boardContent', required: true, description: '본문' },
            { name: 'category', required: true, description: '카테고리' },
            { name: 'boardID', required: true, description: '작성자 ID' },
            { name: 'boardPW', required: true, description: '비밀번호 (boardPassword 로 보내도 됨)' },
            { name: 'tags', type: 'array', items: 'string', description: '태그 목록' },
        ],
        responses: {
            200: 'data: { message }',
            400: '필수 필드 누락',
            403: '작성자 ID 또는 비밀번호 불일치',
            404: '게시글 없음(삭제 포함)',
            500: '서버 오류',
        },
    },

    'DELETE /freeboard/:id': {
        summary: '자유게시판 글 삭제',
        description: '작성자 ID 와 비밀번호를 확인한 뒤 soft delete 합니다.',
        params: [{ name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        body: [
            { name: 'boardID', required: true, description: '작성자 ID' },
            { name: 'boardPW', required: true, description: '비밀번호 (boardPassword 로 보내도 됨)' },
        ],
        responses: {
            200: 'data: { message }',
            400: '작성자 ID 또는 비밀번호 누락',
            403: '작성자 ID 또는 비밀번호 불일치',
            404: '게시글 없음(삭제 포함)',
            500: '서버 오류',
        },
    },

    'POST /freeboard/:id/comments': {
        summary: '자유게시판 댓글 작성',
        description:
            '게시글이 있는지는 확인하지 않고 저장합니다. commentParent 가 있으면 depth 1, 없으면 0 으로 저장됩니다. ' +
            '서버에서 400 으로 검사하는 건 commentContent 뿐이라, 작성자나 비밀번호가 빠지면 500 이 납니다.',
        params: [{ name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        body: [
            { name: 'commentContent', required: true, description: '댓글 내용' },
            { name: 'commentWriter', required: true, description: '작성자 ID' },
            { name: 'commentPassword', required: true, description: '비밀번호' },
            { name: 'commentParent', type: 'integer', description: '부모 댓글 ID (대댓글일 때)' },
        ],
        responses: {
            201: 'data: { commentIdx, message }',
            400: 'commentContent 누락',
            500: '작성자·비밀번호 누락 또는 서버 오류',
        },
    },

    'PUT /freeboard/comments/:commentId': {
        summary: '자유게시판 댓글 수정',
        description: '작성 때와 필드 이름이 다릅니다. 여기서는 writerId, writerPw 를 사용합니다.',
        params: [{ name: 'commentId', type: 'integer', required: true, description: '댓글 ID' }],
        body: [
            { name: 'commentContent', required: true, description: '새 내용' },
            { name: 'writerId', required: true, description: '작성자 ID' },
            { name: 'writerPw', required: true, description: '비밀번호' },
        ],
        responses: {
            200: 'data: { message }',
            400: '필수 필드 누락',
            403: '작성자 ID 또는 비밀번호 불일치',
            404: '댓글 없음(삭제 포함)',
            500: '서버 오류',
        },
    },

    'DELETE /freeboard/comments/:commentId': {
        summary: '자유게시판 댓글 삭제',
        description: '작성자 ID 와 비밀번호를 확인한 뒤 soft delete 합니다. 대댓글은 따로 지우지 않습니다.',
        params: [{ name: 'commentId', type: 'integer', required: true, description: '댓글 ID' }],
        body: [
            { name: 'writerId', required: true, description: '작성자 ID' },
            { name: 'writerPw', required: true, description: '비밀번호' },
        ],
        responses: {
            200: 'data: { message }',
            400: '작성자 ID 또는 비밀번호 누락',
            403: '작성자 ID 또는 비밀번호 불일치',
            404: '댓글 없음(삭제 포함)',
            500: '서버 오류',
        },
    },

    'POST /freeboard/:id/like': {
        summary: '자유게시판 글 좋아요',
        description:
            'isLiked 가 true(기본)면 1 올리고 false 면 1 내립니다 (0 아래로는 안 내려감). 누가 눌렀는지 기록하지 않으므로 중복 방지는 클라이언트가 맡아야 합니다. ' +
            '삭제된 글도 대상이 되고, 요청 횟수 제한은 걸려 있지 않습니다.',
        params: [{ name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        body: [{ name: 'isLiked', type: 'boolean', description: 'true 증가, false 감소 (boolean 이 아니면 true 로 처리)' }],
        responses: {
            200: 'data: { message, currentLikes(숫자), liked }',
            404: 'data.message 에 게시글 없음 메시지',
            500: '서버 오류',
        },
    },

    'POST /freeboard/comments/:commentId/like': {
        summary: '자유게시판 댓글 좋아요',
        description: '글 좋아요와 같은 방식입니다. 삭제된 댓글도 대상이 되며, 요청 횟수 제한은 없습니다.',
        params: [{ name: 'commentId', type: 'integer', required: true, description: '댓글 ID' }],
        body: [{ name: 'isLiked', type: 'boolean', description: 'true 증가, false 감소 (기본 true)' }],
        responses: {
            200: 'data: { message, currentLikes(숫자), liked }',
            404: 'data.message 에 댓글 없음 메시지',
            500: '서버 오류',
        },
    },

    'POST /freeboard/:id/hit': {
        summary: '자유게시판 조회수 증가',
        description: '글 존재 여부와 상관없이 항상 200 으로 응답합니다. 상세 조회에서도 조회수가 오르므로 둘 다 호출하면 두 번 올라갑니다. 요청 횟수 제한은 없습니다.',
        params: [{ name: 'id', type: 'integer', required: true, description: '게시글 ID' }],
        responses: { 200: 'data: { message }', 500: '서버 오류' },
    },
};
