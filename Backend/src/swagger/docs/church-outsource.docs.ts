// 교회(church) · 외주업체(outsource) 모듈 API 설명.
// 두 모듈 모두 가드가 없어 전부 public 이다.
import { ApiDocMap } from '../api-doc.types';

export const churchOutsourceDocs: ApiDocMap = {
    // --- 교회 (church.controller.ts) ---
    'GET /church': {
        summary: '교회 목록',
        description: '활성 교회(churchStatus=1)만 교회명 가나다순으로 반환합니다. 검색 조건은 모두 선택 사항이며, 함께 쓰면 AND로 묶입니다.',
        query: [
            { name: 'name', description: '교회명 부분 일치' },
            { name: 'type', description: '교회 유형 (정확히 일치)' },
            { name: 'location', description: '지역 부분 일치' },
        ],
        responses: { 200: '교회 배열', 500: '서버 오류' },
    },
    'GET /church/church': {
        summary: '교회 상세',
        description: '교회명 또는 주소가 정확히 같은 활성 교회 하나를 찾습니다. 둘 다 보내면 교회명이 우선이고, 조회할 때마다 churchViewCount가 1 오릅니다(응답에는 올리기 전 값).',
        query: [
            { name: 'churchName', description: '교회명 (churchAddr 와 둘 중 하나 필수)' },
            { name: 'churchAddr', description: '도로명 주소 (churchName 과 둘 중 하나 필수)' },
        ],
        responses: { 200: '교회 정보 객체', 400: 'churchName, churchAddr 모두 누락', 500: '교회가 없거나 서버 오류' },
    },
    'PUT /church/:churchIdx': {
        summary: '교회 정보 수정',
        description: '보낸 필드만 바꾸고 나머지는 기존 값을 유지합니다. 문자열 필드는 빈 값을 보내도 기존 값이 남으니 비우는 용도로는 쓸 수 없습니다. 인증 없이 호출되는 경로입니다.',
        params: [{ name: 'churchIdx', type: 'integer', required: true, description: '교회 번호' }],
        body: [
            { name: 'churchName', description: '교회명' },
            { name: 'churchLocation', description: '지역' },
            { name: 'churchType', description: '교회 유형' },
            { name: 'churchEstablished', description: '설립일' },
            { name: 'churchPastor', description: '담임 목사' },
            { name: 'churchLatX', type: 'number', description: '좌표 X' },
            { name: 'churchLatY', type: 'number', description: '좌표 Y' },
            { name: 'churchURL', description: '홈페이지 주소' },
            { name: 'churchLotAddr', description: '지번 주소' },
            { name: 'churchAddr', description: '도로명 주소' },
            { name: 'churchMapIMG', description: '지도 이미지 (빈 값으로 덮어쓰기 가능)' },
            { name: 'churchStatus', type: 'integer', description: '상태 (1 활성, 0 비활성)' },
        ],
        responses: { 200: '{ success, message, data: 수정 후 교회 정보 }', 500: '교회가 없거나 서버 오류' },
    },
    'DELETE /church/:churchIdx': {
        summary: '교회 삭제',
        description: '실제로 지우지 않고 churchStatus를 0으로 바꾸는 소프트 삭제이며, 인증 없이 호출되는 경로입니다.',
        params: [{ name: 'churchIdx', type: 'integer', required: true, description: '교회 번호' }],
        responses: { 200: '{ success: true, message }', 500: '교회가 없거나 서버 오류' },
    },
    'POST /church/requests': {
        summary: '교회 등록 요청',
        description: '사용자가 목록에 없는 교회를 추가해 달라고 요청합니다. 같은 이름의 요청이 이미 있으면 처리 상태와 관계없이 409로 거절됩니다. 요청은 pending 상태로 저장됩니다.',
        body: [
            { name: 'churchName', required: true, description: '교회명' },
            { name: 'churchPastor', description: '담임 목사' },
            { name: 'churchType', description: '교회 유형' },
            { name: 'churchAddr', description: '주소' },
        ],
        responses: {
            201: '{ success: true, message, data: 생성된 요청 }',
            409: '같은 이름의 요청이 이미 있음. { success: false, message, existingRequest }',
            500: 'churchName 누락 또는 서버 오류. { message }',
        },
    },
    'GET /church/boards': {
        summary: '교회 후기 목록',
        description: '특정 교회의 후기를 페이지네이션 없이 최신순으로 모두 반환합니다.',
        query: [
            { name: 'churchIdx', type: 'integer', required: true, description: '교회 번호' },
            { name: 'id', description: '작성자 ID (정확히 일치)' },
            { name: 'title', description: '제목 부분 일치' },
            { name: 'content', description: '내용 부분 일치' },
        ],
        responses: { 200: '후기 배열', 400: 'churchIdx 누락', 500: '서버 오류' },
    },
    'GET /church/boards/detail': {
        summary: '교회 후기 상세',
        description: '후기 본문에 교회 정보(church: 이름·지역·유형·담임 목사)를 붙여 돌려주고, 조회수(boardHits)를 1 올립니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' }],
        responses: { 200: '후기 객체 + church', 400: 'boardIdx 누락', 500: '후기가 없거나 서버 오류' },
    },
    'POST /church/boards/insert': {
        summary: '교회 후기 작성',
        description: '비밀번호는 선택입니다. 비워 두면 비밀번호 없는 글로 저장되고, 이후 수정·삭제 때 확인을 거치지 않습니다.',
        body: [
            { name: 'churchIdx', type: 'integer', description: '교회 번호' },
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '내용' },
            { name: 'boardId', description: '작성자 ID' },
            { name: 'writerPw', description: '비밀번호 (boardPw 로 보내도 됨)' },
            { name: 'boardReg', description: '작성일 문자열 (없으면 서버 현재 시각)' },
            { name: 'boardLike', type: 'integer', description: '초기 좋아요 수 (기본 0)' },
            { name: 'boardHits', type: 'integer', description: '초기 조회수 (기본 0)' },
        ],
        responses: { 200: "{ success: true, message: 'Church board inserted successfully' }", 500: '서버 오류' },
    },
    'PUT /church/boards/correct': {
        summary: '교회 후기 수정',
        description: '제목·내용 중 보낸 것만 바꿉니다. 비밀번호를 보냈을 때만 일치 여부를 확인하고, 안 보내면 확인 없이 수정됩니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'boardTitle', description: '새 제목' },
            { name: 'boardContent', description: '새 내용' },
            { name: 'writerPw', description: '비밀번호 (boardPw 로 보내도 됨)' },
        ],
        responses: { 200: "{ success: true, message: 'Church board updated successfully' }", 500: 'boardIdx 누락, 후기 없음, 비밀번호 불일치 또는 서버 오류' },
    },
    'DELETE /church/boards/delete': {
        summary: '교회 후기 삭제',
        description: '후기를 완전히 지웁니다. 비밀번호는 보냈을 때만 확인하며, 달린 댓글은 함께 지우지 않습니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'writerPw', description: '비밀번호 (boardPw 로 보내도 됨)' },
        ],
        responses: { 200: "{ success: true, message: 'Church board deleted successfully' }", 500: 'boardIdx 누락, 후기 없음, 비밀번호 불일치 또는 서버 오류' },
    },
    'POST /church/boards/like': {
        summary: '교회 후기 좋아요',
        description: 'isLiked가 true면 1 올리고 false면 1 내립니다(0 밑으로는 안 내려감). 사용자별 중복 체크는 하지 않습니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'isLiked', type: 'boolean', required: true, description: 'true 좋아요, false 취소' },
        ],
        responses: {
            200: '{ success, boardIdx, isLiked, likeCount(숫자) }',
            400: 'boardIdx 누락 또는 isLiked 가 boolean 이 아님',
            500: '후기가 없거나 서버 오류',
        },
    },
    'GET /church/boards/like/:boardId': {
        summary: '교회 후기 좋아요 수',
        params: [{ name: 'boardId', type: 'integer', required: true, description: '후기 번호 (boardIdx)' }],
        responses: { 200: '{ likeCount }', 500: '후기가 없거나 서버 오류' },
    },
    'GET /church/boards/recent': {
        summary: '최근 교회 후기',
        description: '전체 교회에서 가장 최근 후기 5개를 가져옵니다. 교회 상태는 거르지 않고, 교회 정보는 church 객체로 포함됩니다(없으면 null).',
        responses: { 200: '{ status: 200, data: 후기 배열(+church), totalCount: data 개수 }', 500: '서버 오류' },
    },
    'GET /church/boards/top-viewed': {
        summary: '조회수 상위 교회 후기',
        description: '전체 후기 중 조회수 상위 10개입니다. 교회 상태는 거르지 않으며 교회 정보가 church 객체로 붙습니다.',
        responses: { 200: '{ status: 200, data: 후기 배열(+church), totalCount: data 개수 }', 500: '서버 오류' },
    },

    // --- 교회 게시판 (church-board.controller.ts) ---
    // /church/boards/* 와 비슷하지만 서비스 구현이 달라 비밀번호 처리와 응답 형태가 다르다.
    'GET /church/board': {
        summary: '교회 게시판 목록',
        description: '특정 교회의 게시글을 최신순으로 모두 조회합니다.',
        query: [
            { name: 'churchIdx', type: 'integer', required: true, description: '교회 번호' },
            { name: 'id', description: '작성자 ID (정확히 일치)' },
            { name: 'title', description: '제목 부분 일치' },
            { name: 'content', description: '내용 부분 일치' },
        ],
        responses: { 200: '게시글 배열', 400: 'churchIdx 누락', 500: '서버 오류' },
    },
    'GET /church/board/detail': {
        summary: '교회 게시글 상세',
        description: '게시글에 교회 정보(church: 이름·지역·유형)를 붙여 주고 조회수를 1 올립니다. 없는 글이면 에러 대신 200과 null로 응답합니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: { 200: '게시글 객체 + church, 없으면 null', 400: 'boardIdx 누락', 500: '서버 오류' },
    },
    'POST /church/board/insert': {
        summary: '교회 게시글 작성',
        description: '비밀번호(boardPw)가 없으면 해시 단계에서 실패해 500이 납니다. 작성일(boardReg)은 서버가 채우지 않으니 클라이언트가 보내야 합니다.',
        body: [
            { name: 'churchIdx', type: 'integer', description: '교회 번호' },
            { name: 'boardTitle', description: '제목' },
            { name: 'boardContent', description: '내용' },
            { name: 'boardId', description: '작성자 ID' },
            { name: 'boardPw', required: true, description: '비밀번호' },
            { name: 'boardReg', description: '작성일 문자열 (보낸 값 그대로 저장)' },
            { name: 'boardLike', type: 'integer', description: '초기 좋아요 수 (기본 0)' },
            { name: 'boardHits', type: 'integer', description: '초기 조회수 (기본 0)' },
        ],
        responses: { 200: "{ success: true, message: 'Church board inserted successfully' }", 500: '비밀번호 누락 또는 서버 오류' },
    },
    'PUT /church/board/correct': {
        summary: '교회 게시글 수정',
        description: 'boardIdx와 비밀번호가 모두 맞는 글만 수정됩니다. 여기서는 비밀번호 필드로 writerPw만 받습니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'writerPw', required: true, description: '비밀번호' },
            { name: 'boardTitle', description: '새 제목' },
            { name: 'boardContent', description: '새 내용' },
        ],
        responses: { 200: "{ success: true, message: 'Church board updated successfully' }", 500: '글 없음, 비밀번호 불일치·누락 또는 서버 오류' },
    },
    'DELETE /church/board/delete': {
        summary: '교회 게시글 삭제',
        description: '비밀번호가 맞으면 게시글과 그 글의 댓글을 한 트랜잭션으로 모두 지웁니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'writerPw', required: true, description: '비밀번호' },
        ],
        responses: { 200: "{ success: true, message: 'Church board deleted successfully' }", 500: '글 없음, 비밀번호 불일치·누락 또는 서버 오류' },
    },
    'POST /church/board/like': {
        summary: '교회 게시글 좋아요',
        description: 'isLiked가 true면 1 올리고 false면 1 내립니다. 0 아래로는 내려가지 않습니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'isLiked', type: 'boolean', required: true, description: 'true 좋아요, false 취소' },
        ],
        responses: {
            200: '{ success, boardIdx, isLiked, likeCount }',
            400: 'boardIdx 누락 또는 isLiked 가 boolean 이 아님',
            500: '글이 없거나 서버 오류',
        },
    },
    'GET /church/board/like/:boardId': {
        summary: '교회 게시글 좋아요 수',
        params: [{ name: 'boardId', type: 'integer', required: true, description: '게시글 번호 (boardIdx)' }],
        responses: { 200: '{ likeCount } (숫자)', 500: '글이 없거나 서버 오류' },
    },
    'GET /church/board/recent': {
        summary: '최근 교회 게시글',
        description: '활성 교회에 달린 글만 최신순 5개 가져옵니다. 교회명·지역·유형이 게시글 필드와 같은 레벨에 평평하게 포함됩니다.',
        responses: {
            200: '{ status: 200, data: 게시글 배열(churchName, churchLocation, churchType 포함), totalCount: 활성 교회 글 전체 수, currentCount }',
            500: '서버 오류',
        },
    },
    'GET /church/board/top-viewed': {
        summary: '조회수 상위 교회 게시글',
        description: '활성 교회 글 중 조회수 상위 10개입니다. 교회 정보는 recent 와 마찬가지로 평평한 구조로 붙습니다.',
        responses: {
            200: '{ status: 200, data: 게시글 배열(churchName, churchLocation, churchType 포함) }',
            500: "{ status: 500, error: '서버 오류가 발생했습니다.', message }",
        },
    },

    // --- 교회 댓글 (church-comment.controller.ts) ---
    'GET /church/comment': {
        summary: '교회 게시글 댓글 목록',
        description: '정렬 조건 없이 DB 순서대로 내려갑니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' }],
        responses: {
            200: '댓글 배열. commentIdx, boardIdx, commentLike, commentDepth, writerId, commentParent, commentContent, regDate, modDate',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /church/comment/insert': {
        summary: '교회 게시글 댓글 작성',
        description: '프론트 필드명과 옛 필드명을 둘 다 받습니다. 별도 입력 검증은 없어서 boardIdx나 비밀번호가 빠지면 500 오류가 발생합니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '게시글 번호' },
            { name: 'commentWriter', description: '작성자 ID (commentID 로 보내도 됨)' },
            { name: 'commentPw', required: true, description: '비밀번호' },
            { name: 'commentContent', description: '댓글 내용' },
            { name: 'parentIdx', type: 'integer', description: '부모 댓글 번호 (commentParent 로 보내도 됨, 기본 0)' },
            { name: 'depth', type: 'integer', description: '댓글 깊이 (commentDepth 로 보내도 됨, 기본 0)' },
            { name: 'commentLike', type: 'integer', description: '초기 좋아요 수 (기본 0)' },
        ],
        responses: { 200: "{ success: true, message: 'Comment inserted successfully' }", 500: '필수값 누락 또는 서버 오류' },
    },
    'PUT /church/comment/modify': {
        summary: '교회 게시글 댓글 수정',
        description: '댓글 번호와 비밀번호가 맞으면 내용을 바꾸고 modDate를 갱신합니다.',
        body: [
            { name: 'commentIdx', type: 'integer', required: true, description: '댓글 번호' },
            { name: 'commentPw', required: true, description: '비밀번호' },
            { name: 'commentContent', description: '새 내용' },
        ],
        responses: {
            200: "{ success: true, message: 'Comment updated successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '비밀번호 누락 또는 서버 오류',
        },
    },
    'DELETE /church/comment/delete': {
        summary: '교회 게시글 댓글 삭제',
        description: '비밀번호가 맞으면 댓글을 완전히 지웁니다. 대댓글은 따로 정리하지 않습니다.',
        body: [
            { name: 'commentIdx', type: 'integer', required: true, description: '댓글 번호' },
            { name: 'commentPw', required: true, description: '비밀번호' },
        ],
        responses: {
            200: "{ success: true, message: 'Comment deleted successfully' }",
            404: '댓글이 없거나 비밀번호 불일치',
            500: '비밀번호 누락 또는 서버 오류',
        },
    },

    // --- 외주업체 (outsource.controller.ts) ---
    'GET /outsource': {
        summary: '외주업체 목록',
        description: '활성 업체(outsourceStatus=1)만 업체명순으로 가져옵니다. limit 을 주지 않으면 전부 반환합니다.',
        query: [
            { name: 'name', description: '업체명 부분 일치' },
            { name: 'type', description: '업체 분야 (정확히 일치)' },
            { name: 'location', description: '지역 부분 일치' },
            { name: 'limit', type: 'integer', description: '최대 개수 (숫자가 아니면 무시)' },
        ],
        responses: { 200: '외주업체 배열', 500: '서버 오류' },
    },
    'GET /outsource/outsource': {
        summary: '외주업체 상세',
        description: '업체명 또는 주소가 정확히 같은 활성 업체 하나를 조회합니다. 둘 다 오면 업체명이 우선이고, 조회수(outsourceViewCount)는 1 오르지만 응답에는 올리기 전 값이 담깁니다.',
        query: [
            { name: 'outsourceName', description: '업체명 (outsourceAddr 와 둘 중 하나 필수)' },
            { name: 'outsourceAddr', description: '주소 (outsourceName 과 둘 중 하나 필수)' },
        ],
        responses: { 200: '외주업체 정보 객체', 400: 'outsourceName, outsourceAddr 모두 누락', 500: '업체가 없거나 서버 오류' },
    },
    'GET /outsource/top-viewed': {
        summary: '조회수 상위 외주업체',
        description: '활성 업체 중 조회수 상위 10곳입니다.',
        responses: { 200: '외주업체 배열 (최대 10개)', 500: '서버 오류' },
    },
    'PUT /outsource/:outsourceIdx': {
        summary: '외주업체 정보 수정',
        description: '아래 필드 중 보낸 것만 반영하고 그 밖의 키는 무시합니다. 교회 수정과 달리 빈 문자열도 그대로 저장됩니다. 인증 없이 호출되는 경로입니다.',
        params: [{ name: 'outsourceIdx', type: 'integer', required: true, description: '외주업체 번호' }],
        body: [
            { name: 'outsourceName', description: '업체명' },
            { name: 'outsourceLocation', description: '지역' },
            { name: 'outsourceType', description: '업체 분야' },
            { name: 'outsourceEstablished', description: '설립일' },
            { name: 'outsourceCEO', description: '대표자명' },
            { name: 'outsourceURL', description: '홈페이지 주소' },
            { name: 'outsourceLotAddr', description: '지번 주소' },
            { name: 'outsourceAddr', description: '도로명 주소' },
            { name: 'outsourceMapIMG', description: '지도 이미지' },
            { name: 'outsourceLatX', type: 'number', description: '좌표 X' },
            { name: 'outsourceLatY', type: 'number', description: '좌표 Y' },
            { name: 'outsourceStatus', type: 'integer', description: '상태 (1 활성, 0 비활성)' },
            { name: 'outsourceViewCount', type: 'integer', description: '조회수' },
            { name: 'createdAt', description: '생성일시 (날짜 문자열)' },
            { name: 'updatedAt', description: '수정일시 (날짜 문자열)' },
        ],
        responses: { 200: "{ success: true, message, data: { success: true, message: '외주업체가 수정되었습니다.' } }", 500: '업체가 없거나 서버 오류' },
    },
    'DELETE /outsource/:outsourceIdx': {
        summary: '외주업체 삭제',
        description: 'outsourceStatus를 0으로 바꾸는 소프트 삭제이며, 인증 없이 호출되는 경로입니다.',
        params: [{ name: 'outsourceIdx', type: 'integer', required: true, description: '외주업체 번호' }],
        responses: { 200: '{ success: true, message }', 500: '업체가 없거나 서버 오류' },
    },
    'POST /outsource/requests': {
        summary: '외주업체 등록 요청',
        description: [
            '업체 등록을 요청합니다. 분야(category)에 따라 필수값이 달라집니다.',
            '- DEVELOPMENT: devInfo.techStackSummary(1개 이상) 필수. govSupport.hasGovSupportExperience 가 true 면 govSupport.govSupportPrograms 도 필수',
            '- DESIGN, MARKETING, VIDEO, CONSULTING, OTHER: OTHER 이면 customCategory 필수',
            '',
            '같은 업체명으로 pending 상태인 요청이 있으면 409로 응답합니다. 요청 본문 전체는 requestData 로 함께 저장됩니다.',
        ].join('\n'),
        body: [
            { name: 'name', required: true, description: '업체명' },
            { name: 'tagline', required: true, description: '한 줄 소개' },
            { name: 'category', required: true, description: '분야', example: 'DEVELOPMENT' },
            { name: 'contactEmail', required: true, description: '연락 이메일' },
            { name: 'isPublic', type: 'boolean', required: true, description: '공개 여부' },
            { name: 'outsourceCEO', description: '대표자명' },
            { name: 'region', description: '지역 (outsourceAddr 로 저장)' },
            { name: 'devInfo', type: 'object', description: '개발 분야 정보. techStackSummary(문자열 배열) 포함' },
            { name: 'govSupport', type: 'object', description: '정부지원사업 정보. hasGovSupportExperience, govSupportPrograms' },
            { name: 'customCategory', description: '기타 분야명 (category 가 OTHER 일 때 필수)' },
        ],
        responses: {
            201: '{ success: true, message, data: 생성된 요청 (requestData 는 객체) }',
            409: '같은 업체명의 대기 중 요청이 있음. { success: false, message }',
            500: '필수값 누락·형식 오류 또는 서버 오류. { message } (운영 환경에서는 고정 문구)',
        },
    },

    // --- 외주업체 후기 (outsource-board.controller.ts) ---
    'GET /outsource/boards': {
        summary: '외주업체 후기 목록',
        description: '특정 업체의 후기를 최신순으로 모두 내려줍니다.',
        query: [
            { name: 'outsourceIdx', type: 'integer', required: true, description: '외주업체 번호' },
            { name: 'id', description: '작성자 ID (정확히 일치)' },
            { name: 'title', description: '제목 부분 일치' },
            { name: 'content', description: '내용 부분 일치' },
        ],
        responses: { 200: '후기 배열', 400: 'outsourceIdx 누락', 500: '서버 오류' },
    },
    'GET /outsource/boards/detail': {
        summary: '외주업체 후기 상세',
        description: '후기에 업체 정보(outsource)와 댓글 목록(OutsourceComments, 작성순)을 붙여 줍니다. 조회수는 1 오르지만 응답에는 올리기 전 값이 담깁니다.',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' }],
        responses: {
            200: '후기 객체 + outsource(업체명, 주소, 지역, 분야, 설립일, 대표자, URL) + OutsourceComments(commentIdx, commentContent, writerId, regDate, commentLike)',
            400: 'boardIdx 누락',
            500: '후기가 없거나 서버 오류',
        },
    },
    'POST /outsource/boards/insert': {
        summary: '외주업체 후기 작성',
        description: '작성일은 서버 시각(UTC 기준 문자열)으로 채우고 좋아요·조회수는 0에서 시작합니다.',
        body: [
            { name: 'outsourceIdx', type: 'integer', required: true, description: '외주업체 번호' },
            { name: 'boardTitle', required: true, description: '제목' },
            { name: 'boardContent', required: true, description: '내용' },
            { name: 'boardID', required: true, description: '작성자 ID' },
            { name: 'boardPW', required: true, description: '비밀번호 (boardPw 로 보내도 됨)' },
        ],
        responses: { 200: "{ success: true, message: '외주 후기가 성공적으로 등록되었습니다.' }", 500: '필수값 누락 또는 서버 오류' },
    },
    'PUT /outsource/boards/correct': {
        summary: '외주업체 후기 수정',
        description: '후기 번호와 비밀번호가 맞아야 수정됩니다. boardID를 함께 보내면 작성자 ID까지 확인합니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'boardPW', required: true, description: '비밀번호 (boardPw, writerPw 로 보내도 됨)' },
            { name: 'boardID', description: '작성자 ID (보내면 일치 여부 확인)' },
            { name: 'boardTitle', description: '새 제목' },
            { name: 'boardContent', description: '새 내용' },
        ],
        responses: { 200: "{ success: true, message: '외주 후기가 성공적으로 수정되었습니다.' }", 500: '필수값 누락, 글 없음, 작성자 정보 불일치 또는 서버 오류' },
    },
    'DELETE /outsource/boards/delete': {
        summary: '외주업체 후기 삭제',
        description: '비밀번호(와 보냈다면 boardID)가 맞는 후기를 지웁니다. 달린 댓글은 그대로 남습니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'boardPW', required: true, description: '비밀번호 (boardPw, writerPw 로 보내도 됨)' },
            { name: 'boardID', description: '작성자 ID (보내면 일치 여부 확인)' },
        ],
        responses: { 200: "{ success: true, message: '외주 후기가 성공적으로 삭제되었습니다.' }", 500: '필수값 누락, 글 없음, 작성자 정보 불일치 또는 서버 오류' },
    },
    'POST /outsource/boards/like': {
        summary: '외주업체 후기 좋아요',
        description: 'isLiked가 true면 1 올리고 false면 1 내립니다(최소 0).',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'isLiked', type: 'boolean', required: true, description: 'true 좋아요, false 취소' },
        ],
        responses: {
            200: '{ success, message, likeCount(숫자) }',
            400: 'boardIdx 누락 또는 isLiked 가 boolean 이 아님',
            500: '후기가 없거나 서버 오류',
        },
    },
    'GET /outsource/boards/like/:boardId': {
        summary: '외주업체 후기 좋아요 수',
        params: [{ name: 'boardId', type: 'integer', required: true, description: '후기 번호 (boardIdx)' }],
        responses: { 200: '{ likeCount } (숫자)', 500: '후기가 없거나 서버 오류' },
    },
    'GET /outsource/boards/recent': {
        summary: '최근 외주업체 후기',
        description: '활성 업체의 후기만 최신순 20개 가져옵니다. 각 후기에는 업체 정보 전체가 outsource 로 포함됩니다.',
        responses: { 200: '후기 배열 (+outsource)', 500: '서버 오류' },
    },
    'GET /outsource/boards/top-viewed': {
        summary: '조회수 상위 외주업체 후기',
        description: '활성 업체의 후기 중 조회수 상위 10개입니다. 업체 정보가 outsource 로 붙습니다.',
        responses: { 200: '후기 배열 (+outsource)', 500: '서버 오류' },
    },

    // --- 외주업체 댓글 (outsource-comment.controller.ts) ---
    'GET /outsource/comment': {
        summary: '외주업체 후기 댓글 목록',
        query: [{ name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' }],
        responses: {
            200: '댓글 배열. commentIdx, boardIdx, commentLike, commentDepth, writerId, commentParent, commentContent, regDate, modDate',
            400: 'boardIdx 누락',
            500: '서버 오류',
        },
    },
    'POST /outsource/comment/insert': {
        summary: '외주업체 후기 댓글 작성',
        description: '부모 댓글 번호는 오타가 난 옛 필드명 commentPerent 로 받습니다. commentParent 로 보내면 무시되고 0으로 저장됩니다.',
        body: [
            { name: 'boardIdx', type: 'integer', required: true, description: '후기 번호' },
            { name: 'writerId', required: true, description: '작성자 ID' },
            { name: 'writerPw', required: true, description: '비밀번호' },
            { name: 'commentContent', required: true, description: '댓글 내용' },
            { name: 'commentDepth', type: 'integer', description: '댓글 깊이 (기본 0)' },
            { name: 'commentPerent', type: 'integer', description: '부모 댓글 번호 (기본 0)' },
        ],
        responses: {
            201: "{ success: true, message: '외주 댓글이 성공적으로 작성되었습니다.' }",
            400: 'boardIdx, writerId, writerPw, commentContent 중 누락',
            500: '서버 오류',
        },
    },
    'PUT /outsource/comment/modify': {
        summary: '외주업체 후기 댓글 수정',
        description: '댓글 번호, 작성자 ID, 비밀번호가 모두 맞아야 합니다. 내용을 비워 보내면 modDate만 갱신됩니다.',
        body: [
            { name: 'commentIdx', type: 'integer', required: true, description: '댓글 번호' },
            { name: 'commentWriter', required: true, description: '작성자 ID' },
            { name: 'commentPw', required: true, description: '비밀번호' },
            { name: 'commentContent', description: '새 내용' },
        ],
        responses: {
            200: "{ success: true, message: '외주 댓글이 성공적으로 수정되었습니다.' }",
            400: 'commentIdx, commentWriter, commentPw 중 누락',
            500: '댓글 없음, 작성자 정보 불일치 또는 서버 오류',
        },
    },
    'DELETE /outsource/comment/delete': {
        summary: '외주업체 후기 댓글 삭제',
        description: '댓글 번호와 비밀번호로 지웁니다. commentWriter를 함께 보내면 작성자 ID도 확인합니다.',
        body: [
            { name: 'commentIdx', type: 'integer', required: true, description: '댓글 번호' },
            { name: 'commentPw', required: true, description: '비밀번호' },
            { name: 'commentWriter', description: '작성자 ID (보내면 일치 여부 확인)' },
        ],
        responses: {
            200: "{ success: true, message: '외주 댓글이 성공적으로 삭제되었습니다.' }",
            400: 'commentIdx, commentPw 중 누락',
            500: '댓글 없음, 작성자 정보 불일치 또는 서버 오류',
        },
    },
};
