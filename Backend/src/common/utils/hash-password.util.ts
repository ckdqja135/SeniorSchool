// Backend/utils/hashPassword.js의 verbatim 포팅
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * SHA256 암호화 함수
 *
 * 관리자 계정(tb_user)은 아직 이 값을 그대로 쓴다. 게시글·댓글 비밀번호는 아래 hashBoardPassword 를 쓴다.
 */
export const hashPassword = (password: string): string => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// ─── 게시글·댓글 비밀번호 (bcrypt 감싸기) ─────────────────────
//
// 예전에는 sha256(비밀번호) 를 그대로 저장했다. 소금(salt)이 없어 같은 비밀번호는 같은 값이 되고,
// 짧은 비밀번호는 미리 계산한 표로 쉽게 되돌릴 수 있다.
// 원래 비밀번호를 모르니 bcrypt(비밀번호) 로 다시 만들 수는 없어서, 기존 값을 한 번 더 감싼다:
//   저장값 = bcrypt(sha256(비밀번호))
// 이러면 기존 행도 저장된 sha256 값만으로 바꿀 수 있고(tools/rehash-board-passwords.ts),
// 이용자는 쓰던 비밀번호를 그대로 쓴다.
//
// 변환 스크립트를 돌리기 전에 배포해도 되도록, 확인할 때는 옛 sha256 값도 받아 준다.

const BCRYPT_ROUNDS = 10;
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;
const LEGACY_SHA256_RE = /^[0-9a-f]{64}$/i;

/** 새로 저장할 게시글·댓글 비밀번호 */
export async function hashBoardPassword(password: string): Promise<string> {
    // sha256 을 먼저 계산해 비밀번호가 없을 때 예전처럼 여기서 바로 던지게 한다
    return bcrypt.hash(hashPassword(password), BCRYPT_ROUNDS);
}

/** 입력한 비밀번호가 저장값과 맞는지. 저장값은 bcrypt(sha256) 이거나, 변환 전이면 옛 sha256 */
export async function verifyBoardPassword(password: string, stored: string | null | undefined): Promise<boolean> {
    const sha = hashPassword(password);
    if (!stored) return false;
    if (BCRYPT_RE.test(stored)) return bcrypt.compare(sha, stored);
    return stored === sha;
}

/** 변환 스크립트용 — 옛 sha256 저장값인지 */
export function isLegacyBoardHash(stored: string | null | undefined): boolean {
    return !!stored && LEGACY_SHA256_RE.test(stored);
}

/** 변환 스크립트용 — 옛 sha256 저장값을 bcrypt 로 감싼다 */
export function wrapLegacyBoardHash(legacySha256: string): Promise<string> {
    return bcrypt.hash(legacySha256.toLowerCase(), BCRYPT_ROUNDS);
}
