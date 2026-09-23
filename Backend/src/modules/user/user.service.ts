// Backend/service/admin/userService.js의 Prisma 포팅.
// 인증 코어: 로그인(JWT 서명 24h), 토큰 검증, 어드민 CRUD.
// 죽은 경로: 원본 createAdmin/signUp은 crypto를 import하지 않아 crypto.randomBytes에서 항상 TypeError→500.
//   의도 스펙(salt 생성 + SHA256 해시)대로 구현한다 (DEVIATIONS.md 참조).
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async signIn(userData: any) {
        try {
            const { username, password } = userData;

            if (!username || !password) {
                logger.warn(`[signIn] Missing required fields: ${JSON.stringify(userData)}`);
                throw new Error('아이디나 비밀번호가 입력되지 않았습니다.');
            }

            const user = await this.prisma.user.findFirst({ where: { userId: username } });

            if (!user) {
                logger.warn(`[signIn] User not found ${username}`);
                throw new Error('해당 사용자를 찾을 수 없습니다.');
            }

            const inputPasswordHash = hashPassword(password);
            if (inputPasswordHash !== user.userPw) {
                logger.warn(`[signIn] Incorrect password for user: ${username}`);
                throw new Error('비밀번호가 일치하지 않습니다.');
            }

            // JWT 토큰 생성 (원본 코드 기준 24h 유효)
            const token = jwt.sign(
                { idx: user.userIdx, userId: user.userId, userRole: user.userRole },
                process.env.JWT_SECRET,
                { expiresIn: '24h' },
            );

            // User 테이블 accessToken 갱신
            await this.prisma.user.updateMany({ where: { userIdx: user.userIdx }, data: { accessToken: token } });

            const responseUser = {
                userId: user.userIdx,
                username: user.userId,
                userRole: user.userRole,
            };

            return { user: responseUser, accessToken: token };
        } catch (error) {
            logger.error(`[signIn] Error: ${error.message}`);
            throw error;
        }
    }

    // 토큰 유효성 검사 — 성공 시 디코딩 정보 반환, 실패 시 'Token expired.'/'Invalid token.' throw
    async verifyToken(token: string) {
        if (!token) {
            throw new Error('Token is required.');
        }
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                logger.warn(`[verifyToken] Token expired: ${error.message}`);
                throw new Error('Token expired.');
            }
            logger.error(`[verifyToken] Invalid token: ${error.message}`);
            throw new Error('Invalid token.');
        }
    }

    // 어드민 삭제 (userRole='admin'인 행만, userIdx 배열)
    async deleteAdmin(deleteParams: any) {
        const { userIdx } = deleteParams;

        if (!Array.isArray(userIdx) || userIdx.length === 0) {
            throw new Error('삭제할 어드민의 userIdx 배열이 입력되지 않았음.');
        }

        const { count: deletedCount } = await this.prisma.user.deleteMany({
            where: {
                userIdx: { in: userIdx },
                userRole: 'admin',
            },
        });

        if (deletedCount === 0) {
            throw new Error('삭제할 어드민 데이터가 존재하지 않음.');
        }

        return {
            success: true,
            message: `어드민 데이터 삭제완료. 삭제된 개수: ${deletedCount}`,
            deletedCount,
        };
    }

    // 어드민 추가 — 원본은 crypto 미import로 항상 500이던 죽은 경로. 의도 스펙(salt 생성 + SHA256)대로 구현.
    async createAdmin(adminData: any) {
        try {
            const { userId, userPw, userRole, userStatus } = adminData;

            if (!userId || !userPw) {
                logger.warn(`[createAdmin] Missing required fields: ${JSON.stringify(adminData)}`);
                throw new Error('필수 입력값이 누락되었습니다.');
            }

            const existingUser = await this.prisma.user.findFirst({ where: { userId } });
            if (existingUser) {
                logger.warn(`[createAdmin] User already exists: ${userId}`);
                throw new Error('이미 존재하는 사용자입니다.');
            }

            // salt 생성 (원본 의도) — 단, 원본과 동일하게 해시에는 salt를 쓰지 않고 SHA256(userPw)만 저장
            const salt = crypto.randomBytes(16).toString('hex');
            const hashedPassword = hashPassword(userPw);

            await this.prisma.user.create({
                data: {
                    userId,
                    userPw: hashedPassword,
                    userRole: userRole || 'admin',
                    salt,
                    userStatus: userStatus !== undefined ? userStatus : 1,
                },
            });

            return { success: true, message: '어드민 추가 완료.' };
        } catch (error) {
            logger.error(`[createAdmin] Error: ${error.message}`);
            throw error;
        }
    }

    // 어드민 리스트 조회 (userRole='admin', 민감정보 제외) — attributes 순서 보존
    async getAdminlist() {
        return this.prisma.user.findMany({
            where: { userRole: 'admin' },
            select: { userIdx: true, userId: true, userRole: true, lastLogin: true, userStatus: true },
        });
    }

    // 어드민 수정 — masterId가 master 권한일 때만 userIdx 대상 수정
    async patchAdmin(patchParams: any) {
        const { masterId, userIdx, ...updateData } = patchParams;

        if (!masterId || !userIdx || Object.keys(updateData).length === 0) {
            throw new Error('필수 입력값이 누락되었음.');
        }

        const masterUser = await this.prisma.user.findFirst({
            where: { userId: masterId, userRole: 'master' },
        });

        if (!masterUser) {
            throw new Error('권한이 없는 사용자입니다. (master 권한 필요)');
        }

        const { count: affectedCount } = await this.prisma.user.updateMany({
            where: { userIdx },
            data: updateData,
        });

        if (affectedCount === 0) {
            throw new Error('수정할 데이터가 존재하지 않습니다.');
        }

        return {
            success: true,
            message: '어드민 데이터 수정 완료.',
            affectedCount,
        };
    }

    // 로그아웃 — accessToken을 빈 문자열로 갱신
    async signOut(user: any) {
        if (!user) {
            throw new Error('로그인 상태가 아닙니다.');
        }

        await this.prisma.user.updateMany({ where: { userIdx: user.userIdx }, data: { accessToken: '' } });

        return {
            success: true,
            message: '로그아웃 성공',
        };
    }
}
