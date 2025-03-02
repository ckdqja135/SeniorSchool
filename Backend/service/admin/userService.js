const { User } = require('../../model/index');
const logger = require('../../utils/logger');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

exports.signIn = async (userData) => {
    try {
        const { username, password } = userData;

        // 필수값 체크
        if (!username || !password) {
            logger.warn(`[signIn] Missing required fields: ${JSON.stringify(userData)}`);
            throw new Error('아이디나 비밀번호가 입력되지 않았습니다.');
        }

        // 사용자 id 조회 (await 사용 및 올바른 컬럼명 userId 사용)
        const user = await User.findOne({
            where: { userId: username }
        });

        if (!user) {
            logger.warn(`[signIn] User not found ${username}`);
            throw new Error("해당 사용자를 찾을 수 없습니다.");
        }

        // 입력받은 비밀번호 sha256 처리 후 비교
        const inputPasswordHash = hashPassword(password);
        if (inputPasswordHash !== user.userPw) {
            logger.warn(`[signIn] Incorrect password for user: ${username}`);
            throw new Error('비밀번호가 일치하지 않습니다.');
        }

        // JWT 토큰 생성 (1시간 유효)
        const token = jwt.sign(
            { idx: user.userIdx, userId: user.userId, userRole: user.userRole },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Sequelize 인스턴스를 plain 객체로 변환 후, userPw 필드를 삭제
        const userData = user.get({ plain: true });
        delete userData.userPw;

        return { userData, token };

    } catch (error) {
        // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
        logger.error(`[signIn] Error: ${error.message}`);
        throw error;
    }
};

exports.signUp = async (userData) => {
    try {
        const  { username, password } = userData;

        // 필수값 체크
        if (!username || !password) {
            logger.warn(`[signUp] Missing required fields: ${JSON.stringify(userData)}`);
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // 중복된 userId 체크
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            logger.warn(`[signUp] User already exists: ${username}`);
            throw new Error('이미 존재하는 사용자입니다.');
        }

        // salt 생성 및 비밀번호 해시 처리
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = hashPassword(password, salt);

        // 새 사용자 생성
        const newUser = await User.create({
            username,
            userPw: hashedPassword,
            userRole: 'admin',
            salt,
            userStatus: 1,
        });

        return { success: true, message: '회원가입에 성공했습니다.' };
    } catch (error) {
        logger.error(`[signUp] Error: ${error.message}`);
        throw error;
    }
};
