// Swagger 문서용 API 설명 형식.
// 컨트롤러는 @Req()/@Res() 로 요청을 직접 다뤄 Swagger 가 파라미터를 알 수 없으므로,
// 설명은 src/swagger/docs/*.docs.ts 에 모아 두고 setup-swagger 가 생성된 문서에 입힌다.

export type ApiDocType = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object' | 'file';

export interface ApiDocField {
    name: string;
    type?: ApiDocType;      // 기본 string
    items?: ApiDocType;     // type 이 array 일 때 원소 타입
    required?: boolean;
    description: string;
    example?: unknown;
}

/**
 * 호출 권한
 * - public: 누구나
 * - login: 로그인 토큰 필요 (JwtAuthGuard)
 * - admin: 어드민 계정 (JwtAuthGuard + AdminGuard)
 * - admin-menu: 어드민 계정 + 권한 그룹에 해당 메뉴 (… + MenuAccessGuard)
 * - master: 마스터 계정 (JwtAuthGuard + MasterGuard)
 */
export type ApiAuth = 'public' | 'login' | 'admin' | 'admin-menu' | 'master';

export interface ApiDoc {
    summary: string;                    // 목록에 보이는 한 줄 제목
    description?: string;               // 동작·주의사항 (마크다운 가능)
    auth?: ApiAuth;                     // 기본 public
    params?: ApiDocField[];             // URL 경로 파라미터 (:id 등)
    query?: ApiDocField[];              // 쿼리스트링
    body?: ApiDocField[];               // 요청 본문 필드
    bodyType?: 'json' | 'multipart';    // 기본 json
    responses?: Record<number, string>; // 상태코드 → 설명
}

/** 키: 'GET /restaurant/hotplaces' 처럼 메서드 + 컨트롤러 경로 (경로 파라미터는 :name 표기) */
export type ApiDocMap = Record<string, ApiDoc>;
