// 맛잘알(restaurant) · 통합 검색 · 베스트 후기 · 헬스체크 · 신고 · 신청 현황 API 설명
import { ApiDocMap } from '../api-doc.types';

export const commonDocs: ApiDocMap = {
    // --------- 맛잘알: 식당 ---------
    'GET /restaurant': {
        summary: '식당 목록',
        description: '활성 식당을 이름순(같으면 restaurantIdx 순)으로 반환합니다. limit 을 주지 않으면 전체 목록이 내려가므로 화면에서는 페이지 단위로 호출하는 것이 좋습니다.',
        query: [
            { name: 'name', description: '식당명 부분 일치 검색' },
            { name: 'type', description: '업종 (정확히 일치)', example: '한식' },
            { name: 'location', description: '지역 부분 일치 검색' },
            { name: 'limit', type: 'integer', description: '가져올 개수 (없으면 전체)' },
            { name: 'offset', type: 'integer', description: '건너뛸 개수' },
            { name: 'missing', description: '값이 비어 있는 식당만 추리기. menu | image | url 중 하나 (보강 화면용)' },
        ],
        responses: {
            200: '식당 배열. restaurantMenu(JSON 파싱 결과, 없으면 null), restaurantIdx, restaurantName, restaurantType, restaurantAddr, 좌표(restaurantLatX/Y), restaurantRating("4.0" 형태 문자열), restaurantViewCount 등',
            500: '서버 오류',
        },
    },
    'GET /restaurant/restaurant': {
        summary: '식당 상세 (이름 또는 주소로)',
        description: 'restaurantName 이 있으면 이름 정확히 일치로, 없으면 restaurantAddr 로 활성 식당 하나를 찾습니다. 조회할 때마다 조회수가 1 올라가며, 응답의 restaurantViewCount 는 올리기 전 값입니다.',
        query: [
            { name: 'restaurantName', description: '식당명 (정확히 일치). restaurantAddr 와 둘 중 하나 필수' },
            { name: 'restaurantAddr', description: '도로명 주소 (정확히 일치)' },
        ],
        responses: {
            200: '식당 정보 + averageRating(후기 평균, 없으면 null), ratingCount',
            400: 'restaurantName, restaurantAddr 둘 다 없음',
            500: '서버 오류. 식당을 못 찾은 경우도 404 가 아니라 500 으로 옵니다',
        },
    },
    'GET /restaurant/nearby': {
        summary: '좌표 주변 식당',
        description: '위도·경도 기준 반경 안의 활성 식당을 가까운 순으로 돌려줍니다. 좌표가 비어 있거나 0 인 식당은 빠지고, 거리 계산과 반경 필터는 DB에서 처리합니다.',
        query: [
            { name: 'lat', type: 'number', required: true, description: '위도', example: 37.5665 },
            { name: 'lng', type: 'number', required: true, description: '경도', example: 126.978 },
            { name: 'radius', type: 'number', description: '반경 km (기본 5)' },
            { name: 'limit', type: 'integer', description: '최대 개수 (기본 200)' },
        ],
        responses: {
            200: '식당 배열. 식당 정보에 distance(km), averageRating(없으면 null), ratingCount 가 붙습니다',
            400: 'lat 또는 lng 누락',
            500: '서버 오류',
        },
    },
    'GET /restaurant/hotplaces': {
        summary: '지역별 핫플레이스 목록',
        description: '맛잘알 메인의 핫플·후기 지도용 경량 목록입니다. 전국 조회수 상위, 도시별 평점 상위, 인기 후기 TOP10 의 식당만 추려 이름순으로 보내므로, 프론트에서 기존 필터·정렬을 그대로 적용하면 됩니다.',
        query: [
            { name: 'limit', type: 'integer', description: '규칙별로 남길 상위 개수 (기본 10, 최대 50)' },
        ],
        responses: {
            200: '식당 배열. 각 항목에 restaurantIdx, restaurantName, restaurantType, restaurantAddr, restaurantLatX, restaurantLatY, restaurantViewCount, averageRating(후기 평균, 없으면 null), ratingCount',
            500: '서버 오류',
        },
    },
    'GET /restaurant/top-viewed': {
        summary: '조회수 TOP10 식당',
        description: '활성 식당 중 조회수가 높은 10곳입니다. 조회수가 같으면 restaurantIdx 오름차순.',
        responses: {
            200: '식당 배열 (최대 10개). 식당 정보에 averageRating(없으면 null), ratingCount 포함',
            500: '서버 오류',
        },
    },
    'GET /restaurant/recent': {
        summary: '식당 최근 댓글 5개 (사용 불가)',
        description: '경로에 restaurantIdx 파라미터가 없는데 핸들러는 경로 파라미터에서 이 값을 읽습니다. 그래서 어떻게 호출해도 400 이 나옵니다. 원본 API 동작을 그대로 옮겨 둔 것이므로 호출하지 않아야 합니다.',
        responses: {
            400: '항상 반환 (restaurantIdx is required)',
        },
    },
    'GET /restaurant/board/top-viewed': {
        summary: '조회수 TOP10 식당 후기',
        description: '전체 식당 후기를 조회수 내림차순(같으면 boardIdx 오름차순)으로 10개 가져옵니다.',
        responses: {
            200: '후기 배열. boardIdx, boardTitle, boardContent, boardID, boardRegDate, boardLike, boardHits, restaurantIdx, restaurant({ restaurantName, restaurantAddr }, 식당이 없으면 null)',
            500: '서버 오류',
        },
    },
    'GET /restaurant/board/:boardIdx': {
        summary: '식당 후기 상세 (댓글 포함)',
        description: '후기 본문, 식당 정보, 댓글(작성 시간순)을 함께 반환하고 조회수를 1 올립니다. 평점(boardRating)은 포함되지 않으므로 필요하면 /restaurant/boards/detail/:boardIdx 를 사용해야 합니다.',
        params: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
        ],
        responses: {
            200: 'boardIdx, boardTitle, boardContent, boardID, boardRegDate, boardLike, boardHits, restaurantIdx, restaurant({ restaurantName, restaurantAddr, restaurantLocation }), RestaurantComments(댓글 배열)',
            404: '후기 없음',
            500: '서버 오류',
        },
    },
    'GET /restaurant/like': {
        summary: '식당 후기 좋아요 수',
        query: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
        ],
        responses: {
            200: '{ boardIdx, boardLike }',
            400: 'boardIdx 누락',
            404: '후기 없음',
            500: '서버 오류',
        },
    },
    'POST /restaurant/requests': {
        summary: '식당 추가 요청',
        description: '목록에 없는 식당을 추가해 달라고 요청합니다. 같은 식당명으로 처리 대기(pending) 중인 요청이 있으면 409 를 반환합니다.',
        body: [
            { name: 'restaurantName', required: true, description: '식당명 (앞뒤 공백 제거 후 저장)' },
            { name: 'restaurantOwner', description: '대표자' },
            { name: 'restaurantType', description: '업종' },
            { name: 'restaurantAddr', description: '주소' },
        ],
        responses: {
            201: '{ success: true, message, data(생성된 요청. requestIdx, restaurantName, requestStatus="pending" 등) }',
            409: '{ success: false, message } 같은 식당명의 대기 중 요청이 이미 있음',
            500: '서버 오류. restaurantName 이 비어 있을 때도 400 이 아니라 전역 에러 핸들러의 500({ message }) 으로 옵니다',
        },
    },
    'GET /restaurant/auto': {
        summary: '식당명 자동완성',
        description: '이름에 키워드가 들어간 활성 식당을 이름순으로 최대 10개 돌려줍니다.',
        query: [
            { name: 'keyword', required: true, description: '검색어 (URL 인코딩 가능)' },
        ],
        responses: {
            200: '배열. 각 항목에 restaurantName, restaurantAddr, restaurantOwner, restaurantType',
            400: 'keyword 누락',
            500: '서버 오류',
        },
    },
    'GET /restaurant/random': {
        summary: '랜덤 식당 추천',
        description: '활성 식당 가운데 하나를 무작위로 추천합니다. type 이 없거나 "전체"면 업종 구분 없이 뽑습니다.',
        query: [
            { name: 'type', description: '업종 (부분 일치). "전체"는 필터 없음과 같음' },
        ],
        responses: {
            200: '식당 정보 + averageRating(없으면 null), ratingCount',
            404: '조건에 맞는 식당 없음',
            500: '서버 오류',
        },
    },
    'GET /restaurant/types': {
        summary: '식당 업종 목록',
        description: '활성 식당의 업종별 개수입니다. 많은 순, 같으면 업종명 순으로 정렬됩니다.',
        responses: {
            200: '배열. 각 항목에 restaurantType, count(문자열)',
            500: '서버 오류',
        },
    },
    'GET /restaurant/locations': {
        summary: '식당 지역 목록 (시/도 > 구/군)',
        description: '활성 식당 주소의 앞 두 단어로 시/도와 구/군을 뽑아 집계합니다. "서울특별시", "서울시"는 모두 "서울"로 묶이고, 주소에서 구/군을 못 찾은 식당은 빠집니다.',
        responses: {
            200: '배열. 각 항목에 city, count, districts([{ district, count }]). 시/도와 구/군 모두 식당 수가 많은 순',
            500: '서버 오류',
        },
    },

    // --------- 맛잘알: 후기 게시판 ---------
    'GET /restaurant/boards/recent': {
        summary: '최근 식당 후기 5개',
        description: '활성 식당에 달린 후기를 작성일 최신순으로 5개 가져오고, 각 후기에 식당 정보 전체를 붙여 줍니다.',
        responses: {
            200: '후기 배열. 후기 필드(boardRating 은 "4.5" 형태 문자열) + restaurant(식당 정보)',
            500: '서버 오류',
        },
    },
    'GET /restaurant/boards': {
        summary: '식당별 후기 목록',
        description: '한 식당의 후기를 작성일 최신순으로 반환합니다. 검색 조건을 여러 개 지정하면 모두 만족하는 후기만 남습니다.',
        query: [
            { name: 'restaurantIdx', type: 'integer', required: true, description: '식당 번호' },
            { name: 'id', description: '작성자 아이디 (정확히 일치)' },
            { name: 'title', description: '제목 부분 일치 검색' },
            { name: 'content', description: '내용 부분 일치 검색' },
        ],
        responses: {
            200: '후기 배열. boardIdx, boardTitle, boardContent, boardID, boardRegDate, boardLike, boardHits, boardRating("4.5" 형태, 없으면 null), restaurantIdx 등',
            400: 'restaurantIdx 누락',
            500: '서버 오류',
        },
    },
    'GET /restaurant/boards/detail/:boardIdx': {
        summary: '식당 후기 상세',
        description: '후기 전체 필드에 식당 정보와 댓글(작성 시간순)을 붙여 돌려주고, 조회수를 1 올립니다.',
        params: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
        ],
        responses: {
            200: '후기 필드 + restaurant({ restaurantName, restaurantAddr, restaurantLocation, restaurantType }) + RestaurantComments(댓글 배열)',
            500: '서버 오류. 후기가 없을 때도 500 입니다',
        },
    },
    'POST /restaurant/boards/insert': {
        summary: '식당 후기 작성',
        description: '로그인 없이 아이디·비밀번호를 적어 후기를 남깁니다. 비밀번호는 해시로 저장되고, 이후 수정·삭제 때 같은 비밀번호로 본인을 확인합니다.',
        body: [
            { name: 'restaurantIdx', type: 'integer', required: true, description: '식당 번호' },
            { name: 'boardTitle', required: true, description: '제목' },
            { name: 'boardContent', required: true, description: '내용' },
            { name: 'boardID', required: true, description: '작성자 아이디' },
            { name: 'boardPW', required: true, description: '비밀번호 (boardPw 로 보내도 됨)' },
            { name: 'boardRating', type: 'number', description: '평점 0.5 ~ 5.0. 0.5 단위로 반올림해 저장', example: 4.5 },
            { name: 'boardRegDate', description: '작성일시 (없으면 서버 현재 시각)' },
        ],
        responses: {
            200: '{ success: true, message: "식당 후기가 성공적으로 등록되었습니다." }',
            400: '요청 본문 없음',
            500: '서버 오류. 필수값 누락이나 평점 범위 오류도 500 으로 옵니다',
        },
    },
    'PUT /restaurant/boards/correct': {
        summary: '식당 후기 수정',
        description: '후기 번호와 비밀번호가 맞을 때만 수정됩니다. 보낸 항목(제목·내용·평점)만 바뀌고 나머지는 그대로 유지됩니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'boardPW', required: true, description: '작성 때 비밀번호 (boardPw, writerPw 로 보내도 됨)' },
            { name: 'boardID', description: '작성자 아이디. 보내면 본인 확인에 함께 사용' },
            { name: 'boardTitle', description: '새 제목' },
            { name: 'boardContent', description: '새 내용' },
            { name: 'boardRating', type: 'number', description: '새 평점 0.5 ~ 5.0 (0.5 단위 반올림)' },
        ],
        responses: {
            200: '{ success: true, message: "식당 후기가 성공적으로 수정되었습니다." }',
            400: '요청 본문 없음',
            500: '서버 오류. 필수값 누락, 비밀번호 불일치, 후기 없음, 평점 범위 오류도 모두 500',
        },
    },
    'DELETE /restaurant/boards/delete': {
        summary: '식당 후기 삭제',
        description: '후기 번호와 비밀번호가 맞으면 삭제합니다. 달려 있던 댓글은 함께 삭제되지 않습니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'boardPW', required: true, description: '작성 때 비밀번호 (boardPw, writerPw 로 보내도 됨)' },
            { name: 'boardID', description: '작성자 아이디. 보내면 본인 확인에 함께 사용' },
        ],
        responses: {
            200: '{ success: true, message: "식당 후기가 성공적으로 삭제되었습니다." }',
            400: '요청 본문 없음',
            500: '서버 오류. 필수값 누락, 비밀번호 불일치, 후기 없음도 500',
        },
    },
    'POST /restaurant/boards/like': {
        summary: '식당 후기 좋아요 / 취소',
        description: 'isLiked 가 true 면 좋아요를 1 올리고 false 면 1 내립니다(0 밑으로는 안 내려감). 사용자별 중복 체크는 하지 않으니 토글 상태는 프론트에서 관리해야 합니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'isLiked', type: 'boolean', required: true, description: 'true 좋아요, false 취소' },
        ],
        responses: {
            200: '{ success: true, message, likeCount(반영 후 좋아요 수) }',
            400: 'boardIdx 누락 또는 isLiked 가 boolean 이 아님',
            500: '서버 오류. 후기가 없을 때도 500',
        },
    },
    'GET /restaurant/boards/like/:boardId': {
        summary: '식당 후기 좋아요 수 (경로 파라미터)',
        params: [
            { name: 'boardId', type: 'integer', required: true, description: '후기 번호 (boardIdx)' },
        ],
        responses: {
            200: '{ likeCount } 숫자',
            500: '서버 오류. 후기가 없을 때도 500',
        },
    },

    // --------- 맛잘알: 후기 댓글 ---------
    'GET /restaurant/comment': {
        summary: '식당 후기 댓글 목록',
        description: '정렬 조건 없이 DB 기본 순서로 내려옵니다. 대댓글 배치는 프론트에서 commentParent, commentDepth 를 기준으로 맞춰야 합니다.',
        query: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
        ],
        responses: {
            200: '댓글 배열. commentIdx, boardIdx, commentLike, commentDepth, writerId, commentParent, commentContent, regDate, modDate',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /restaurant/comment/insert': {
        summary: '식당 후기 댓글 작성',
        description: '대댓글이면 commentParent 에 부모 댓글 번호를 넣습니다. 일반 댓글은 비워 두면 서버가 그 후기의 마지막 commentIdx + 1(첫 댓글이면 1)을 commentParent 로 채웁니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'writerId', required: true, description: '작성자 아이디' },
            { name: 'writerPw', required: true, description: '비밀번호 (수정·삭제 때 확인용)' },
            { name: 'commentContent', required: true, description: '댓글 내용' },
            { name: 'commentParent', type: 'integer', description: '부모 댓글 번호 (대댓글일 때). parentIdx 로 보내도 됨' },
            { name: 'commentDepth', type: 'integer', description: '댓글 깊이 (기본 0)' },
        ],
        responses: {
            201: '{ success: true, message: "식당 댓글이 성공적으로 작성되었습니다." }',
            400: 'boardIdx, writerId, writerPw, commentContent 중 누락',
            500: '서버 오류',
        },
    },
    'PUT /restaurant/comment/modify': {
        summary: '식당 후기 댓글 수정',
        description: '댓글 번호, 작성자, 비밀번호가 모두 맞아야 수정됩니다. commentContent 를 비워 보내면 수정일(modDate)만 갱신됩니다.',
        body: [
            { name: 'commentIdx', type: 'integer', required: true, description: '댓글 번호' },
            { name: 'commentWriter', required: true, description: '작성자 아이디' },
            { name: 'commentPw', required: true, description: '작성 때 비밀번호' },
            { name: 'commentContent', description: '새 내용' },
        ],
        responses: {
            200: '{ success: true, message: "식당 댓글이 성공적으로 수정되었습니다." }',
            400: 'commentIdx, commentWriter, commentPw 중 누락',
            500: '서버 오류. 댓글이 없거나 작성자 정보가 틀린 경우도 500',
        },
    },
    'DELETE /restaurant/comment/delete': {
        summary: '식당 후기 댓글 삭제',
        description: '댓글 번호와 비밀번호로 본인 확인 후 삭제합니다. commentWriter 는 선택이고, 보내면 작성자까지 맞아야 지워집니다.',
        body: [
            { name: 'commentIdx', type: 'integer', required: true, description: '댓글 번호' },
            { name: 'commentPw', required: true, description: '작성 때 비밀번호' },
            { name: 'commentWriter', description: '작성자 아이디' },
        ],
        responses: {
            200: '{ success: true, message: "식당 댓글이 성공적으로 삭제되었습니다." }',
            400: 'commentIdx 또는 commentPw 누락',
            500: '서버 오류. 댓글이 없거나 비밀번호가 틀린 경우도 500',
        },
    },

    // --------- 통합 검색 ---------
    'GET /search/auto': {
        summary: '학교명 자동완성',
        description: '이름에 키워드가 들어간 대학교를 모두 반환합니다. 개수 제한, 정렬, 활성 여부 필터는 적용하지 않습니다.',
        query: [
            { name: 'keyword', required: true, description: '검색어 (URL 인코딩 가능)' },
        ],
        responses: {
            200: '배열. 각 항목에 univName, univLocate, univType, univPresident',
            400: 'keyword 누락',
            500: '서버 오류 ({ error })',
        },
    },
    'GET /search/school': {
        summary: '학교 정보',
        description: '학교명이 정확히 일치하는 대학교를 찾고 조회수를 1 올립니다. 응답의 univViewCount 는 올리기 전 값입니다.',
        query: [
            { name: 'univName', required: true, description: '학교명 (정확히 일치)' },
        ],
        responses: {
            200: '학교 정보. univIdx, univName, univLocate, univType, univEstablish, univPresident, univCampos, 좌표, univURL, univAddr, univStatus(1/0), univViewCount, createdAt, updatedAt',
            400: 'univName 누락',
            404: '학교 없음',
            500: '서버 오류 ({ error })',
        },
    },
    'GET /search/top-viewed': {
        summary: '조회수 TOP10 대학교',
        description: '활성 대학교를 조회수 높은 순으로 10개 가져옵니다.',
        responses: {
            200: '{ status: 200, data, totalCount }. data 항목에 univIdx, univName, univLocate, univType, univCampos, univViewCount',
            500: '{ status: 500, error, message }',
        },
    },
    'GET /search/comp': {
        summary: '회사 검색',
        description: '이름에 검색어가 들어간 활성 회사를 compIdx 내림차순으로 첫 20개만 돌려줍니다. 페이지 이동은 지원하지 않으며 항상 1페이지입니다.',
        query: [
            { name: 'compName', required: true, description: '회사명 부분 일치 검색 (URL 인코딩 가능)' },
        ],
        responses: {
            200: '{ status, message, data(회사 배열), totalCount, pagination: { totalCount, totalPages, currentPage: 1, rowsPerPage: 20, hasNextPage, hasPrevPage } }',
            400: 'compName 누락',
            500: '{ error, message }',
        },
    },
    'GET /search/comp/:compIdx': {
        summary: '회사 상세',
        description: '회사 한 곳의 정보를 조회하고 조회수를 1 올립니다. 활성 여부는 확인하지 않습니다.',
        params: [
            { name: 'compIdx', type: 'integer', required: true, description: '회사 번호' },
        ],
        responses: {
            200: '{ status: 200, message, data(회사 정보. 재무·인원 항목과 compAvgTenure("5.2" 형태) 포함) }',
            404: '{ status: 404, message: "회사를 찾을 수 없습니다.", data: null }',
            500: '{ error, message }. compIdx 가 숫자가 아닐 때도 여기로 옵니다',
        },
    },
    'GET /search/church/auto': {
        summary: '교회명 자동완성',
        description: '이름에 키워드가 들어간 활성 교회를 이름순으로 최대 10개 반환합니다.',
        query: [
            { name: 'keyword', required: true, description: '검색어 (URL 인코딩 가능)' },
        ],
        responses: {
            200: '배열. 각 항목에 churchName, churchAddr, churchPastor',
            400: 'keyword 누락',
            500: '서버 오류 ({ error })',
        },
    },
    'GET /search/church/info': {
        summary: '교회 정보',
        description: '교회명이 정확히 일치하는 활성 교회를 찾고 조회수를 1 올립니다.',
        query: [
            { name: 'churchName', required: true, description: '교회명 (정확히 일치)' },
        ],
        responses: {
            200: '교회 정보 (DB 컬럼 그대로. churchIdx, churchName, churchAddr, churchPastor, churchViewCount 등)',
            400: 'churchName 누락',
            404: '교회 없음',
            500: '서버 오류 ({ error })',
        },
    },
    'GET /search/outsource/auto': {
        summary: '외주업체명 자동완성',
        description: '이름에 키워드가 들어간 활성 외주업체를 이름순으로 최대 10개 내려줍니다.',
        query: [
            { name: 'keyword', required: true, description: '검색어 (URL 인코딩 가능)' },
        ],
        responses: {
            200: '배열. 각 항목에 outsourceName, outsourceAddr, outsourceCEO, outsourceType',
            400: 'keyword 누락',
            500: '서버 오류 ({ error })',
        },
    },
    'GET /search/church/top-viewed': {
        summary: '조회수 TOP10 교회',
        description: '활성 교회를 조회수 높은 순으로 10개 가져옵니다.',
        responses: {
            200: '{ status: 200, data, totalCount }. data 항목에 churchIdx, churchName, churchLocation, churchType, churchPastor, churchViewCount',
            500: '{ status: 500, error, message }',
        },
    },

    // --------- 베스트 후기 ---------
    'GET /best-posts': {
        summary: '베스트 후기',
        description: '자유·교회·회사·외주·맛집·대학 게시판 글을 한데 모아 좋아요×2 + 조회수 점수 순(같으면 최신순)으로 정렬합니다. 개수 제한이 없어 전체 글이 내려가며, 자유게시판은 삭제된 글만 제외됩니다.',
        responses: {
            200: '{ status: 200, data }. data 항목에 boardIdx, boardTitle, boardContent, boardRegDate, boardLike, boardHits, boardID, weighted_score, board_type(freeboard | church | company | outsource | restaurant | university)',
            500: '{ status: 500, message }',
        },
    },

    // --------- 헬스체크 ---------
    'GET /health': {
        summary: '서버 상태 확인',
        responses: {
            200: '{ status: "ok", message: "Server is running", timestamp(ISO 문자열) }',
        },
    },

    // --------- 신고 ---------
    'POST /report': {
        summary: '게시글 신고',
        description: '게시판 종류(serviceType)와 글 번호로 신고를 접수합니다. 대상 글이 실제로 있는지는 확인하지 않고, 상태는 pending 으로 저장됩니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '신고할 글 번호' },
            { name: 'serviceType', required: true, description: '게시판 종류. univ | company | church | restaurant | outsource | interview | freeboard' },
            { name: 'reportReason', required: true, description: '신고 사유' },
            { name: 'reporterId', description: '신고자 아이디' },
        ],
        responses: {
            201: '{ success: true, message, data: { reportIdx, boardIdx, serviceType, reportStatus: "pending", reportDate } }',
            400: '{ success: false, message } 필수값 누락 또는 허용되지 않은 serviceType',
            500: '{ success: false, message, error }',
        },
    },

    // --------- 신청 현황 ---------
    'GET /requests/recent': {
        summary: '최근 신청 현황 (전 서비스)',
        description: '교회·맛잘알·외주·회사·학교 오빠의 추가 요청을 합쳐 신청일 최신순으로 보여 줍니다. 서비스마다 최근 20건까지만 모은 뒤 limit 만큼 자릅니다.',
        query: [
            { name: 'limit', type: 'integer', description: '가져올 개수 (기본 20, 1 ~ 50)' },
        ],
        responses: {
            200: '{ status: 200, data, totalCount }. data 항목에 service(church | restaurant | outsource | comp | univ), serviceLabel, requestIdx, name, requestStatus, requestDate, processedDate, adminNote(없으면 null)',
            500: '{ status: 500, message }',
        },
    },
};
