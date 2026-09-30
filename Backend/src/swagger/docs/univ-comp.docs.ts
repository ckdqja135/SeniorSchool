// 학교(univ) / 회사(comp) 게시판·댓글·면접·연봉 후기 API 설명.
// /board, /comment 는 /univ/board, /univ/comment 와 같은 테이블을 쓰는 레거시 호환 경로지만
// 서비스 코드가 달라 필드명·응답 형태가 조금씩 다르다.
import { ApiDocMap } from '../api-doc.types';

// ---------- 공통 조각 ----------

const boardSearchQuery = [
    { name: 'id', type: 'string' as const, description: '작성자 ID 검색 (정확히 일치)' },
    { name: 'title', type: 'string' as const, description: '제목 검색 (부분 일치)' },
    { name: 'content', type: 'string' as const, description: '내용 검색 (부분 일치)' },
];

const boardIdParam = [{ name: 'boardId', type: 'integer' as const, required: true, description: '게시글 번호' }];

const commentModifyBody = [
    { name: 'commentIdx', type: 'integer' as const, required: true, description: '댓글 번호' },
    { name: 'commentPw', type: 'string' as const, required: true, description: '댓글 작성 시 입력한 비밀번호' },
    { name: 'commentContent', type: 'string' as const, required: true, description: '바꿀 댓글 내용 (최대 200자)' },
];

const commentDeleteBody = [
    { name: 'commentIdx', type: 'integer' as const, required: true, description: '댓글 번호' },
    { name: 'commentPw', type: 'string' as const, required: true, description: '댓글 작성 시 입력한 비밀번호' },
];

const likeToggleBody = [
    { name: 'boardIdx', type: 'integer' as const, required: true, description: '게시글 번호' },
    { name: 'isLiked', type: 'boolean' as const, required: true, description: 'true면 +1, false면 -1 (0 미만으로는 내려가지 않음)' },
];

const compPagingQuery = [
    { name: 'compIdx', type: 'integer' as const, description: '회사 번호. 없으면 전체 회사 대상' },
    { name: 'page', type: 'integer' as const, description: '페이지 번호 (기본 1)' },
    { name: 'rowsPerPage', type: 'integer' as const, description: '페이지당 개수 (기본 20)' },
];

const compRatingRule = '0.5~5.0 사이 0.5 단위';

export const univCompDocs: ApiDocMap = {
    // ===================== /univ/board =====================
    'GET /univ/board': {
        summary: '학교 게시글 목록',
        description: '페이지 나눔 없이 해당 학교의 게시글을 작성일 최신순으로 전부 반환합니다.',
        query: [
            { name: 'univIdx', type: 'integer', required: true, description: '학교 번호', example: 1 },
            ...boardSearchQuery,
        ],
        responses: { 200: '게시글 배열', 400: 'univIdx 누락', 500: '서버 오류' },
    },
    'GET /univ/board/detail': {
        summary: '학교 게시글 상세',
        description: '조회수는 올리지 않습니다. 게시글이 없으면 200과 함께 null을 응답합니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: { 200: '게시글 객체 또는 null', 400: 'boardIdx 누락', 500: '서버 오류' },
    },
    'POST /univ/board/insert': {
        summary: '학교 게시글 작성',
        description: '좋아요·조회수는 0으로 시작하고 작성일은 서버 시각(ISO 문자열)으로 저장됩니다.',
        body: [
            { name: 'univIdx', type: 'integer', description: '학교 번호' },
            { name: 'boardTitle', type: 'string', required: true, description: '제목 (최대 45자)' },
            { name: 'boardContent', type: 'string', description: '내용' },
            { name: 'boardID', type: 'string', required: true, description: '작성자 ID (최대 45자)' },
            { name: 'boardPw', type: 'string', required: true, description: '수정·삭제용 비밀번호' },
        ],
        responses: {
            200: "{ success: true, message: 'Board inserted successfully' }",
            500: '필수값 누락 등 저장 실패 포함 서버 오류',
        },
    },
    'PUT /univ/board/correct': {
        summary: '학교 게시글 수정',
        description: '비밀번호가 맞을 때만 제목과 내용을 바꿉니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'boardPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' },
            { name: 'boardTitle', type: 'string', description: '새 제목' },
            { name: 'boardContent', type: 'string', description: '새 내용' },
        ],
        responses: {
            200: "{ success: true, message: 'Board updated successfully' }",
            500: '게시글 없음, 비밀번호 불일치도 500으로 응답',
        },
    },
    'DELETE /univ/board/delete': {
        summary: '학교 게시글 삭제',
        description: '비밀번호를 확인한 뒤 게시글과 달린 댓글을 함께 지웁니다. 복구할 수 없는 완전 삭제입니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'boardPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' },
        ],
        responses: {
            200: "{ success: true, message: 'Board deleted successfully' }",
            500: '게시글 없음, 비밀번호 불일치도 500으로 응답',
        },
    },
    'POST /univ/board/like': {
        summary: '학교 게시글 좋아요 증감',
        description: '사용자별 좋아요 기록은 남기지 않고 게시글의 좋아요 수만 올리거나 내립니다.',
        body: likeToggleBody,
        responses: {
            200: "{ success, message: 'Board like increased|decreased successfully', currentLikes }",
            400: 'boardIdx 누락 또는 isLiked가 boolean이 아님',
            500: '게시글 없음 포함 서버 오류',
        },
    },
    'GET /univ/board/like/:boardId': {
        summary: '학교 게시글 좋아요 수',
        params: boardIdParam,
        responses: { 200: '{ likeCount }. 게시글이 없으면 0', 500: '서버 오류' },
    },
    'GET /univ/board/recent': {
        summary: '최근 학교 게시글',
        description: '전체 학교를 통틀어 최신 게시글 20개를 학교 이름·지역과 함께 보여줍니다.',
        responses: {
            200: '{ status: 200, data, totalCount }. data 각 항목에 University { univName, univLocate }',
            500: '서버 오류',
        },
    },
    'GET /univ/board/top-viewed': {
        summary: '조회수 TOP10 학교 게시글',
        description: '조회수 내림차순, 같으면 최신순으로 10개를 뽑습니다.',
        responses: {
            200: '{ status: 200, data, totalCount, message }. data 각 항목에 University { univName, univLocate }',
            500: '{ status: 500, error, message }',
        },
    },

    // ===================== /univ/comment =====================
    'GET /univ/comment': {
        summary: '학교 게시글 댓글 목록',
        description: '정렬 조건 없이 해당 게시글의 댓글을 모두 돌려줍니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: {
            200: '댓글 배열 (commentIdx, boardIdx, commentLike, commentDepth, writerId, commentPerent, commentContent, regDate, modDate)',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /univ/comment/insert': {
        summary: '학교 게시글 댓글 작성',
        description: '숫자 필드는 parseInt로 변환해 저장합니다. 부모 댓글 번호 컬럼 이름은 commentPerent(오타 그대로)입니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'commentWriter', type: 'string', required: true, description: '작성자 ID (최대 45자)' },
            { name: 'commentPw', type: 'string', required: true, description: '수정·삭제용 비밀번호' },
            { name: 'commentContent', type: 'string', required: true, description: '댓글 내용 (최대 200자)' },
            { name: 'parentIdx', type: 'integer', description: '부모 댓글 번호. 대댓글이 아니면 0 (누락 시 동작 확인 필요)' },
            { name: 'depth', type: 'integer', description: '댓글 깊이. 일반 댓글 0 (누락 시 동작 확인 필요)' },
            { name: 'commentLike', type: 'integer', description: '좋아요 초기값. 보통 0 (누락 시 저장 실패 가능, 확인 필요)' },
        ],
        responses: {
            200: "{ success: true, message: 'Comment inserted successfully' }",
            500: '필수값 누락 등 저장 실패 포함 서버 오류',
        },
    },
    'PUT /univ/comment/modify': {
        summary: '학교 게시글 댓글 수정',
        description: '비밀번호가 맞으면 내용을 바꾸고 modDate를 갱신합니다.',
        body: commentModifyBody,
        responses: {
            200: "{ success: true, message: 'Comment updated successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '서버 오류',
        },
    },
    'PUT /univ/comment/delete': {
        summary: '학교 게시글 댓글 삭제',
        description: '메서드는 DELETE가 아니라 PUT입니다. 비밀번호를 확인한 뒤 행을 완전히 삭제합니다.',
        body: commentDeleteBody,
        responses: {
            200: "{ success: true, message: 'Comment deleted successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '서버 오류',
        },
    },

    // ===================== /board (레거시) =====================
    'GET /board': {
        summary: '학교 게시글 목록 (레거시)',
        description: '/univ/board와 동작이 같으며, 해당 학교 게시글을 최신순으로 전부 돌려줍니다.',
        query: [
            { name: 'univIdx', type: 'integer', required: true, description: '학교 번호', example: 1 },
            ...boardSearchQuery,
        ],
        responses: { 200: '게시글 배열', 400: 'univIdx 누락', 500: '서버 오류' },
    },
    'GET /board/detail': {
        summary: '학교 게시글 상세 (레거시)',
        description: '조회수를 1 올리지만 응답에는 올리기 전 값이 담깁니다. 학교 정보(university)가 함께 붙으며, 게시글이 없으면 200 상태로 null을 내려줍니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: {
            200: '게시글 객체 + university { univName, univLocate, univType, univCampos }, 또는 null',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /board/insert': {
        summary: '학교 게시글 작성 (레거시)',
        description: '/univ/board/insert와 달리 작성일·좋아요·조회수를 요청 값 그대로 저장합니다. 작성자 필드명도 boardId(소문자 d)입니다.',
        body: [
            { name: 'univIdx', type: 'integer', description: '학교 번호' },
            { name: 'boardTitle', type: 'string', required: true, description: '제목 (최대 45자)' },
            { name: 'boardContent', type: 'string', description: '내용' },
            { name: 'boardId', type: 'string', required: true, description: '작성자 ID (최대 45자)' },
            { name: 'boardPw', type: 'string', required: true, description: '수정·삭제용 비밀번호' },
            { name: 'boardReg', type: 'string', description: '작성일 문자열. 그대로 boardRegDate에 저장' },
            { name: 'boardLike', type: 'integer', description: '좋아요 초기값 (기본 0)' },
            { name: 'boardHits', type: 'integer', description: '조회수 초기값 (기본 0)' },
        ],
        responses: {
            200: "{ success: true, message: 'Board inserted successfully' }",
            500: '필수값 누락 등 저장 실패 포함 서버 오류',
        },
    },
    'PUT /board/correct': {
        summary: '학교 게시글 수정 (레거시)',
        description: '비밀번호 필드 이름은 writerPw이며, 비밀번호가 일치할 때만 제목과 내용을 바꿉니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'writerPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' },
            { name: 'boardTitle', type: 'string', description: '새 제목' },
            { name: 'boardContent', type: 'string', description: '새 내용' },
        ],
        responses: {
            200: "{ success: true, message: 'Board updated successfully' }",
            500: '게시글 없음, 비밀번호 불일치도 500으로 응답',
        },
    },
    'DELETE /board/delete': {
        summary: '학교 게시글 삭제 (레거시)',
        description: 'writerPw로 확인한 뒤 게시글과 댓글을 함께 완전히 삭제합니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'writerPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' },
        ],
        responses: {
            200: "{ success: true, message: 'Board deleted successfully' }",
            500: '게시글 없음, 비밀번호 불일치도 500으로 응답',
        },
    },
    'POST /board/like': {
        summary: '학교 게시글 좋아요 증감 (레거시)',
        description: '게시글 좋아요 수만 1씩 올리거나 내립니다. 응답 메시지는 한국어이고 action 필드가 추가로 붙습니다.',
        body: likeToggleBody,
        responses: {
            200: "{ success, message: '좋아요가 추가되었습니다.' 등, currentLikes, action: 'increased'|'decreased' }",
            400: 'boardIdx 누락 또는 isLiked가 boolean이 아님',
            500: '게시글 없음 포함 서버 오류',
        },
    },
    'GET /board/like/:boardId': {
        summary: '학교 게시글 좋아요 수 (레거시)',
        description: '/univ/board 쪽과 달리 게시글이 없으면 0이 아니라 500을 냅니다.',
        params: boardIdParam,
        responses: { 200: '{ likeCount }', 500: '게시글 없음 포함 서버 오류' },
    },
    'GET /board/recent': {
        summary: '최근 학교 게시글 (레거시)',
        description: '운영 중인 학교(univStatus=1)의 최신 게시글 5개를 학교 정보와 함께 평면 필드로 돌려줍니다.',
        responses: {
            200: '{ status: 200, data, totalCount, currentCount }. data 항목에 univName, univLocate, univType, univCampos 포함. totalCount는 조건에 맞는 전체 게시글 수',
            500: '서버 오류',
        },
    },
    'GET /board/top-viewed': {
        summary: '조회수 TOP10 학교 게시글 (레거시)',
        description: '운영 중인 학교(univStatus=1) 게시글만 대상으로 조회수 순 10개를 뽑습니다.',
        responses: {
            200: '{ status: 200, data }. data 항목에 univName, univLocate, univType, univCampos 포함',
            500: '{ status: 500, error, message }',
        },
    },

    // ===================== /comment (레거시) =====================
    'GET /comment': {
        summary: '학교 게시글 댓글 목록 (레거시)',
        description: '/univ/comment와 결과가 같습니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: {
            200: '댓글 배열 (commentIdx, boardIdx, commentLike, commentDepth, writerId, commentPerent, commentContent, regDate, modDate)',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /comment/insert': {
        summary: '학교 게시글 댓글 작성 (레거시)',
        description: '요청·저장 방식은 /univ/comment/insert와 같습니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'commentWriter', type: 'string', required: true, description: '작성자 ID (최대 45자)' },
            { name: 'commentPw', type: 'string', required: true, description: '수정·삭제용 비밀번호' },
            { name: 'commentContent', type: 'string', required: true, description: '댓글 내용 (최대 200자)' },
            { name: 'parentIdx', type: 'integer', description: '부모 댓글 번호. 대댓글이 아니면 0 (누락 시 동작 확인 필요)' },
            { name: 'depth', type: 'integer', description: '댓글 깊이. 일반 댓글 0 (누락 시 동작 확인 필요)' },
            { name: 'commentLike', type: 'integer', description: '좋아요 초기값. 보통 0 (누락 시 저장 실패 가능, 확인 필요)' },
        ],
        responses: {
            200: "{ success: true, message: 'Comment inserted successfully' }",
            500: '필수값 누락 등 저장 실패 포함 서버 오류',
        },
    },
    'PUT /comment/modify': {
        summary: '학교 게시글 댓글 수정 (레거시)',
        description: '댓글 번호와 비밀번호가 모두 맞는 행만 수정하고 modDate를 갱신합니다.',
        body: commentModifyBody,
        responses: {
            200: "{ success: true, message: 'Comment updated successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '서버 오류',
        },
    },
    'PUT /comment/delete': {
        summary: '학교 게시글 댓글 삭제 (레거시)',
        description: 'PUT 메서드로 호출합니다. 비밀번호가 맞으면 완전히 삭제됩니다.',
        body: commentDeleteBody,
        responses: {
            200: "{ success: true, message: 'Comment deleted successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '서버 오류',
        },
    },

    // ===================== /comp/board =====================
    'GET /comp/board': {
        summary: '회사 게시글 목록',
        description: '해당 회사 게시글을 isDeleted 값과 관계없이 최신순으로 전부 반환합니다.',
        query: [
            { name: 'compIdx', type: 'integer', required: true, description: '회사 번호', example: 1 },
            ...boardSearchQuery,
        ],
        responses: {
            200: '게시글 배열. boardRating은 "4.5" 같은 문자열(없으면 null), isDeleted는 boolean',
            400: 'compIdx 누락',
            500: '서버 오류',
        },
    },
    'GET /comp/board/detail': {
        summary: '회사 게시글 상세',
        description: '조회수를 1 올린 뒤 반영된 값으로 응답합니다. 게시글이 없으면 200과 함께 null이 내려갑니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: {
            200: '게시글 객체 (boardRating 문자열, isDeleted boolean) 또는 null',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /comp/board/insert': {
        summary: '회사 게시글 작성',
        description: '평점은 선택이며 보낼 경우 0.5 단위만 받습니다. 작성일은 서버 시각(YYYY-MM-DD HH:mm:ss, UTC)으로 저장됩니다.',
        body: [
            { name: 'compIdx', type: 'integer', description: '회사 번호' },
            { name: 'boardTitle', type: 'string', required: true, description: '제목 (최대 45자)' },
            { name: 'boardContent', type: 'string', description: '내용' },
            { name: 'boardID', type: 'string', required: true, description: '작성자 ID (최대 45자)' },
            { name: 'boardPw', type: 'string', required: true, description: '수정·삭제용 비밀번호' },
            { name: 'boardRating', type: 'number', description: `평점 (${compRatingRule})`, example: 4.5 },
        ],
        responses: {
            200: "{ success: true, message: 'Board inserted successfully' }",
            400: '평점 형식 오류',
            500: '필수값 누락 등 저장 실패 포함 서버 오류',
        },
    },
    'PUT /comp/board/correct': {
        summary: '회사 게시글 수정',
        description: '비밀번호 확인 후 제목·내용·평점을 바꿉니다. 작성일이 수정 시각으로 덮어써지고, boardRating을 빼고 보내면 평점이 null로 지워지므로 주의해야 합니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'boardPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' },
            { name: 'boardTitle', type: 'string', description: '새 제목' },
            { name: 'boardContent', type: 'string', description: '새 내용' },
            { name: 'boardRating', type: 'number', description: `평점 (${compRatingRule}). 생략 시 null` },
        ],
        responses: {
            200: "{ success: true, message: 'Board updated successfully' }",
            400: '평점 형식 오류',
            500: '게시글 없음, 비밀번호 불일치도 500으로 응답',
        },
    },
    'DELETE /comp/board/delete': {
        summary: '회사 게시글 삭제',
        description: '비밀번호가 맞으면 게시글과 댓글을 실제로 지웁니다. isDeleted 표시가 아닌 완전 삭제입니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'boardPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' },
        ],
        responses: {
            200: "{ success: true, message: 'Board deleted successfully' }",
            500: '게시글 없음, 비밀번호 불일치도 500으로 응답',
        },
    },
    'POST /comp/board/like': {
        summary: '회사 게시글 좋아요 증감',
        description: '게시글의 좋아요 수를 1 올리거나 내립니다. 누가 눌렀는지는 기록하지 않습니다.',
        body: likeToggleBody,
        responses: {
            200: "{ success, message: 'Board like increased|decreased successfully', currentLikes }",
            400: 'boardIdx 누락 또는 isLiked가 boolean이 아님',
            500: '게시글 없음 포함 서버 오류',
        },
    },
    'GET /comp/board/like/:boardId': {
        summary: '회사 게시글 좋아요 수',
        params: boardIdParam,
        responses: { 200: '{ likeCount }. 게시글이 없으면 0', 500: '서버 오류' },
    },
    'GET /comp/board/recent': {
        summary: '최근 회사 게시글',
        description: '전체 회사 게시글 중 최신 5개를 회사 이름·지역과 함께 돌려줍니다.',
        responses: {
            200: '{ status: 200, data, totalCount }. data 각 항목에 company { compName, compLocate }',
            500: '서버 오류',
        },
    },

    // ===================== /comp/comment =====================
    'GET /comp/comment': {
        summary: '회사 게시글 댓글 목록',
        description: '해당 게시글의 댓글을 정렬 없이 모두 반환합니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: {
            200: '댓글 배열 (commentIdx, boardIdx, commentLike, commentDepth, writerId, commentParent, commentContent, regDate, modDate)',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /comp/comment/insert': {
        summary: '회사 게시글 댓글 작성',
        description: '학교 댓글과 달리 필드 이름을 두 가지로 받습니다. 부모 번호·깊이·좋아요는 비어 있으면 0으로 채웁니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'commentWriter', type: 'string', required: true, description: '작성자 ID (최대 45자). commentID로 보내도 됨' },
            { name: 'commentID', type: 'string', description: 'commentWriter 대체 이름' },
            { name: 'commentPw', type: 'string', required: true, description: '수정·삭제용 비밀번호' },
            { name: 'commentContent', type: 'string', required: true, description: '댓글 내용 (최대 200자)' },
            { name: 'parentIdx', type: 'integer', description: '부모 댓글 번호 (기본 0). commentParent로 보내도 됨' },
            { name: 'commentParent', type: 'integer', description: 'parentIdx 대체 이름' },
            { name: 'depth', type: 'integer', description: '댓글 깊이 (기본 0). commentDepth로 보내도 됨' },
            { name: 'commentDepth', type: 'integer', description: 'depth 대체 이름' },
            { name: 'commentLike', type: 'integer', description: '좋아요 초기값 (기본 0)' },
        ],
        responses: {
            200: "{ success: true, message: 'Comment inserted successfully' }",
            500: '필수값 누락 등 저장 실패 포함 서버 오류',
        },
    },
    'PUT /comp/comment/modify': {
        summary: '회사 게시글 댓글 수정',
        description: '비밀번호가 맞으면 내용을 바꾸고 modDate를 갱신합니다.',
        body: commentModifyBody,
        responses: {
            200: "{ success: true, message: 'Comment updated successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '서버 오류',
        },
    },
    'PUT /comp/comment/delete': {
        summary: '회사 게시글 댓글 삭제',
        description: 'PUT으로 호출하며, 비밀번호 확인 후 행을 실제로 삭제합니다.',
        body: commentDeleteBody,
        responses: {
            200: "{ success: true, message: 'Comment deleted successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '서버 오류',
        },
    },

    // ===================== /comp =====================
    'GET /comp/top-viewed': {
        summary: '조회수 TOP10 회사',
        description: '회사 조회수(compViewCount) 내림차순, 같으면 회사명 오름차순으로 10곳을 뽑습니다.',
        responses: {
            200: '{ status: 200, data, totalCount }. data 항목은 compIdx, compName, compLocate, compType, compIndustry, compCEO, compViewCount',
            500: '{ status: 500, error, message }',
        },
    },
    'POST /comp/requests': {
        summary: '회사 추가 요청',
        description: '목록에 없는 회사를 등록해 달라는 요청을 pending 상태로 남깁니다. 실제 등록은 관리자가 처리합니다.',
        body: [
            { name: 'compName', type: 'string', required: true, description: '회사명 (최대 60자)' },
            { name: 'compCEO', type: 'string', description: '대표자명' },
            { name: 'compType', type: 'string', description: '기업 형태' },
            { name: 'compIndustry', type: 'string', description: '업종' },
            { name: 'compAddr', type: 'string', description: '주소' },
            { name: 'requesterId', type: 'string', description: '요청자 ID' },
        ],
        responses: {
            201: '{ status: 201, data: 생성된 요청, message }',
            500: 'compName 누락도 500으로 응답. { status: 500, error, message }',
        },
    },
    'GET /comp/interviews': {
        summary: '면접 후기 목록',
        description: '삭제되지 않은 후기를 작성일 최신순으로 페이지 단위로 보여줍니다. 각 항목에 회사 이름이 붙습니다.',
        query: compPagingQuery,
        responses: {
            200: '{ status: 200, message, data, pagination { totalCount, totalPages, currentPage, rowsPerPage, hasNextPage, hasPrevPage } }. data 항목에 company { compIdx, compName }',
            500: '{ status: 500, error, message }',
        },
    },
    'GET /comp/interviews/:interviewIdx': {
        summary: '면접 후기 상세',
        params: [{ name: 'interviewIdx', type: 'integer', required: true, description: '면접 후기 번호' }],
        responses: {
            200: '{ status: 200, message, data }. data에 company { compIdx, compName, compLocate, compIndustry }',
            404: '없거나 삭제된 후기',
            500: '{ status: 500, error, message }',
        },
    },
    'POST /comp/interviews': {
        summary: '면접 후기 작성',
        description: 'interviewRating은 형식 검사만 하고 저장하지 않습니다. 필수값이 빠지거나 평점 형식이 틀리면 400이 아니라 500을 반환합니다.',
        body: [
            { name: 'compIdx', type: 'integer', required: true, description: '회사 번호' },
            { name: 'writerId', type: 'string', required: true, description: '작성자 ID (최대 45자)' },
            { name: 'writerPw', type: 'string', required: true, description: '수정·삭제용 비밀번호' },
            { name: 'interviewTitle', type: 'string', required: true, description: '제목 (최대 100자)' },
            { name: 'interviewContent', type: 'string', description: '내용' },
            { name: 'interviewDate', type: 'string', description: '면접일 (날짜 문자열)', example: '2026-09-01' },
            { name: 'interviewResult', type: 'string', description: '면접 결과 (최대 20자)' },
            { name: 'interviewDifficulty', type: 'integer', description: '난이도' },
            { name: 'position', type: 'string', description: '지원 직무 (최대 50자)' },
            { name: 'interviewRating', type: 'number', description: `평점 (${compRatingRule}). 검사만 하고 저장 안 됨` },
        ],
        responses: {
            201: '{ status: 201, message, data: 생성된 후기 }',
            404: '회사 없음',
            500: '필수값 누락, 평점 형식 오류 포함. { status: 500, error, message }',
        },
    },
    'PUT /comp/interviews/:interviewIdx': {
        summary: '면접 후기 수정',
        description: '보낸 필드만 바꾸고 modDate를 갱신합니다. interviewRating은 검사만 하고 저장되지 않습니다.',
        params: [{ name: 'interviewIdx', type: 'integer', required: true, description: '면접 후기 번호' }],
        body: [
            { name: 'writerPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' },
            { name: 'interviewTitle', type: 'string', description: '제목' },
            { name: 'interviewContent', type: 'string', description: '내용' },
            { name: 'interviewDate', type: 'string', description: '면접일. 빈 값이면 null로 지움' },
            { name: 'interviewResult', type: 'string', description: '면접 결과' },
            { name: 'interviewDifficulty', type: 'integer', description: '난이도' },
            { name: 'position', type: 'string', description: '지원 직무' },
            { name: 'interviewRating', type: 'number', description: `평점 (${compRatingRule}). 검사만 하고 저장 안 됨` },
        ],
        responses: {
            200: '{ status: 200, message, data: 수정된 후기 }',
            400: 'writerPw 누락',
            403: '비밀번호 불일치',
            404: '없거나 삭제된 후기',
            500: '평점 형식 오류 포함. { status: 500, error, message }',
        },
    },
    'DELETE /comp/interviews/:interviewIdx': {
        summary: '면접 후기 삭제',
        description: 'isDeleted를 1로 바꾸는 소프트 삭제입니다. 이후 목록·상세에서 제외됩니다.',
        params: [{ name: 'interviewIdx', type: 'integer', required: true, description: '면접 후기 번호' }],
        body: [{ name: 'writerPw', type: 'string', required: true, description: '작성 시 입력한 비밀번호' }],
        responses: {
            200: '{ status: 200, message, data: null }',
            400: 'writerPw 누락',
            403: '비밀번호 불일치',
            404: '없거나 이미 삭제된 후기',
            500: '{ status: 500, error, message }',
        },
    },
    'GET /comp/salaries': {
        summary: '연봉 후기 목록',
        description: '작성일 최신순 페이지 목록입니다. 각 항목에 회사 이름이 함께 포함됩니다.',
        query: compPagingQuery,
        responses: {
            200: '{ status: 200, message, data, pagination { totalCount, totalPages, currentPage, rowsPerPage, hasNextPage, hasPrevPage } }. data 항목에 company { compIdx, compName }',
            500: '{ status: 500, error, message }',
        },
    },
    'POST /comp/salaries': {
        summary: '연봉 후기 작성',
        description: '작성자·비밀번호 없이 익명으로 저장되며 수정·삭제 API는 없습니다. 필수값이 빠지면 500을 응답합니다.',
        body: [
            { name: 'compIdx', type: 'integer', required: true, description: '회사 번호' },
            { name: 'salary', type: 'integer', required: true, description: '연봉 (단위 확인 필요)' },
            { name: 'workYear', type: 'integer', required: true, description: '근속 연수' },
            { name: 'department', type: 'string', required: true, description: '부서 (최대 50자)' },
        ],
        responses: {
            201: '{ status: 201, message, data: 생성된 연봉 후기 }',
            404: '회사 없음',
            500: '필수값 누락 포함. { status: 500, error, message }',
        },
    },
    'GET /comp/companies/:compIdx/rating': {
        summary: '회사 평균 평점',
        description: '회사 게시글(comp/board) 중 평점이 있고 삭제되지 않은 글만 모아 평균을 내고, 소수 첫째 자리로 반올림합니다.',
        params: [{ name: 'compIdx', type: 'integer', required: true, description: '회사 번호', example: 1 }],
        responses: {
            200: '{ status: 200, message, data { compIdx, averageRating, ratingCount } }. 평점이 없으면 averageRating null, ratingCount 0',
            400: 'compIdx가 숫자가 아니거나 0',
            500: '{ status: 500, error, message }',
        },
    },
};
