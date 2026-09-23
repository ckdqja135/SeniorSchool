// 비밀번호 해시·salt 등 응답과 로그에 절대 남기면 안 되는 키 (게시글/댓글/관리자 계정, 동적 서비스 raw SQL 컬럼 포함)
export const SECRET_KEYS = new Set(['boardPW', 'boardPw', 'writerPw', 'commentPw', 'userPw', 'salt', 'password', 'board_pw', 'writer_pw']);

// 로그용 JSON.stringify: 비밀 키 값은 *** 로 가린다
export function safeJson(value: unknown): string {
    return JSON.stringify(value, (key, v) => (SECRET_KEYS.has(key) ? '***' : v));
}

// 로그용 단일 값 가림: 값이 있으면 ***, 없으면 빈 문자열
export function maskSecret(value: unknown): string {
    return value ? '***' : '';
}
