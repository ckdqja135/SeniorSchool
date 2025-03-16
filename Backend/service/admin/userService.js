const { User } = require('../../model/index');
const { Op } = require('sequelize');
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

        const responseUser = {
            userId: user.userIdx,
            username: user.userId,
            userRole: user.userRole
        };

        return { user: responseUser, accessToken: token };


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
        const existingUser = await User.findOne({ where: { userId: username } });
        if (existingUser) {
            logger.warn(`[signUp] User already exists: ${username}`);
            throw new Error('이미 존재하는 사용자입니다.');
        }

        // salt 생성 및 비밀번호 해시 처리
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = hashPassword(password, salt);

        // 새 사용자 생성
        const newUser = await User.create({
            userId: username,
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

/**
 * 토큰 유효성 검사 함수
 * @param {string} token - 검증할 토큰
 * @returns {Object} 디코딩된 토큰 정보
 * @throws {Error} 토큰이 없거나 유효하지 않은 경우
 */
exports.verifyToken = async (token) => {
    if (!token) {
        throw new Error('Token is required.');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        logger.error(`[verifyToken] Error: ${error.message}`);
        throw new Error('Invalid or expired token.');
    }
};

/**
 * 어드민 삭제 서비스
 * 전달받은 deleteParams(req.body)를 그대로 사용함.
 * req.body는 { userIdx: [1, 2, 3] } 형태의 객체로 전달됨.
 * userIdx 배열이 존재하면, 해당 어드민 데이터(단, userRole이 'admin'인 데이터)를 삭제하도록 University.destroy를 호출하였음.
 *
 * @param {Object} deleteParams - 삭제할 어드민 데이터 조건 (예: { userIdx: [1, 2, 3] })
 * @returns {Promise<Object>} - 삭제 결과 반환 (예: { success: true, message: "어드민 데이터 삭제완료.", deletedCount: 3 })
 */
exports.deleteAdmin = async (deleteParams) => {
    const { userIdx } = deleteParams;

    if (!Array.isArray(userIdx) || userIdx.length === 0) {
        throw new Error("삭제할 어드민의 userIdx 배열이 입력되지 않았음.");
    }

    // 전달받은 userIdx 배열을 사용하여, userRole이 'admin'인 어드민 데이터를 삭제하였음.
    const deletedCount = await User.destroy({
        where: {
            userIdx: { [Op.in]: userIdx },
            userRole: 'admin'
        }
    });

    // 삭제된 행이 없으면 예외 처리함.
    if (deletedCount === 0) {
        throw new Error("삭제할 어드민 데이터가 존재하지 않음.");
    }

    return {
        success: true,
        message: `어드민 데이터 삭제완료. 삭제된 개수: ${deletedCount}`,
        deletedCount
    };
};

/**
 * 어드민 추가 서비스
 * 전달받은 adminData(req.body)를 그대로 사용함.
 * 필수 입력값인 username과 password가 존재하면, 중복 체크 후 salt를 생성하고,
 * hashPassword(password, salt)를 통해 비밀번호를 처리하였음.
 * userRole은 'admin'으로 강제 설정하여 어드민 데이터를 생성하도록 개발하였음.
 *
 * @param {Object} adminData - 추가할 어드민 데이터 (예: { username: "newAdmin", password: "password123" })
 * @returns {Promise<Object>} - 생성 결과 반환 (예: { success: true, message: "회원가입에 성공했습니다." })
 */
exports.createAdmin = async (adminData) => {
    try {
        const { username, password } = adminData;

        // 필수 입력값 체크하였음.
        if (!username || !password) {
            logger.warn(`[createAdmin] Missing required fields: ${JSON.stringify(adminData)}`);
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // 중복된 userId 체크하였음.
        const existingUser = await User.findOne({ where: { userId: username } });
        if (existingUser) {
            logger.warn(`[createAdmin] User already exists: ${username}`);
            throw new Error('이미 존재하는 사용자입니다.');
        }

        // salt 생성 및 비밀번호 해시 처리하였음.
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = hashPassword(password, salt);

        // 새 어드민 생성하였음. userRole은 'admin'으로 강제 설정하였음.
        const newUser = await User.create({
            userId: username,
            userPw: hashedPassword,
            userRole: 'admin',
            salt,
            userStatus: 1
        });

        return { success: true, message: '어드민 추가 완료.' };
    } catch (error) {
        logger.error(`[createAdmin] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 어드민 리스트 조회 서비스
 * User 모델을 사용하여 userRole이 'admin'인 어드민 데이터를 모두 조회하였음.
 * 반환 시, 민감 정보(userPw, salt)는 제외하고 반환하도록 개발하였음.
 *
 * @returns {Promise<Array>} - 어드민 리스트 반환 (예: [ { userIdx, userId, userRole, lastLogin, userStatus }, ... ])
 */
exports.getAdminlist = async () => {
    const adminList = await User.findAll({
        where: { userRole: 'admin' },
        attributes: ['userIdx', 'userId', 'userRole', 'lastLogin', 'userStatus']
    });

    return adminList;
};

/**
 * 어드민 수정 서비스
 * 전달받은 patchParams(req.body)를 그대로 사용함.
 * 요청한 사용자의 userRole이 'master'인 경우에만 수정 권한을 부여함.
 * @param {Object} patchParams - 수정할 어드민 데이터 (예: { masterId: "masterAdmin", userIdx: 1, userStatus: 0 })
 * @returns {Promise<Object>} - 수정 결과 반환 (예: { success: true, message: "어드민 데이터 수정 완료.", affectedCount: 1 })
 */
exports.patchAdmin = async (patchParams) => {
    const { masterId, userIdx, ...updateData } = patchParams;

    // 필수 값 체크
    if (!masterId || !userIdx || Object.keys(updateData).length === 0) {
        throw new Error("필수 입력값이 누락되었음.");
    }

    // masterId가 'master' 권한인지 검증함
    const masterUser = await User.findOne({
        where: { userId: masterId, userRole: 'master' }
    });

    if (!masterUser) {
        throw new Error("권한이 없는 사용자입니다. (master 권한 필요)");
    }

    // userIdx에 해당하는 사용자 정보 업데이트
    const [affectedCount] = await User.update(updateData, {
        where: { userIdx }
    });

    if (affectedCount === 0) {
        throw new Error("수정할 데이터가 존재하지 않습니다.");
    }

    return {
        success: true,
        message: "어드민 데이터 수정 완료.",
        affectedCount
    };
};