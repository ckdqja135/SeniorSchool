const crypto = require('crypto');

/**
 * SHA256 암호화 함수
 * @param {string} password - 암호화할 비밀번호
 * @returns {string} - SHA256 해시된 비밀번호
 */
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

module.exports = hashPassword;

