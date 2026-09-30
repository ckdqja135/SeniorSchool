// 어드민 콘텐츠 관리 API 설명: 후기 게시판 5종(/admin/*board), 교회, 회사, 외주업체.
import { ApiDoc, ApiDocField, ApiDocMap } from '../api-doc.types';

// -- 어드민 후기 게시판 공통 필드 (5개 게시판이 같은 베이스 서비스를 쓴다) --

const boardIdxParam: ApiDocField[] = [{ name: 'boardIdx', type: 'integer', description: '후기 번호', example: 12 }];

const boardListQuery: ApiDocField[] = [
    { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
    { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
];

const boardCreateBase: ApiDocField[] = [
    { name: 'boardTitle', required: true, description: '제목' },
    { name: 'boardContent', required: true, description: '본문' },
    { name: 'boardID', required: true, description: '작성자 이름' },
    { name: 'boardPW', required: true, description: '글 비밀번호 (해시 없이 그대로 저장됨)' },
    { name: 'boardRegDate', description: '등록 일시 (없으면 현재 UTC 시각, "YYYY-MM-DD HH:mm:ss")' },
    { name: 'boardLike', type: 'integer', description: '좋아요 수 (기본 0)' },
    { name: 'boardHits', type: 'integer', description: '조회수 (기본 0)' },
];

const boardCreateResponses = {
    201: '{ status, data }. 단건이면 저장된 글 객체, 배열이면 저장된 글 배열',
    400: '"필수값 누락: <필드명>". 배열 등록 중이면 앞선 항목은 이미 저장된 상태',
    500: '서버 오류',
};

const boardUpdateResponses = { 200: '수정 완료 메시지', 404: '게시글 없음', 500: '서버 오류' };
const boardDeleteResponses = { 200: '삭제 완료 메시지', 404: '게시글 없음', 500: '서버 오류' };

const boardListResponse = (alias: string, idx: string, name: string) =>
    `{ status, totalCount, totalPages, currentPage, posts }. 각 글에 ${alias}: { ${idx}, ${name} } (연결된 대상이 없으면 null)`;

// -- 교회/회사 추가 요청 목록 공통 --

const requestListQuery: ApiDocField[] = [
    { name: 'status', description: '요청 상태 (pending | completed | rejected). 그 밖의 값은 무시하고 전체 조회' },
    { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
    { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 10)' },
];

// -- 교회 입력 필드 --

const churchOptionalFields: ApiDocField[] = [
    { name: 'churchEstablished', description: '설립 연도 (기본 빈 문자열)' },
    { name: 'churchLatX', type: 'number', description: '좌표 X (기본 0)' },
    { name: 'churchLatY', type: 'number', description: '좌표 Y (기본 0)' },
    { name: 'churchURL', description: '홈페이지 주소' },
    { name: 'churchLotAddr', description: '지번 주소' },
    { name: 'churchAddr', description: '도로명 주소' },
    { name: 'churchMapIMG', description: '지도 이미지 경로' },
];

// -- 회사 입력 필드 (buildCompData 화이트리스트) --

const compOptionalFields: ApiDocField[] = [
    { name: 'compEstablish', description: '설립일' },
    { name: 'compURL', description: '홈페이지 주소' },
    { name: 'compMapIMG', description: '지도 이미지 경로' },
    { name: 'compCorpCode', description: 'DART 고유번호' },
    { name: 'compStatus', type: 'integer', description: '상태 (1 활성, 0 비활성)' },
    { name: 'compEmployeeCount', type: 'integer', description: '직원 수' },
    { name: 'totalEmployees', type: 'integer', description: '총 인원' },
    { name: 'newHires', type: 'integer', description: '입사자 수' },
    { name: 'resignations', type: 'integer', description: '퇴사자 수' },
    { name: 'compCapital', type: 'integer', description: '자본금' },
    { name: 'compSales', type: 'integer', description: '매출액' },
    { name: 'compAvgSalary', type: 'integer', description: '평균 연봉' },
    { name: 'compAvgTenure', type: 'number', description: '평균 근속연수 (소수 1자리)' },
    { name: 'compOperatingProfit', type: 'integer', description: '영업이익' },
    { name: 'compNetIncome', type: 'integer', description: '당기순이익' },
    { name: 'compTotalAssets', type: 'integer', description: '자산총계' },
    { name: 'compTotalLiabilities', type: 'integer', description: '부채총계' },
    { name: 'compTotalEquity', type: 'integer', description: '자본총계' },
    { name: 'compDataUpdatedAt', description: '재무 데이터 갱신 일시' },
];

const compIdxParam: ApiDocField[] = [{ name: 'compIdx', type: 'integer', description: '회사 번호', example: 101 }];

const compUpdateDoc: ApiDoc = {
    summary: '회사 정보 수정',
    auth: 'admin-menu',
    params: compIdxParam,
    body: [
        { name: 'compName', description: '회사명' },
        { name: 'compLocate', description: '지역' },
        { name: 'compType', description: '기업 형태' },
        { name: 'compCEO', description: '대표자' },
        { name: 'compIndustry', description: '업종' },
        { name: 'compLateX', type: 'number', description: '좌표 X' },
        { name: 'compLateY', type: 'number', description: '좌표 Y' },
        { name: 'compLotAddr', description: '지번 주소' },
        { name: 'compAddr', description: '도로명 주소' },
        ...compOptionalFields,
    ],
    responses: { 200: '{ status, message, data }. data는 수정된 회사 정보', 404: '회사 없음', 500: '서버 오류 (숫자 필드에 변환할 수 없는 값이 오는 경우 포함)' },
};

// -- 외주업체 입력 필드 --

const outsourceIdxParam: ApiDocField[] = [{ name: 'outsourceIdx', type: 'integer', description: '외주업체 번호', example: 7 }];

export const adminContentDocs: ApiDocMap = {
    // --------- 대학 후기 (/admin/univboard) ---------
    'GET /admin/univboard': {
        summary: '대학 후기 목록',
        description: '등록일 최신순으로 페이지 단위 조회합니다.',
        auth: 'admin-menu',
        query: boardListQuery,
        responses: { 200: boardListResponse('university', 'univIdx', 'univName'), 500: '서버 오류' },
    },
    'POST /admin/univboard': {
        summary: '대학 후기 등록',
        description: '객체 하나 또는 객체 배열을 받습니다. 배열이면 순서대로 한 건씩 저장하고, 중간에 필수값이 빠진 항목을 만나면 거기서 중단합니다.',
        auth: 'admin-menu',
        body: [...boardCreateBase, { name: 'univIdx', type: 'integer', description: '대학 번호' }],
        responses: boardCreateResponses,
    },
    'PUT /admin/univboard/:boardIdx': {
        summary: '대학 후기 수정',
        description: '제목과 본문만 바뀌고 다른 필드는 무시됩니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        body: [
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '본문' },
        ],
        responses: boardUpdateResponses,
    },
    'DELETE /admin/univboard/:boardIdx': {
        summary: '대학 후기 삭제',
        description: 'DB에서 바로 지웁니다 (복구 불가).',
        auth: 'admin-menu',
        params: boardIdxParam,
        responses: boardDeleteResponses,
    },

    // --------- 교회 후기 (/admin/churchboard) ---------
    'GET /admin/churchboard': {
        summary: '교회 후기 목록',
        auth: 'admin-menu',
        query: boardListQuery,
        responses: { 200: boardListResponse('church', 'churchIdx', 'churchName'), 500: '서버 오류' },
    },
    'POST /admin/churchboard': {
        summary: '교회 후기 등록',
        description: '단건과 배열을 모두 받으며, 처리 방식은 대학 후기와 같습니다.',
        auth: 'admin-menu',
        body: [...boardCreateBase, { name: 'churchIdx', type: 'integer', description: '교회 번호' }],
        responses: boardCreateResponses,
    },
    'PUT /admin/churchboard/:boardIdx': {
        summary: '교회 후기 수정',
        description: '수정 가능한 필드는 제목, 본문뿐입니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        body: [
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '본문' },
        ],
        responses: boardUpdateResponses,
    },
    'DELETE /admin/churchboard/:boardIdx': {
        summary: '교회 후기 삭제',
        description: '하드 삭제입니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        responses: boardDeleteResponses,
    },

    // --------- 회사 후기 (/admin/compboard) ---------
    'GET /admin/compboard': {
        summary: '회사 후기 목록',
        description: '다른 게시판과 달리 소프트 삭제를 쓰기 때문에 기본으로는 삭제된 글이 빠집니다. boardRating은 "4.0" 같은 문자열로, isDeleted는 true/false로 내려갑니다.',
        auth: 'admin-menu',
        query: [
            ...boardListQuery,
            { name: 'includeDeleted', description: '1이면 삭제된 글도 포함' },
        ],
        responses: { 200: boardListResponse('company', 'compIdx', 'compName'), 500: '서버 오류' },
    },
    'POST /admin/compboard': {
        summary: '회사 후기 등록',
        description: '단건 또는 배열. 카테고리와 별점을 함께 넣을 수 있고, isDeleted를 생략하면 0으로 저장됩니다.',
        auth: 'admin-menu',
        body: [
            ...boardCreateBase,
            { name: 'compIdx', type: 'integer', description: '회사 번호' },
            { name: 'boardCategory', description: '후기 카테고리' },
            { name: 'boardRating', type: 'number', description: '별점', example: 4.5 },
            { name: 'isDeleted', type: 'integer', description: '삭제 여부 (기본 0)' },
        ],
        responses: boardCreateResponses,
    },
    'PUT /admin/compboard/:boardIdx': {
        summary: '회사 후기 수정',
        description: '이미 삭제 처리된 글은 404로 막힙니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        body: [
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '본문' },
            { name: 'boardCategory', description: '후기 카테고리' },
            { name: 'boardRating', type: 'number', description: '별점' },
        ],
        responses: { 200: '수정 완료 메시지', 404: '게시글 없음 또는 이미 삭제됨', 500: '서버 오류' },
    },
    'DELETE /admin/compboard/:boardIdx': {
        summary: '회사 후기 삭제',
        description: '행을 지우지 않고 isDeleted를 1로 바꾸는 소프트 삭제입니다. 목록에서 includeDeleted=1로 다시 볼 수 있습니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        responses: { 200: '삭제 완료 메시지', 404: '게시글 없음 또는 이미 삭제됨', 500: '서버 오류' },
    },

    // --------- 외주 후기 (/admin/outsourceboard) ---------
    'GET /admin/outsourceboard': {
        summary: '외주 후기 목록',
        auth: 'admin-menu',
        query: boardListQuery,
        responses: { 200: boardListResponse('outsource', 'outsourceIdx', 'outsourceName'), 500: '서버 오류' },
    },
    'POST /admin/outsourceboard': {
        summary: '외주 후기 등록',
        description: '단건 객체 또는 배열로 등록합니다.',
        auth: 'admin-menu',
        body: [...boardCreateBase, { name: 'outsourceIdx', type: 'integer', description: '외주업체 번호' }],
        responses: boardCreateResponses,
    },
    'PUT /admin/outsourceboard/:boardIdx': {
        summary: '외주 후기 수정',
        auth: 'admin-menu',
        params: boardIdxParam,
        body: [
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '본문' },
        ],
        responses: boardUpdateResponses,
    },
    'DELETE /admin/outsourceboard/:boardIdx': {
        summary: '외주 후기 삭제',
        description: '하드 삭제. 회사 후기와 달리 숨김 처리가 아닙니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        responses: boardDeleteResponses,
    },

    // --------- 맛집 후기 (/admin/restaurantboard) ---------
    'GET /admin/restaurantboard': {
        summary: '맛집 후기 목록',
        description: 'boardRating은 "4.0" 형태의 문자열로 내려갑니다.',
        auth: 'admin-menu',
        query: boardListQuery,
        responses: { 200: boardListResponse('restaurant', 'restaurantIdx', 'restaurantName'), 500: '서버 오류' },
    },
    'POST /admin/restaurantboard': {
        summary: '맛집 후기 등록',
        description: '대학 후기와 같은 방식에 별점(boardRating)을 추가로 받습니다.',
        auth: 'admin-menu',
        body: [
            ...boardCreateBase,
            { name: 'restaurantIdx', type: 'integer', description: '식당 번호' },
            { name: 'boardRating', type: 'number', description: '별점', example: 4.5 },
        ],
        responses: boardCreateResponses,
    },
    'PUT /admin/restaurantboard/:boardIdx': {
        summary: '맛집 후기 수정',
        description: '다른 게시판과 달리 작성자 이름(boardID)과 별점도 고칠 수 있습니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        body: [
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '본문' },
            { name: 'boardID', description: '작성자 이름' },
            { name: 'boardRating', type: 'number', description: '별점' },
        ],
        responses: boardUpdateResponses,
    },
    'DELETE /admin/restaurantboard/:boardIdx': {
        summary: '맛집 후기 삭제',
        description: '글에 달린 댓글을 먼저 지운 뒤 글을 하드 삭제합니다.',
        auth: 'admin-menu',
        params: boardIdxParam,
        responses: boardDeleteResponses,
    },

    // --------- 교회 관리 (/admin/church) ---------
    'POST /admin/church/createChurch': {
        summary: '교회 등록',
        description:
            '객체 하나 또는 배열로 받아 한 건씩 저장하며, churchStatus는 1(활성)로 고정됩니다. ' +
            '필수값이 빠지면 400이 아니라 500이 돌아오고, 배열이면 앞서 저장된 항목은 그대로 남습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'churchName', required: true, description: '교회 이름' },
            { name: 'churchLocation', required: true, description: '지역' },
            { name: 'churchType', required: true, description: '교단/종류' },
            { name: 'churchPastor', required: true, description: '담임목사' },
            ...churchOptionalFields,
        ],
        responses: { 201: '{ insert: 저장 건수, success: true }', 500: '필수값 누락 또는 서버 오류' },
    },
    'GET /admin/church/searchChurch': {
        summary: '교회 목록 검색',
        description: '문자열 조건은 부분 일치로 찾고, 교회 번호 역순으로 정렬합니다. churchStatus를 주지 않으면 비활성(삭제된) 교회도 함께 조회됩니다.',
        auth: 'admin-menu',
        query: [
            { name: 'churchName', description: '교회 이름 (부분 일치)' },
            { name: 'churchLocation', description: '지역 (부분 일치)' },
            { name: 'churchType', description: '교단/종류 (부분 일치)' },
            { name: 'churchPastor', description: '담임목사 (부분 일치)' },
            { name: 'churchStatus', type: 'integer', description: '상태 (1 활성, 0 비활성)' },
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 10)' },
        ],
        responses: { 200: '{ status, data, totalCount, currentPage, totalPages, rowsPerPage }', 500: '서버 오류' },
    },
    'GET /admin/church/church': {
        summary: '교회 상세 (현재 항상 404)',
        description: '경로에 교회 번호가 없어서 조회 대상을 받을 수 없습니다. 레거시 동작을 그대로 옮긴 것이라 어떤 요청이든 404로 응답합니다.',
        auth: 'admin-menu',
        responses: { 404: '교회를 찾을 수 없음 (항상)', 500: '서버 오류' },
    },
    'PUT /admin/church/:churchIdx': {
        summary: '교회 정보 수정',
        description: '보낸 필드만 반영하고 모델에 없는 키는 버립니다. churchStatus를 1로 보내면 삭제된 교회를 되살릴 수 있습니다.',
        auth: 'admin-menu',
        params: [{ name: 'churchIdx', type: 'integer', description: '교회 번호' }],
        body: [
            { name: 'churchName', description: '교회 이름' },
            { name: 'churchLocation', description: '지역' },
            { name: 'churchType', description: '교단/종류' },
            { name: 'churchPastor', description: '담임목사' },
            ...churchOptionalFields.map((f) => ({ ...f, description: f.description.replace(/ \(기본 .*\)$/, '') })),
            { name: 'churchStatus', type: 'integer', description: '상태 (1 활성, 0 비활성)' },
            { name: 'churchViewCount', type: 'integer', description: '조회수' },
        ],
        responses: { 200: '{ status, message, data }. data는 수정 후 교회 정보', 404: '교회 없음', 500: '서버 오류' },
    },
    'DELETE /admin/church/bulk': {
        summary: '교회 일괄 삭제',
        description: 'churchStatus를 0으로 바꾸는 소프트 삭제입니다. 목록 중 존재하는 교회만 처리하고, 하나도 없으면 404를 반환합니다.',
        auth: 'admin-menu',
        body: [{ name: 'churchIdxList', type: 'array', items: 'integer', required: true, description: '삭제할 교회 번호 목록', example: [3, 5, 8] }],
        responses: { 200: '"N개의 교회가 성공적으로 삭제되었습니다."', 400: 'churchIdxList가 없거나 빈 배열', 404: '해당하는 교회가 하나도 없음', 500: '서버 오류' },
    },
    'DELETE /admin/church/:churchIdx': {
        summary: '교회 삭제',
        description: '소프트 삭제 (churchStatus = 0).',
        auth: 'admin-menu',
        params: [{ name: 'churchIdx', type: 'integer', description: '교회 번호' }],
        responses: { 200: '삭제 완료 메시지', 404: '교회 없음', 500: '서버 오류' },
    },
    'GET /admin/church/stats/overview': {
        summary: '교회 통계',
        description: '종류별·지역별 집계와 조회수 순위는 활성 교회만 대상으로 합니다.',
        auth: 'admin-menu',
        responses: {
            200: 'data: { totalChurches, activeChurches, inactiveChurches, churchTypeStats[{ churchType, count }], locationStats[{ churchLocation, count }] (상위 10), topViewedChurches (조회수 상위 10) }',
            500: '서버 오류',
        },
    },
    'GET /admin/church/request': {
        summary: '교회 추가 요청 목록',
        description: '요청일 최신순.',
        auth: 'admin-menu',
        query: requestListQuery,
        responses: { 200: '{ status, data, totalCount, currentPage, rowsPerPage, totalPages }', 500: '서버 오류' },
    },
    'PUT /admin/church/request/:requestIdx/status': {
        summary: '교회 추가 요청 상태 변경',
        description:
            '상태만 바꾸며, completed로 바꿔도 교회가 자동으로 만들어지지는 않습니다. completed일 때 처리 일시가 기록됩니다. ' +
            '상태값을 따로 검사하지 않아 허용되지 않은 값은 DB 단계에서 500이 됩니다.',
        auth: 'admin-menu',
        params: [{ name: 'requestIdx', type: 'integer', description: '요청 번호' }],
        body: [
            { name: 'status', description: 'pending | completed | rejected' },
            { name: 'adminNote', description: '관리자 메모 (비우면 기존 값 유지)' },
        ],
        responses: { 200: '{ status, message, data }. data는 변경된 요청', 404: '요청 없음', 500: '잘못된 상태값 또는 서버 오류' },
    },
    'POST /admin/church/request': {
        summary: '교회 추가 요청',
        description:
            '로그인 없이 누구나 호출할 수 있습니다. 같은 이름의 요청이 상태와 관계없이 이미 있으면 409를 반환합니다. ' +
            '이름이 비어 있으면 400이 아니라 500이 납니다.',
        body: [
            { name: 'churchName', required: true, description: '교회 이름 (앞뒤 공백 제거)' },
            { name: 'churchPastor', description: '담임목사' },
            { name: 'churchType', description: '교단/종류' },
            { name: 'churchAddr', description: '주소' },
        ],
        responses: {
            201: '{ success: true, message, data }. data는 생성된 요청 (requestStatus: pending)',
            409: '{ success: false, message, existingRequest } 이미 요청된 교회',
            500: '교회 이름 누락 또는 서버 오류',
        },
    },

    // --------- 회사 관리 (/admin/comp) ---------
    'POST /admin/comp/createComp': {
        summary: '회사 등록',
        description:
            '객체 하나 또는 배열을 받습니다. 필수값은 비어 있는지(falsy)로 검사하므로 좌표에 0을 넣어도 누락으로 처리됩니다. ' +
            '누락 시 500이 돌아오고, 배열이면 앞서 저장된 항목은 남습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'compName', required: true, description: '회사명' },
            { name: 'compLocate', required: true, description: '지역' },
            { name: 'compType', required: true, description: '기업 형태' },
            { name: 'compCEO', required: true, description: '대표자' },
            { name: 'compIndustry', required: true, description: '업종' },
            { name: 'compLateX', type: 'number', required: true, description: '좌표 X' },
            { name: 'compLateY', type: 'number', required: true, description: '좌표 Y' },
            { name: 'compLotAddr', required: true, description: '지번 주소' },
            { name: 'compAddr', required: true, description: '도로명 주소' },
            ...compOptionalFields,
        ],
        responses: { 201: '{ insert: 저장 건수, success: true }', 500: '필수값 누락 또는 서버 오류' },
    },
    'POST /admin/comp/validateBusiness': {
        summary: '사업자번호 확인',
        description:
            '국세청 API로 휴폐업 상태를 조회합니다. 대표자명과 개업일까지 보내면 진위 확인도 함께 합니다. ' +
            '휴폐업만 조회할 때는 응답의 status가 200 대신 ACTIVE, SUSPENDED, CLOSED, NOT_FOUND, INVALID_FORMAT 중 하나로 덮여 내려갑니다. ' +
            '국세청 호출이 실패하면 오류 대신 NOT_FOUND로 보일 수 있습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'bizNo', required: true, description: '사업자번호 10자리 (하이픈 허용). b_no로 보내도 됨', example: '123-45-67890' },
            { name: 'ceoName', description: '대표자명 (p_nm도 가능). 개업일과 함께 보내면 진위 확인' },
            { name: 'startDate', description: '개업일 YYYYMMDD (start_dt도 가능)' },
        ],
        responses: {
            200: '휴폐업만: { status: 상태코드, ok, message, raw? } / 진위 포함: { status: 200, ok, businessStatus, identityValidation }',
            400: '사업자번호 누락',
            500: '국세청 API 설정(NTS_BUSINESS_API_URL, PUBLIC_DATA_API_KEY) 누락 또는 서버 오류',
        },
    },
    'GET /admin/comp/searchComp': {
        summary: '회사 목록 검색',
        description:
            '회사 번호 역순으로 정렬합니다. 기존 관리 화면은 page/rowsPerPage, 데이터 보강 화면은 limit/offset으로 호출하며 limit/offset이 있으면 그쪽을 우선합니다. ' +
            'missing을 주면 해당 정보가 비어 있는 회사만 추립니다 (대표자는 "미정", 업종은 "기타"도 빈 값으로 봄).',
        auth: 'admin-menu',
        query: [
            { name: 'compName', description: '회사명 (부분 일치)' },
            { name: 'compLocate', description: '지역 (부분 일치)' },
            { name: 'compType', description: '기업 형태 (정확히 일치)' },
            { name: 'compIndustry', description: '업종 (부분 일치)' },
            { name: 'compStatus', type: 'integer', description: '상태 (1 활성, 0 비활성). 생략하면 전체' },
            { name: 'missing', description: 'url | ceo | industry 중 하나. 해당 정보가 빈 회사만' },
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 20)' },
            { name: 'limit', type: 'integer', description: '가져올 개수 (rowsPerPage 대신)' },
            { name: 'offset', type: 'integer', description: '건너뛸 개수 (page 대신)' },
        ],
        responses: {
            200: '{ status, message, data, totalCount, pagination: { totalCount, totalPages, currentPage, rowsPerPage, hasNextPage, hasPrevPage } }. compAvgTenure는 "3.5" 형태 문자열',
            500: '서버 오류',
        },
    },
    'GET /admin/comp/request': {
        summary: '회사 추가 요청 목록',
        description: '요청일 최신순.',
        auth: 'admin-menu',
        query: requestListQuery,
        responses: { 200: '{ status, data, totalCount, currentPage, rowsPerPage, totalPages }', 500: '서버 오류' },
    },
    'PUT /admin/comp/request/:requestIdx/status': {
        summary: '회사 추가 요청 상태 변경',
        description: '요청 상태만 바꾸고 회사를 자동 생성하지는 않습니다. completed면 처리 일시가 찍히고, 허용되지 않은 상태값은 DB 단계에서 500이 납니다.',
        auth: 'admin-menu',
        params: [{ name: 'requestIdx', type: 'integer', description: '요청 번호' }],
        body: [
            { name: 'status', description: 'pending | completed | rejected' },
            { name: 'adminNote', description: '관리자 메모 (비우면 기존 값 유지)' },
        ],
        responses: { 200: '{ status, message, data }. data는 변경된 요청', 404: '요청 없음', 500: '잘못된 상태값 또는 서버 오류' },
    },
    'GET /admin/comp/comp/:compIdx': {
        summary: '회사 상세',
        description: '조회할 때마다 조회수가 1 올라갑니다 (updated_at은 그대로). 응답의 조회수는 올리기 전 값입니다.',
        auth: 'admin-menu',
        params: compIdxParam,
        responses: { 200: '{ status, message, data }. data는 회사 정보', 404: '회사 없음', 500: '서버 오류' },
    },
    'DELETE /admin/comp/deleteComp/:compIdx': {
        summary: '회사 삭제',
        description: '행을 DB에서 지우는 하드 삭제입니다. 숨기기만 하려면 상태 변경 API를 사용하면 됩니다.',
        auth: 'admin-menu',
        params: compIdxParam,
        responses: { 200: '삭제 완료 메시지', 404: '회사 없음', 500: '서버 오류' },
    },
    'PUT /admin/comp/comp/:compIdx': {
        ...compUpdateDoc,
        description: '보낸 필드만 바꾸고 모르는 키는 버립니다. 같은 동작을 레거시 경로 PUT /admin/comp/putCompData/:compIdx 로도 호출할 수 있습니다.',
    },
    'PUT /admin/comp/putCompData/:compIdx': {
        ...compUpdateDoc,
        summary: '회사 정보 수정 (레거시 경로)',
        description: 'PUT /admin/comp/comp/:compIdx 와 같은 핸들러입니다. 새 코드에서는 그쪽 경로를 권장합니다.',
    },
    'PUT /admin/comp/comp/:compIdx/status': {
        summary: '회사 활성/비활성 전환',
        description: 'compStatus를 생략하면 아무것도 바꾸지 않고 현재 정보를 돌려줍니다.',
        auth: 'admin-menu',
        params: compIdxParam,
        body: [{ name: 'compStatus', type: 'integer', description: '1 활성, 0 비활성' }],
        responses: { 200: '{ status, message, data }. data는 변경된 회사 정보', 404: '회사 없음', 500: '서버 오류' },
    },
    'POST /admin/comp/comp/:compIdx/statistics': {
        summary: '회사 통계 갱신 (사용 불가)',
        description: '통계 테이블과 외부 API 연동이 이식되지 않아 항상 500을 반환합니다. 레거시 호환을 위해 경로만 남겨 두었습니다.',
        auth: 'admin-menu',
        params: compIdxParam,
        body: [
            { name: 'compName', description: '회사명 (사용되지 않음)' },
            { name: 'businessNumber', description: '사업자번호 (사용되지 않음)' },
            { name: 'year', type: 'integer', description: '연도 (사용되지 않음)' },
            { name: 'quarter', type: 'integer', description: '분기 (사용되지 않음)' },
        ],
        responses: { 500: '{ success: false, message, error } 기능 사용 불가 (항상)' },
    },
    'POST /admin/comp/statistics/batch': {
        summary: '회사 통계 일괄 갱신 (사용 불가)',
        description: '실제로는 아무것도 갱신하지 않고, 받은 회사 전부를 실패로 담아 200을 돌려줍니다.',
        auth: 'admin-menu',
        body: [{ name: 'companies', type: 'array', items: 'object', required: true, description: '[{ compIdx, compName }] 목록' }],
        responses: {
            200: '{ success: true, message, data: { success: 0, failed, errors[{ compIdx, compName, error }] } }',
            500: 'companies 누락 등 서버 오류 ({ success: false, message, error })',
        },
    },

    // --------- 외주업체 관리 (/admin/outsource) ---------
    'POST /admin/outsource/createOutsource': {
        summary: '외주업체 등록',
        description: '객체 하나 또는 배열을 받고, 상태는 1(활성)로 고정됩니다. 필수값 누락은 500으로 돌아오며 배열이면 앞서 저장된 항목이 남습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'outsourceName', required: true, description: '업체명' },
            { name: 'outsourceLocation', required: true, description: '지역' },
            { name: 'outsourceType', required: true, description: '업종/분야' },
            { name: 'outsourceCEO', required: true, description: '대표자' },
            { name: 'outsourceEstablished', description: '설립 연도' },
            { name: 'outsourceLatX', type: 'number', description: '좌표 X (기본 0)' },
            { name: 'outsourceLatY', type: 'number', description: '좌표 Y (기본 0)' },
            { name: 'outsourceURL', description: '홈페이지 주소' },
            { name: 'outsourceLotAddr', description: '지번 주소' },
            { name: 'outsourceAddr', description: '도로명 주소' },
            { name: 'outsourceMapIMG', description: '지도 이미지 경로' },
        ],
        responses: {
            201: '단건: { insert: 1, success: true, data: 생성된 업체 } / 배열: { insert: 건수, success: true }',
            500: '필수값 누락 또는 서버 오류',
        },
    },
    'GET /admin/outsource/searchOutsource': {
        summary: '외주업체 목록 검색',
        description: '활성 업체만 업체명 가나다순으로 조회하며, 삭제된 업체는 검색되지 않습니다.',
        auth: 'admin-menu',
        query: [
            { name: 'outsourceName', description: '업체명 (부분 일치)' },
            { name: 'outsourceType', description: '업종/분야 (정확히 일치)' },
            { name: 'outsourceLocation', description: '지역 (부분 일치)' },
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 10)' },
        ],
        responses: { 200: '{ status, totalCount, totalPages, currentPage, outsources }', 500: '서버 오류' },
    },
    'GET /admin/outsource/outsource': {
        summary: '외주업체 상세 (현재 항상 404)',
        description: '경로에 업체 번호가 없어 대상을 특정할 수 없습니다. 레거시 동작 그대로라 늘 404가 나옵니다.',
        auth: 'admin-menu',
        responses: { 404: '외주업체를 찾을 수 없음 (항상)', 500: '서버 오류' },
    },
    'PUT /admin/outsource/:outsourceIdx': {
        summary: '외주업체 정보 수정',
        description: '보낸 필드만 반영합니다. 응답에 수정된 데이터는 담기지 않습니다.',
        auth: 'admin-menu',
        params: outsourceIdxParam,
        body: [
            { name: 'outsourceName', description: '업체명' },
            { name: 'outsourceLocation', description: '지역' },
            { name: 'outsourceType', description: '업종/분야' },
            { name: 'outsourceEstablished', description: '설립 연도' },
            { name: 'outsourceCEO', description: '대표자' },
            { name: 'outsourceLatX', type: 'number', description: '좌표 X' },
            { name: 'outsourceLatY', type: 'number', description: '좌표 Y' },
            { name: 'outsourceURL', description: '홈페이지 주소' },
            { name: 'outsourceLotAddr', description: '지번 주소' },
            { name: 'outsourceAddr', description: '도로명 주소' },
            { name: 'outsourceMapIMG', description: '지도 이미지 경로' },
            { name: 'outsourceStatus', type: 'integer', description: '상태 (1 활성, 0 비활성)' },
            { name: 'outsourceViewCount', type: 'integer', description: '조회수' },
        ],
        responses: { 200: '수정 완료 메시지', 404: '외주업체 없음', 500: '서버 오류' },
    },
    'DELETE /admin/outsource/:outsourceIdx': {
        summary: '외주업체 삭제',
        description: 'outsourceStatus를 0으로 바꾸는 소프트 삭제입니다. 이미 삭제된 업체에 다시 호출해도 200으로 응답합니다.',
        auth: 'admin-menu',
        params: outsourceIdxParam,
        responses: { 200: '삭제 완료 메시지', 404: '외주업체 없음', 500: '서버 오류' },
    },
    'GET /admin/outsource/stats/overview': {
        summary: '외주업체 통계',
        description: '모든 집계는 활성 업체 기준입니다.',
        auth: 'admin-menu',
        responses: {
            200: 'stats: { totalOutsources, typeStats[{ type, count }], locationStats[{ location, count }], recentOutsources (최근 등록 5개) }',
            500: '서버 오류',
        },
    },
    'POST /admin/outsource/request': {
        summary: '외주업체 추가 요청',
        description: '로그인 없이 호출할 수 있습니다. 같은 이름으로 처리 대기(pending) 중인 요청이 있을 때만 409로 거절합니다.',
        body: [
            { name: 'outsourceName', required: true, description: '업체명 (앞뒤 공백 제거)' },
            { name: 'outsourceCEO', description: '대표자' },
            { name: 'outsourceType', description: '업종/분야' },
            { name: 'outsourceAddr', description: '주소' },
        ],
        responses: {
            201: '{ status, message, data }. data는 생성된 요청 (requestStatus: pending)',
            400: '업체명 누락',
            409: '같은 업체에 대한 대기 중 요청이 있음',
            500: '서버 오류',
        },
    },
    'GET /admin/outsource/request': {
        summary: '외주업체 추가 요청 목록',
        description: '요청일 최신순. 페이지 크기 파라미터 이름이 교회·회사와 달리 limit입니다.',
        auth: 'admin-menu',
        query: [
            { name: 'status', description: '요청 상태 (pending | completed | rejected). 그 밖의 값은 무시' },
            { name: 'page', type: 'integer', description: '페이지 번호 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
        ],
        responses: { 200: '{ status, totalCount, totalPages, currentPage, requests }. requestData는 가공 없이 문자열로 내려감', 500: '서버 오류' },
    },
    'GET /admin/outsource/request/:requestIdx': {
        summary: '외주업체 추가 요청 상세',
        description: '요청에 딸린 requestData(JSON)를 풀어서 기본 필드와 한 객체로 합쳐 돌려줍니다.',
        auth: 'admin-menu',
        params: [{ name: 'requestIdx', type: 'integer', description: '요청 번호' }],
        responses: {
            200: 'data: { requestIdx, outsourceName, outsourceCEO, outsourceType, outsourceAddr, requestStatus, requestDate, processedDate, adminNote, ...requestData 필드 }',
            404: '요청 없음',
            500: '서버 오류',
        },
    },
    'PUT /admin/outsource/request/:requestIdx/status': {
        summary: '외주업체 추가 요청 처리',
        description:
            'pending 요청을 completed로 바꾸면 외주업체를 자동으로 만듭니다. requestData가 있으면 name, region, category, websiteUrl 등에서 값을 가져오고, 없으면 요청의 기본 필드를 씁니다. ' +
            '같은 이름의 업체가 이미 있으면 409, 생성이 실패하면 500이며 두 경우 모두 요청 상태는 바뀌지 않습니다. ' +
            'adminNote를 생략하면 기존 메모가 지워집니다.',
        auth: 'admin-menu',
        params: [{ name: 'requestIdx', type: 'integer', description: '요청 번호' }],
        body: [
            { name: 'requestStatus', required: true, description: 'pending | completed | rejected' },
            { name: 'adminNote', description: '관리자 메모 (생략하면 null로 저장)' },
        ],
        responses: {
            200: '상태 변경 완료 메시지',
            400: '허용되지 않은 requestStatus',
            404: '요청 없음',
            409: '같은 이름의 외주업체가 이미 있음',
            500: '외주업체 자동 생성 실패 또는 서버 오류',
        },
    },
};
