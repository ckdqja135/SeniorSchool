// Backend/utils/slugValidator.js의 verbatim 포팅.
// 동적 서비스 slug 검증 및 안전한(백틱 이스케이프) 테이블명 생성.
// slug는 정규식+예약어로 검증되므로, 검증 통과한 slug만 테이블명 문자열 보간에 사용한다.

const SLUG_REGEX = /^[a-z][a-z0-9_]{1,29}$/;

// 기존 라우트 경로와 충돌하는 예약어
export const RESERVED_SLUGS = [
    'admin', 'univ', 'comp', 'church', 'outsource', 'restaurant',
    'board', 'comment', 'search', 'report', 'freeboard', 'health',
    'user', 'best_posts', 'services', 'dynamic', 'api', 'static',
    'public', 'uploads', 'scheduler', 'dashboard',
];

export interface SlugValidation {
    valid: boolean;
    error?: string;
}

// slug 형식 검증
export function validateSlug(slug: any): SlugValidation {
    if (!slug || typeof slug !== 'string') {
        return { valid: false, error: 'slug는 필수 문자열입니다.' };
    }

    if (!SLUG_REGEX.test(slug)) {
        return { valid: false, error: 'slug는 소문자 영문으로 시작하고, 소문자/숫자/밑줄만 허용됩니다 (2~30자).' };
    }

    if (RESERVED_SLUGS.includes(slug)) {
        return { valid: false, error: `'${slug}'는 예약어이므로 사용할 수 없습니다.` };
    }

    return { valid: true };
}

// slug로부터 안전한 동적 테이블명 생성 (백틱 포함)
export function buildTableName(slug: string, suffix: string): string {
    return `\`dynamic_${slug}_${suffix}\``;
}

export interface DynamicTableNames {
    entities: string;
    boards: string;
    comments: string;
    requests: string;
}

// 동적 서비스에서 사용하는 4개 테이블명 반환 (백틱 포함)
export function getDynamicTableNames(slug: string): DynamicTableNames {
    return {
        entities: buildTableName(slug, 'entities'),
        boards: buildTableName(slug, 'boards'),
        comments: buildTableName(slug, 'comments'),
        requests: buildTableName(slug, 'requests'),
    };
}
