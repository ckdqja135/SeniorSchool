// Backend/utils/hashPassword.js의 verbatim 포팅
import * as crypto from 'crypto';

/**
 * SHA256 암호화 함수
 */
export const hashPassword = (password: string): string => {
    return crypto.createHash('sha256').update(password).digest('hex');
};
