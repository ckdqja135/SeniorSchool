/**
 * 동적 서비스 slug 검증 및 안전한 테이블명 생성 유틸리티
 */

const SLUG_REGEX = /^[a-z][a-z0-9_]{1,29}$/;

// 기존 라우트 경로와 충돌하는 예약어
const RESERVED_SLUGS = [
    'admin', 'univ', 'comp', 'church', 'outsource', 'restaurant',
    'board', 'comment', 'search', 'report', 'freeboard', 'health',
    'user', 'best_posts', 'services', 'dynamic', 'api', 'static',
    'public', 'uploads', 'scheduler', 'dashboard'
];

/**
 * slug 형식 검증
 * @param {string} slug
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSlug(slug) {
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

/**
 * slug로부터 안전한 동적 테이블명 생성
 * @param {string} slug - 검증 완료된 slug
 * @param {string} suffix - 테이블 접미사 (entities, boards, comments, requests)
 * @returns {string} 백틱으로 감싼 테이블명
 */
function buildTableName(slug, suffix) {
    return `\`dynamic_${slug}_${suffix}\``;
}

/**
 * 동적 서비스에서 사용하는 4개 테이블명 반환
 * @param {string} slug
 * @returns {{ entities: string, boards: string, comments: string, requests: string }}
 */
function getDynamicTableNames(slug) {
    return {
        entities: buildTableName(slug, 'entities'),
        boards: buildTableName(slug, 'boards'),
        comments: buildTableName(slug, 'comments'),
        requests: buildTableName(slug, 'requests')
    };
}

module.exports = { validateSlug, buildTableName, getDynamicTableNames, RESERVED_SLUGS };
