// Swagger 태그: 경로 앞부분(어드민은 두 번째 단계까지)으로 묶고 아래 순서·설명으로 표시한다.
export const API_TAGS: ReadonlyArray<readonly [string, string]> = [
    ['health', '서버 상태 확인'],
    ['search', '통합 검색과 대학·회사·교회 자동완성'],
    ['best-posts', '전체 게시판을 합친 베스트 후기'],
    ['requests', '서비스별 최근 등록 요청'],
    ['report', '게시글 신고'],

    ['univ', '학교 오빠 - 대학 정보, 후기, 댓글'],
    ['board', '학교 오빠 후기 (구 경로)'],
    ['comment', '학교 오빠 댓글 (구 경로)'],
    ['church', '교회 오빠 - 교회 정보, 후기, 댓글, 추가 요청'],
    ['comp', '회사 오빠 - 회사 정보, 후기, 면접·연봉 후기, 댓글'],
    ['outsource', '외주 오빠 - 외주업체 정보, 후기, 댓글'],
    ['restaurant', '맛잘알 오빠 - 식당 정보, 지도, 핫플레이스, 후기, 댓글'],
    ['freeboard', '자유게시판 글, 댓글, 좋아요'],
    ['services', '관리자가 추가한 동적 서비스의 공개 API'],

    ['admin/user', '관리자 계정 로그인과 계정 관리'],
    ['admin/permission', '권한 그룹과 메뉴 관리'],
    ['admin/dashboard', '관리자 대시보드 통계'],
    ['admin/pageview', '방문 기록과 접속 분석'],
    ['admin/report', '신고 처리'],
    ['admin/freeboard', '자유게시판 관리'],
    ['admin/univ', '대학 정보와 등록 요청 관리'],
    ['admin/univboard', '학교 오빠 후기 관리'],
    ['admin/church', '교회 정보와 등록 요청 관리'],
    ['admin/churchboard', '교회 오빠 후기 관리'],
    ['admin/comp', '회사 정보와 등록 요청 관리'],
    ['admin/compboard', '회사 오빠 후기 관리'],
    ['admin/outsource', '외주업체 정보와 등록 요청 관리'],
    ['admin/outsourceboard', '외주 오빠 후기 관리'],
    ['admin/restaurant', '식당 정보와 등록 요청 관리'],
    ['admin/restaurantboard', '맛잘알 오빠 후기 관리'],
    ['admin/services', '동적 서비스 설정과 데이터 관리'],
    ['admin/crawler', '식당 크롤러'],
    ['admin/company-crawler', '회사 크롤러'],
    ['admin/scheduler', '회사 데이터 갱신 스케줄러'],
    ['admin/scheduler-run', '스케줄러 수동 실행과 실행 기록'],
];

/** '/admin/church/list' → 'admin/church', '/restaurant/boards/recent' → 'restaurant' */
export function tagForPath(path: string): string {
    const seg = path.split('/').filter(Boolean);
    return seg[0] === 'admin' && seg[1] ? `admin/${seg[1]}` : seg[0] || 'etc';
}
