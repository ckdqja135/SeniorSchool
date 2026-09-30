// 어드민 시스템 API 설명: 식당·대학교 관리, 방문 통계, 신고, 자유게시판, 대시보드, 계정, 권한.
import { ApiDocMap } from '../api-doc.types';

export const adminSystemDocs: ApiDocMap = {
    // --- 식당 관리 (/admin/restaurant) -------------------------

    'POST /admin/restaurant/createRestaurant': {
        summary: '식당 등록',
        description:
            '이미지는 세 가지 방식으로 받습니다. multipart 파일(`restaurantImage`, 5MB 이하 jpeg/jpg/png/gif/webp), JSON 본문의 base64 data URL, 또는 이미지 URL 문자열. ' +
            'JSON 본문을 배열로 보내면 여러 건을 한 번에 등록하고, 이때 응답에 data는 없습니다. 새 식당은 활성 상태(restaurantStatus=1)로 만들어집니다.',
        auth: 'admin-menu',
        bodyType: 'multipart',
        body: [
            { name: 'restaurantName', required: true, description: '식당 이름' },
            { name: 'restaurantLocation', required: true, description: '지역' },
            { name: 'restaurantType', required: true, description: '음식 종류' },
            { name: 'restaurantImage', type: 'file', description: '대표 이미지 파일. JSON 요청이면 base64 data URL 또는 이미지 URL 문자열' },
            { name: 'restaurantRating', type: 'number', description: '별점 0~5, 0.5 단위로 반올림' },
            { name: 'restaurantEstablished', description: '개업 정보 (기본 빈 문자열)' },
            { name: 'restaurantOwner', description: '대표자 (기본 빈 문자열)' },
            { name: 'restaurantLatX', type: 'number', description: '좌표 X (기본 0)' },
            { name: 'restaurantLatY', type: 'number', description: '좌표 Y (기본 0)' },
            { name: 'restaurantURL', description: '홈페이지 URL' },
            { name: 'restaurantLotAddr', description: '지번 주소' },
            { name: 'restaurantAddr', description: '도로명 주소' },
            { name: 'restaurantMapIMG', description: '지도 이미지 경로' },
        ],
        responses: {
            201: '{ insert, success, data }. 단건이면 data에 등록된 식당(restaurantRating은 "4.0" 같은 문자열)',
            400: 'base64 이미지 형식 오류, 또는 업로드 오류({ error }: 5MB 초과, 이미지 외 파일)',
            500: '필수값 누락이나 별점 범위 오류도 여기로 떨어짐. 업로드된 파일은 삭제됨',
        },
    },

    'GET /admin/restaurant/searchRestaurant': {
        summary: '식당 검색',
        description: '활성 식당만 이름순으로 찾습니다. 이름과 지역은 부분 일치, 음식 종류는 정확히 일치해야 합니다.',
        auth: 'admin-menu',
        query: [
            { name: 'restaurantName', description: '이름 검색어 (name도 가능)' },
            { name: 'restaurantType', description: '음식 종류 (type도 가능)' },
            { name: 'restaurantLocation', description: '지역 검색어 (location도 가능)' },
            { name: 'page', type: 'integer', description: '페이지 (기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (limit도 가능, 기본 10)' },
        ],
        responses: {
            200: '{ status, totalCount, totalPages, currentPage, restaurants }',
            500: '서버 오류',
        },
    },

    'GET /admin/restaurant/restaurant': {
        summary: '식당 상세 (사용 불가)',
        description: '경로에 식당 번호를 받는 자리가 없어 항상 404를 반환합니다. 예전 라우트를 그대로 옮겨 둔 것으로, 실제로는 쓰이지 않습니다.',
        auth: 'admin-menu',
        responses: { 404: "{ status: 404, message: '식당을 찾을 수 없습니다.' }", 500: '서버 오류' },
    },

    'PUT /admin/restaurant/:restaurantIdx': {
        summary: '식당 수정',
        description:
            '보낸 필드만 바뀝니다. 이미지는 등록과 같은 세 방식으로 받고, 새 이미지로 바꾸면 기존 파일은 서버에서 삭제합니다. ' +
            'restaurantImage를 빈 문자열이나 null로 보내면 이미지가 비워지고, 아예 빼면 기존 이미지가 유지됩니다.',
        auth: 'admin-menu',
        bodyType: 'multipart',
        params: [{ name: 'restaurantIdx', type: 'integer', required: true, description: '식당 번호' }],
        body: [
            { name: 'restaurantImage', type: 'file', description: '새 이미지 파일. JSON 요청이면 base64 data URL 또는 URL 문자열' },
            { name: 'restaurantName', description: '식당 이름' },
            { name: 'restaurantLocation', description: '지역' },
            { name: 'restaurantType', description: '음식 종류' },
            { name: 'restaurantRating', type: 'number', description: '별점 0~5, 0.5 단위로 반올림' },
            { name: 'restaurantMenu', description: '메뉴. 객체나 배열이면 JSON 문자열로 저장' },
            { name: 'restaurantStatus', type: 'integer', description: '1 활성, 0 비활성' },
            { name: 'restaurantEstablished', description: '개업 정보' },
            { name: 'restaurantOwner', description: '대표자' },
            { name: 'restaurantLatX', type: 'number', description: '좌표 X' },
            { name: 'restaurantLatY', type: 'number', description: '좌표 Y' },
            { name: 'restaurantURL', description: '홈페이지 URL' },
            { name: 'restaurantLotAddr', description: '지번 주소' },
            { name: 'restaurantAddr', description: '도로명 주소' },
            { name: 'restaurantMapIMG', description: '지도 이미지 경로' },
            { name: 'restaurantViewCount', type: 'integer', description: '조회수' },
        ],
        responses: {
            200: '{ status: 200, message }',
            400: '별점 범위 오류, base64 이미지 형식 오류, 업로드 오류({ error })',
            404: '식당 없음',
            500: '서버 오류. 새로 올린 이미지는 삭제됨',
        },
    },

    'DELETE /admin/restaurant/:restaurantIdx': {
        summary: '식당 삭제',
        description: '실제로 지우지 않고 restaurantStatus를 0으로 바꿔 숨깁니다.',
        auth: 'admin-menu',
        params: [{ name: 'restaurantIdx', type: 'integer', required: true, description: '식당 번호' }],
        responses: { 200: '{ status: 200, message }', 404: '식당 없음', 500: '서버 오류' },
    },

    'GET /admin/restaurant/stats/overview': {
        summary: '식당 통계',
        description: '활성 식당 기준으로 총 개수, 음식 종류별·지역별 개수, 최근 등록 5곳을 집계합니다. 이 응답의 count는 숫자입니다.',
        auth: 'admin-menu',
        responses: {
            200: '{ status, stats: { totalRestaurants, typeStats[{ type, count }], locationStats[{ location, count }], recentRestaurants } }',
            500: '서버 오류',
        },
    },

    'GET /admin/restaurant/request': {
        summary: '식당 추가 요청 목록',
        description: '사용자가 보낸 식당 추가 요청을 최신순으로 봅니다. 페이지 크기는 rowsPerPage가 아니라 limit으로 받습니다.',
        auth: 'admin-menu',
        query: [
            { name: 'status', description: '상태 필터: pending, completed, rejected. 그 외 값은 무시' },
            { name: 'page', type: 'integer', description: '페이지 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
        ],
        responses: { 200: '{ status, totalCount, totalPages, currentPage, requests }', 500: '서버 오류' },
    },

    'PUT /admin/restaurant/request/:requestIdx/status': {
        summary: '식당 추가 요청 상태 변경',
        description: 'completed로 바꾸면 처리일(processedDate)이 함께 기록됩니다. adminNote를 빼면 기존 메모는 비워집니다.',
        auth: 'admin-menu',
        params: [{ name: 'requestIdx', type: 'integer', required: true, description: '요청 번호' }],
        body: [
            { name: 'requestStatus', required: true, description: 'pending, completed, rejected 중 하나' },
            { name: 'adminNote', description: '관리자 메모' },
        ],
        responses: { 200: '{ status: 200, message }', 400: '허용되지 않는 상태값', 404: '요청 없음', 500: '서버 오류' },
    },

    // --- 대학교 관리 (/admin/univ) -----------------------------

    'POST /admin/univ/createUniv': {
        summary: '대학교 등록',
        description: '본문을 배열로 보내면 여러 학교를 차례로 등록합니다. 중간에 필수값이 빠진 항목을 만나면 그 앞까지만 저장하고 멈춥니다.',
        auth: 'admin-menu',
        body: [
            { name: 'univName', required: true, description: '학교 이름' },
            { name: 'univLocate', required: true, description: '지역' },
            { name: 'univLateX', type: 'number', required: true, description: '좌표 X' },
            { name: 'univLateY', type: 'number', required: true, description: '좌표 Y' },
            { name: 'univType', description: '학교 유형' },
            { name: 'univEstablish', description: '설립 정보' },
            { name: 'univPresident', description: '총장' },
            { name: 'univCampos', description: '캠퍼스' },
            { name: 'univURL', description: '홈페이지 URL' },
            { name: 'univLotAddr', description: '지번 주소' },
            { name: 'univAddr', description: '도로명 주소' },
            { name: 'univMapIMG', description: '지도 이미지 경로' },
            { name: 'univStatus', type: 'integer', description: '1 활성, 0 비활성' },
            { name: 'univViewCount', type: 'integer', description: '조회수' },
        ],
        responses: { 201: '{ insert, success: true }', 500: '필수값 누락 포함 서버 오류' },
    },

    'GET /admin/univ/searchUniv': {
        summary: '대학교 검색',
        description: '활성 학교만 번호순으로 조회합니다. keyword가 숫자면 학교 번호로, 아니면 이름 부분 일치로 찾습니다.',
        auth: 'admin-menu',
        query: [
            { name: 'keyword', description: '학교 번호 또는 이름 검색어' },
            { name: 'page', type: 'integer', description: '페이지 (currentPage도 가능, 기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 10)' },
        ],
        responses: {
            200: '{ status, data, totalCount, currentPage, rowsPerPage }. univStatus는 1/0 숫자',
            500: '서버 오류 (음수 페이지 값 포함)',
        },
    },

    'GET /admin/univ/univ/:univIdx': {
        summary: '대학교 상세',
        description: '비활성 학교도 조회됩니다.',
        auth: 'admin-menu',
        params: [{ name: 'univIdx', type: 'integer', required: true, description: '학교 번호' }],
        responses: { 200: '{ status: 200, data }', 404: '학교 없음', 500: '서버 오류' },
    },

    'DELETE /admin/univ/deleteUniv': {
        summary: '대학교 삭제',
        description: 'DB에서 실제로 지웁니다. 지울 대상이 하나도 없으면 200과 함께 success: false를 반환합니다.',
        auth: 'admin-menu',
        body: [
            { name: 'univIdx', type: 'array', items: 'integer', required: true, description: '학교 번호. 숫자 하나 또는 배열', example: [1, 2] },
        ],
        responses: { 200: '{ success, message, deletedCount }', 500: 'univIdx 누락·형식 오류 포함 서버 오류' },
    },

    'PUT /admin/univ/putUnivData': {
        summary: '대학교 수정',
        description: '보낸 필드만 바뀝니다. 수정 가능한 필드는 등록과 같습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'univIdx', type: 'integer', required: true, description: '학교 번호' },
            { name: 'univName', description: '학교 이름 (그 외 필드는 등록과 동일)' },
        ],
        responses: { 200: '{ success, message, affectedCount }', 500: 'univIdx 누락, 학교 없음 포함 서버 오류' },
    },

    'POST /admin/univ/request': {
        summary: '대학교 추가 요청',
        description: '사이트 사용자가 목록에 없는 학교를 요청할 때 씁니다. 같은 이름으로 이미 요청이 있으면 409와 함께 기존 요청을 내려줍니다.',
        body: [
            { name: 'univName', required: true, description: '학교 이름' },
            { name: 'univPresident', description: '총장' },
            { name: 'univAddr', description: '주소' },
        ],
        responses: {
            201: '{ success: true, message, data }',
            409: '{ success: false, message, existingRequest }',
            500: 'univName 누락 포함 서버 오류',
        },
    },

    'GET /admin/univ/request': {
        summary: '대학교 추가 요청 목록',
        description: '최신 요청부터 조회합니다. 응답의 currentPage와 rowsPerPage는 쿼리 값을 그대로 담기 때문에 문자열일 수 있습니다.',
        auth: 'admin-menu',
        query: [
            { name: 'status', description: '상태 필터: pending, completed, rejected. 그 외 값은 무시' },
            { name: 'page', type: 'integer', description: '페이지 (기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 10)' },
        ],
        responses: { 200: '{ status, data, totalCount, currentPage, rowsPerPage, totalPages }', 500: '서버 오류' },
    },

    'PUT /admin/univ/request/:requestIdx/status': {
        summary: '대학교 추가 요청 상태 변경',
        description: '식당 요청과 달리 rejected는 받지 않습니다. completed로 바꾸면 처리일이 기록되고, adminNote를 빼면 기존 메모가 비워집니다.',
        auth: 'admin-menu',
        params: [{ name: 'requestIdx', type: 'integer', required: true, description: '요청 번호' }],
        body: [
            { name: 'status', required: true, description: 'pending 또는 completed' },
            { name: 'adminNote', description: '관리자 메모' },
        ],
        responses: {
            200: '{ success: true, message, requestIdx, newStatus }',
            400: 'status 누락 또는 허용되지 않는 값',
            500: '요청 없음 포함 서버 오류',
        },
    },

    // --- 방문 통계 (/admin/pageview) ---------------------------

    'POST /admin/pageview/track': {
        summary: '방문 기록 저장',
        description: '프론트가 페이지를 열 때마다 호출합니다. IP는 X-Forwarded-For의 첫 값을 우선 쓰고, referrer를 안 보내면 Referer 헤더를 저장합니다.',
        body: [
            { name: 'path', required: true, description: '방문한 페이지 경로', example: '/restaurant' },
            { name: 'referrer', description: '유입 경로 (없으면 Referer 헤더)' },
        ],
        responses: { 200: '{ success: true }', 400: 'path 누락', 500: '{ success: false }' },
    },

    'GET /admin/pageview/path-stats': {
        summary: '경로별 방문 통계',
        description: '방문 수가 많은 경로 순으로 정렬합니다. 로컬 IP(::1, 127.0.0.1) 방문은 제외합니다.',
        auth: 'admin-menu',
        query: [
            { name: 'startDate', description: '시작일 (YYYY-MM-DD)' },
            { name: 'endDate', description: '종료일 (YYYY-MM-DD, 그날 끝까지 포함)' },
            { name: 'limit', type: 'integer', description: '최대 개수 (기본 20)' },
        ],
        responses: { 200: '{ success: true, data: [{ pvPath, count }] }', 500: '{ success: false, message }' },
    },

    'GET /admin/pageview/referer-stats': {
        summary: '유입 경로별 통계',
        description: '비어 있거나 http://localhost 로 시작하는 referer는 빠집니다. 경로별 통계와 달리 IP 기준 필터링은 없습니다.',
        auth: 'admin-menu',
        query: [
            { name: 'startDate', description: '시작일 (YYYY-MM-DD)' },
            { name: 'endDate', description: '종료일 (YYYY-MM-DD, 그날 끝까지 포함)' },
            { name: 'limit', type: 'integer', description: '최대 개수 (기본 20)' },
        ],
        responses: { 200: '{ success: true, data: [{ pvReferer, count }] }', 500: '{ success: false, message }' },
    },

    'GET /admin/pageview/daily-stats': {
        summary: '일별 방문 수',
        description: '날짜를 하나도 주지 않으면 최근 30일을 조회합니다. 로컬 IP 방문은 제외됩니다.',
        auth: 'admin-menu',
        query: [
            { name: 'startDate', description: '시작일 (YYYY-MM-DD)' },
            { name: 'endDate', description: '종료일 (YYYY-MM-DD, 그날 끝까지 포함)' },
        ],
        responses: { 200: '{ success: true, data: [{ date: "YYYY-MM-DD", count }] }. 날짜 오름차순', 500: '{ success: false, message }' },
    },

    'GET /admin/pageview/logs': {
        summary: '방문 로그',
        description: '방문 기록 원본을 페이지 단위로 보여 줍니다. 여기서도 로컬 IP 방문은 뺍니다.',
        auth: 'admin-menu',
        query: [
            { name: 'page', type: 'integer', description: '페이지 (기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 30)' },
            { name: 'path', description: '경로 부분 일치' },
            { name: 'startDate', description: '시작일 (YYYY-MM-DD)' },
            { name: 'endDate', description: '종료일 (YYYY-MM-DD, 그날 끝까지 포함)' },
            { name: 'order', description: 'ASC 또는 DESC (기본 DESC, 방문 시각 기준)' },
        ],
        responses: { 200: '{ success: true, totalCount, totalPages, currentPage, data }', 500: '{ success: false, message }' },
    },

    // --- 신고 (/admin/report) ----------------------------------

    'POST /admin/report/createReport': {
        summary: '신고 등록',
        description: '사이트 사용자가 게시글을 신고할 때 씁니다. 새 신고는 pending 상태로 저장됩니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '신고할 게시글 번호' },
            { name: 'serviceType', required: true, description: "게시판 종류 (예: 'univ'). reportType으로 보내도 됨" },
            { name: 'reportReason', required: true, description: '신고 사유' },
            { name: 'reporterId', description: '신고자 식별값' },
        ],
        responses: { 201: '{ status: 201, message, data }', 500: "{ message: '신고 등록 실패' }. 필수값 누락도 여기로 옴" },
    },

    'GET /admin/report/getReports': {
        summary: '신고 목록',
        description: '신고일 최신순입니다.',
        auth: 'admin-menu',
        query: [
            { name: 'serviceType', description: '게시판 종류 필터' },
            { name: 'reportStatus', description: '처리 상태 필터 (예: pending)' },
            { name: 'page', type: 'integer', description: '페이지 (기본 1)' },
            { name: 'rowsPerPage', type: 'integer', description: '페이지당 개수 (기본 10)' },
        ],
        responses: { 200: '{ status, data, totalCount, currentPage, rowsPerPage }', 500: "{ message: '신고 조회 실패' }" },
    },

    'GET /admin/report/getReportDetail': {
        summary: '신고 상세',
        description:
            "신고와 함께 신고된 게시글을 board로 붙여 줍니다. 지금은 serviceType이 'univ'일 때만 게시글을 찾고, 나머지는 board가 null입니다. " +
            '신고가 없어도 HTTP 상태는 200이고, 본문의 status가 404로 옵니다.',
        auth: 'admin-menu',
        query: [{ name: 'reportIdx', type: 'integer', required: true, description: '신고 번호' }],
        responses: {
            200: '{ status: 200, data: { report, board } } 또는 { status: 404, message }',
            500: "{ message: '상세 조회 실패' }",
        },
    },

    'PUT /admin/report/updateReportStatus': {
        summary: '신고 처리 상태 변경',
        description: '처리 상태와 처리 결과 중 보낸 것만 바꿉니다. 신고가 없을 때는 상세 조회와 마찬가지로 HTTP 200에 본문 status 404가 옵니다.',
        auth: 'admin-menu',
        body: [
            { name: 'reportIdx', type: 'integer', required: true, description: '신고 번호' },
            { name: 'reportStatus', description: '처리 상태' },
            { name: 'reportResult', description: '처리 결과' },
        ],
        responses: {
            200: '{ status: 200, message, data } 또는 { status: 404, message }',
            500: "{ message: '신고 상태 업데이트 실패' }. 둘 다 비어 있을 때도 여기로 옴",
        },
    },

    'DELETE /admin/report/deleteReportBoard': {
        summary: '신고 삭제',
        description: '신고 기록만 DB에서 지우고 신고된 게시글은 건드리지 않습니다. 대상이 없으면 HTTP 200에 본문 status 404입니다.',
        auth: 'admin-menu',
        body: [{ name: 'reportIdx', type: 'integer', required: true, description: '신고 번호' }],
        responses: {
            200: '{ status: 200, message } 또는 { status: 404, message }',
            500: "{ message: '신고 게시판 삭제 실패' }",
        },
    },

    // --- 자유게시판 관리 (/admin/freeboard) --------------------

    'GET /admin/freeboard': {
        summary: '자유게시판 글 목록',
        description: '작성일 최신순입니다. 기본으로는 삭제된 글을 빼고, includeDeleted=1이면 함께 보여 줍니다.',
        auth: 'admin-menu',
        query: [
            { name: 'page', type: 'integer', description: '페이지 (기본 1)' },
            { name: 'limit', type: 'integer', description: '페이지당 개수 (기본 10)' },
            { name: 'includeDeleted', description: '1이면 삭제된 글 포함' },
        ],
        responses: {
            200: '{ status, totalCount, totalPages, currentPage, posts }. tags는 파싱된 값, isDeleted는 불리언',
            500: '서버 오류',
        },
    },

    'POST /admin/freeboard': {
        summary: '자유게시판 글 등록',
        description:
            '관리자가 글을 직접 넣을 때 씁니다. 배열로 보내면 여러 건을 차례로 넣는데, 중간에 필수값이 빠진 항목이 있으면 400으로 응답하고 그 앞 항목은 이미 저장된 상태로 남습니다. ' +
            '작성일·좋아요·조회수까지 직접 지정할 수 있습니다.',
        auth: 'admin-menu',
        body: [
            { name: 'boardTitle', required: true, description: '제목' },
            { name: 'boardContent', required: true, description: '본문' },
            { name: 'boardID', required: true, description: '작성자 이름' },
            { name: 'boardPW', required: true, description: '글 비밀번호' },
            { name: 'category', required: true, description: '카테고리' },
            { name: 'tags', type: 'array', items: 'string', description: '태그 (JSON으로 저장)' },
            { name: 'boardRegDate', description: '작성일 (기본 지금)' },
            { name: 'boardModDate', description: '수정일' },
            { name: 'boardLike', type: 'integer', description: '좋아요 수 (기본 0)' },
            { name: 'boardHits', type: 'integer', description: '조회수 (기본 0)' },
            { name: 'isDeleted', type: 'boolean', description: '삭제 상태로 등록할지' },
        ],
        responses: { 201: '{ status: 201, data }. 배열로 보냈으면 data도 배열', 400: "'필수값 누락: <필드명>'", 500: '서버 오류' },
    },

    'PUT /admin/freeboard/:boardIdx': {
        summary: '자유게시판 글 수정',
        description: '제목, 본문, 카테고리, 태그만 바꿀 수 있고 수정일은 자동으로 갱신됩니다. 글 비밀번호는 확인하지 않습니다.',
        auth: 'admin-menu',
        params: [{ name: 'boardIdx', type: 'integer', required: true, description: '글 번호' }],
        body: [
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '본문' },
            { name: 'category', description: '카테고리' },
            { name: 'tags', type: 'array', items: 'string', description: '태그' },
        ],
        responses: { 200: '{ status: 200, message }', 404: '글이 없거나 이미 삭제됨', 500: '서버 오류' },
    },

    'DELETE /admin/freeboard/:boardIdx': {
        summary: '자유게시판 글 삭제',
        description: 'isDeleted만 켜는 소프트 삭제입니다.',
        auth: 'admin-menu',
        params: [{ name: 'boardIdx', type: 'integer', required: true, description: '글 번호' }],
        responses: { 200: '{ status: 200, message }', 404: '글이 없거나 이미 삭제됨', 500: '서버 오류' },
    },

    // --- 대시보드 (/admin/dashboard) ---------------------------

    'GET /admin/dashboard/overview': {
        summary: '대시보드 요약',
        description:
            '모든 서비스(대학교·교회·회사·외주·식당·자유게시판)를 합친 숫자 네 개입니다. ' +
            '총 게시글, 활성 업체 수, 처리 대기 신고, 이번 주(월요일부터) 새 글과 새 업체 수를 반환합니다.',
        auth: 'admin-menu',
        responses: {
            200: '{ success: true, data: { totalPosts, totalCompanies, reportedPosts, thisWeekActivity } }',
            500: '{ success: false, message, error }',
        },
    },

    'GET /admin/dashboard/monthly-stats': {
        summary: '월별 등록 추이',
        description: '최근 12개월의 월별 게시글 수와 업체 등록 수입니다. 최신 달이 먼저 오고, 데이터가 없는 달도 0으로 채웁니다.',
        auth: 'admin-menu',
        responses: {
            200: '{ success: true, data: [{ month: "YYYY-MM", postCount, companyCount }] }',
            500: '{ success: false, message, error }',
        },
    },

    'GET /admin/dashboard/recent-activities': {
        summary: '최근 활동',
        description:
            '업체 추가·수정과 게시글 작성·수정을 한 줄로 섞어 최신순으로 보여 줍니다. ' +
            'type은 업체면 church, company, outsource, restaurant, university이고, 게시글이면 freeboard_post, church_post 처럼 뒤에 _post가 붙습니다. ' +
            '게시글 수정은 자유게시판만 잡힙니다.',
        auth: 'admin-menu',
        query: [{ name: 'limit', type: 'integer', description: '최대 개수 (기본 20)' }],
        responses: {
            200: '{ success: true, data: [{ id, type, action(add|update|create), name, entityName, timestamp }] }',
            500: '{ success: false, message, error }',
        },
    },

    // --- 계정 (/admin/user) ------------------------------------

    'POST /admin/user/signIn': {
        summary: '관리자 로그인',
        description:
            '성공하면 24시간짜리 JWT를 본문의 accessToken으로 주고, 같은 값을 httpOnly 쿠키(accessToken, 1시간)에도 심습니다. ' +
            '없는 아이디와 틀린 비밀번호는 계정 존재 여부가 드러나지 않도록 같은 401 메시지로 응답하고, 비활성 계정은 비밀번호가 맞아도 403을 반환합니다. ' +
            '운영 환경에서는 IP당 15분에 실패 20회를 넘기면 429로 막힙니다(성공한 로그인은 세지 않음).',
        body: [
            { name: 'username', required: true, description: '관리자 아이디' },
            { name: 'password', required: true, description: '비밀번호' },
        ],
        responses: {
            200: '{ user: { userId(계정 번호), username, userRole }, accessToken }',
            400: '{ success: false, message: "아이디와 비밀번호를 입력해주세요." }',
            401: '{ success: false, message: "아이디 또는 비밀번호가 일치하지 않습니다." } - 없는 계정·비밀번호 불일치 공통',
            403: '비활성화된 계정',
            429: '로그인 실패 횟수 초과',
            500: '서버 오류',
        },
    },

    'GET /admin/user/verify': {
        summary: '토큰 확인',
        description: 'Authorization 헤더, token 쿼리, accessToken 쿠키 순으로 토큰을 찾아 유효한지만 확인합니다. 만료되거나 잘못된 토큰이면 쿠키도 삭제합니다.',
        query: [{ name: 'token', description: '확인할 토큰 (헤더나 쿠키로 보내도 됨)' }],
        responses: {
            200: '{ valid: true }',
            401: '{ valid: false, message }. 만료면 expired: true가 붙음',
        },
    },

    'DELETE /admin/user/deleteAdmin': {
        summary: '관리자 계정 삭제',
        description: '본인 계정과 마지막 활성 master 계정은 지울 수 없습니다.',
        auth: 'master',
        body: [
            { name: 'userIdx', type: 'array', items: 'integer', required: true, description: '계정 번호. 숫자 하나 또는 배열', example: [3] },
        ],
        responses: {
            200: '{ success: true, message, deletedCount }',
            400: 'userIdx 누락, 본인 또는 마지막 master 삭제 시도, 삭제할 계정 없음',
        },
    },

    'POST /admin/user/createAdmin': {
        summary: '관리자 계정 추가',
        description:
            'groupIdx로 권한 그룹을 고르면 userRole이 따라 정해집니다(master 그룹이면 master, 나머지는 admin). ' +
            'groupIdx 없이 보내면 userRole에 맞는 기본 그룹(master 또는 admin)에 배정합니다.',
        auth: 'master',
        body: [
            { name: 'userId', required: true, description: '아이디' },
            { name: 'userPw', required: true, description: '비밀번호' },
            { name: 'groupIdx', type: 'integer', description: '권한 그룹 번호' },
            { name: 'userRole', description: 'groupIdx가 없을 때만 사용: master 또는 admin (기본 admin)' },
            { name: 'userStatus', type: 'integer', description: '1 활성, 0 비활성 (기본 1)' },
        ],
        responses: {
            201: '{ success: true, message }',
            400: '없는 권한 그룹 또는 잘못된 groupIdx',
            500: '필수값 누락, 이미 있는 아이디 (운영에서는 메시지가 가려짐)',
        },
    },

    'PATCH /admin/user/patchAdmin': {
        summary: '관리자 계정 수정',
        description:
            '권한 그룹, 활성 여부, 비밀번호만 바꿀 수 있습니다. 비밀번호는 해시해서 저장합니다. ' +
            '본인 계정이나 마지막 활성 master를 강등·비활성화하려 하면 400으로 막습니다.',
        auth: 'master',
        body: [
            { name: 'userIdx', type: 'integer', required: true, description: '계정 번호' },
            { name: 'groupIdx', type: 'integer', description: '권한 그룹 번호 (userRole도 함께 바뀜)' },
            { name: 'userStatus', type: 'integer', description: '1 활성, 0 비활성' },
            { name: 'userPw', description: '새 비밀번호 (4자 이상)' },
        ],
        responses: {
            200: '{ success: true, message, affectedCount: 1 }',
            400: '계정 없음, 잘못된 값, 바꿀 내용 없음, 본인·마지막 master 보호',
        },
    },

    'GET /admin/user/getAdminlist': {
        summary: '관리자 계정 목록',
        description: 'master 계정도 함께 나옵니다.',
        auth: 'master',
        responses: { 200: '[{ userIdx, userId, userRole, groupIdx, lastLogin, userStatus, groupCode, groupName }]' },
    },

    'PATCH /admin/user/signOut': {
        summary: '로그아웃',
        description: '저장된 토큰을 비우고 accessToken 쿠키를 지웁니다. 인증 가드는 저장된 토큰과 대조하지 않아서, 이미 받은 JWT를 헤더로 보내면 만료 전까지는 계속 통과합니다.',
        auth: 'login',
        responses: { 200: '{ success: true, message }' },
    },

    // --- 권한 (/admin/permission) ------------------------------

    'GET /admin/permission/menus/me': {
        summary: '내 사이드바 메뉴',
        description:
            '로그인한 계정의 권한 그룹에 켜진 메뉴만 트리로 돌려줍니다. master는 그룹과 상관없이 전체 메뉴를 받습니다. ' +
            'master 전용 화면 메뉴는 다른 그룹에서 빠지고, 보일 하위가 없는 묶음 메뉴도 걸러집니다. ' +
            'totalMenus가 0이면 메뉴 데이터가 아직 없다는 뜻이고, hasGroup이 false면 그룹이 없는 계정입니다.',
        auth: 'admin',
        responses: {
            200: '{ success: true, menus: [{ menuIdx, menuName, menuPath, menuIcon, sortOrder, children }], totalMenus, hasGroup }',
            500: "{ success: false, message: '메뉴 조회 실패' }",
        },
    },

    'GET /admin/permission/menus': {
        summary: '권한 편집 화면 데이터',
        description:
            '그룹 목록과 전체 메뉴 트리를 한 번에 내려줍니다. 각 메뉴의 rolePermissions는 현재 있는 그룹 기준(master 제외)으로 true/false가 채워지고, ' +
            'masterOnly가 true인 메뉴는 다른 그룹에 켜도 사이드바에 나오지 않습니다.',
        auth: 'master',
        responses: {
            200: '{ success: true, groups, menus: [{ ..., rolePermissions: { 그룹코드: boolean }, masterOnly, children }] }',
            500: "{ success: false, message: '권한 정보 조회 실패' }",
        },
    },

    'POST /admin/permission/menus': {
        summary: '메뉴 추가',
        description: '같은 상위 메뉴 안에서 맨 뒤에 붙고, 처음에는 기본 관리자(admin) 그룹에만 보이게 켜집니다. 메뉴는 3단까지 만들 수 있습니다.',
        auth: 'master',
        body: [
            { name: 'menuName', required: true, description: '메뉴 이름 (100자 이하)' },
            { name: 'menuPath', description: "화면 경로, '/'로 시작 (200자 이하). 비우면 묶음 메뉴", example: '/myoriadmin/restaurant' },
            { name: 'menuIcon', description: '아이콘 (20자 이하)' },
            { name: 'parentIdx', type: 'integer', description: '상위 메뉴 번호. 없으면 최상위' },
        ],
        responses: {
            201: '{ success: true, message, menuIdx }',
            400: '이름 누락, 경로·길이 오류, 상위 메뉴 없음, 3단 초과',
            500: "{ success: false, message: '메뉴 추가 실패' }",
        },
    },

    'PATCH /admin/permission/menus/:menuIdx': {
        summary: '메뉴 수정',
        description: '이름, 경로, 아이콘 중 보낸 것만 바꿉니다. 위치나 그룹별 노출은 트리 저장(PUT /admin/permission/menus)에서 다룹니다.',
        auth: 'master',
        params: [{ name: 'menuIdx', type: 'integer', required: true, description: '메뉴 번호' }],
        body: [
            { name: 'menuName', description: '메뉴 이름 (100자 이하)' },
            { name: 'menuPath', description: "화면 경로, '/'로 시작. 빈 문자열이면 경로 제거" },
            { name: 'menuIcon', description: '아이콘 (20자 이하)' },
        ],
        responses: {
            200: '{ success: true, message }',
            400: '메뉴 없음, 값 오류, 바꿀 내용 없음',
            500: "{ success: false, message: '메뉴 수정 실패' }",
        },
    },

    'DELETE /admin/permission/menus/:menuIdx': {
        summary: '메뉴 삭제',
        description: '하위 메뉴까지 함께 지워지고, 지운 개수를 돌려줍니다.',
        auth: 'master',
        params: [{ name: 'menuIdx', type: 'integer', required: true, description: '메뉴 번호' }],
        responses: {
            200: '{ success: true, message, deletedCount }',
            400: '메뉴 없음',
            500: "{ success: false, message: '메뉴 삭제 실패' }",
        },
    },

    'PUT /admin/permission/menus': {
        summary: '메뉴 트리 저장',
        description:
            '순서, 상위 메뉴, 그룹별 노출을 한 트랜잭션으로 저장합니다. 보낸 메뉴만 갱신하고 빠진 메뉴는 그대로 둡니다(삭제는 DELETE 전용). ' +
            '보낸 메뉴의 rolePermissions는 통째로 바뀌므로 켜 둘 그룹을 모두 담아야 합니다. 없는 그룹 코드와 master 키는 무시됩니다.',
        auth: 'master',
        body: [
            {
                name: 'items',
                type: 'array',
                items: 'object',
                required: true,
                description: '[{ menuIdx, parentIdx, sortOrder, rolePermissions: { 그룹코드: boolean } }]',
                example: [{ menuIdx: 3, parentIdx: null, sortOrder: 0, rolePermissions: { admin: true } }],
            },
        ],
        responses: {
            200: '{ success: true, message, updated }',
            400: '빈 목록, 없는 메뉴·상위 메뉴, 중복 전송, 순환 관계, 3단 초과',
            500: "{ success: false, message: '메뉴 저장 실패' }",
        },
    },

    'GET /admin/permission/groups': {
        summary: '권한 그룹 목록',
        description: '정렬 순서대로 그룹과 소속 계정 수를 반환합니다.',
        auth: 'master',
        responses: {
            200: '{ success: true, data: [{ groupIdx, groupCode, groupName, isBuiltIn, userCount }] }',
            500: "{ success: false, message: '권한 그룹 조회 실패' }",
        },
    },

    'POST /admin/permission/groups': {
        summary: '권한 그룹 추가',
        description:
            'groupCode를 안 주면 이름에서 만듭니다(소문자로 바꾸고 영문·숫자·한글 외 문자는 _로). ' +
            'master, admin은 기본 그룹 코드라 쓸 수 없습니다. 새 그룹은 메뉴가 하나도 켜지지 않은 상태로 시작합니다.',
        auth: 'master',
        body: [
            { name: 'groupName', required: true, description: '그룹 이름 (100자 이하)' },
            { name: 'groupCode', description: '그룹 코드 (50자 이하, 권한 JSON의 키로 쓰임)' },
        ],
        responses: {
            201: '{ success: true, message, data: { groupIdx, groupCode, groupName } }',
            400: '이름 누락, 코드 생성 불가, 예약 코드, 중복 코드',
            500: "{ success: false, message: '권한 그룹 추가 실패' }",
        },
    },

    'PATCH /admin/permission/groups/:groupIdx': {
        summary: '권한 그룹 이름 변경',
        description: '이름만 바뀌고 groupCode는 그대로입니다. master 그룹은 바꿀 수 없습니다.',
        auth: 'master',
        params: [{ name: 'groupIdx', type: 'integer', required: true, description: '그룹 번호' }],
        body: [{ name: 'groupName', required: true, description: '새 그룹 이름 (100자 이하)' }],
        responses: {
            200: '{ success: true, message }',
            400: '그룹 없음, master 그룹, 이름 누락·길이 초과',
            500: "{ success: false, message: '그룹명 변경 실패' }",
        },
    },

    'DELETE /admin/permission/groups/:groupIdx': {
        summary: '권한 그룹 삭제',
        description: '붙박이 그룹(isBuiltIn, 기본으로 master·admin)은 지울 수 없습니다. 소속 계정은 그룹 없음 상태가 되어 사이드바가 비고, 메뉴에 남은 이 그룹 권한도 함께 정리됩니다.',
        auth: 'master',
        params: [{ name: 'groupIdx', type: 'integer', required: true, description: '그룹 번호' }],
        responses: {
            200: '{ success: true, message }',
            400: '그룹 없음, 기본 그룹',
            500: "{ success: false, message: '권한 그룹 삭제 실패' }",
        },
    },
};
