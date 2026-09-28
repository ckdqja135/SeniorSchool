// Backend/service/admin/userService.js의 Prisma 포팅.
// 인증 코어: 로그인(JWT 서명 24h), 토큰 검증, 어드민 CRUD.
// 죽은 경로: 원본 createAdmin/signUp은 crypto를 import하지 않아 crypto.randomBytes에서 항상 TypeError→500.
//   의도 스펙(salt 생성 + SHA256 해시)대로 구현한다 (DEVIATIONS.md 참조).
import { HttpException, Injectable } from '@nestjs/common';
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

            // 비활성화된 계정은 로그인시키지 않는다.
            // 비밀번호 확인 '뒤'에 검사해 계정 존재 여부를 흘리지 않는다.
            // HttpException 으로 던져야 전역 필터가 메시지를 그대로 내보낸다
            // (일반 Error 는 운영에서 '서버 오류가 발생했습니다'로 덮인다).
            if (user.userStatus !== 1) {
                logger.warn(`[signIn] Inactive account: ${username}`);
                throw new HttpException(
                    { success: false, message: '비활성화된 계정입니다. 관리자에게 문의해주세요.' },
                    403,
                );
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

    // 어드민 삭제. userIdx 는 스칼라와 배열 둘 다 받는다(프론트가 단건은 스칼라로 보낸다).
    // master 행도 지울 수 있지만, 본인과 '마지막 활성 master' 는 assertMasterQuorum 이 막는다.
    async deleteAdmin(deleteParams: any, caller?: any) {
        const raw = deleteParams?.userIdx;
        const list = [...new Set((Array.isArray(raw) ? raw : [raw]).map(Number).filter(Number.isInteger))];

        if (list.length === 0) {
            throw this.badRequest('삭제할 어드민의 userIdx가 입력되지 않았음.');
        }

        await this.assertMasterQuorum(list, caller, '삭제');

        const { count: deletedCount } = await this.prisma.user.deleteMany({
            where: { userIdx: { in: list } },
        });

        if (deletedCount === 0) {
            throw this.badRequest('삭제할 어드민 데이터가 존재하지 않음.');
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
            const { userId, userPw, userRole, groupIdx, userStatus } = adminData;

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

            // 권한 그룹 선택 한 칸이 userRole 과 groupIdx 를 함께 정한다.
            // groupIdx 없이 호출하는 예전 방식도 받아 준다(userRole 로 붙박이 그룹을 찾는다).
            const role = await this.resolveGroupRole(groupIdx, userRole);

            await this.prisma.user.create({
                data: {
                    userId,
                    userPw: hashedPassword,
                    userRole: role.userRole,
                    groupIdx: role.groupIdx,
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

    // 어드민 리스트 조회 (민감정보 제외).
    // userRole='admin' 필터를 뺐다 — master 계정이 목록에 안 보이면 권한 관리 화면에서 다룰 수 없다.
    async getAdminlist() {
        const rows = await this.prisma.user.findMany({
            select: {
                userIdx: true,
                userId: true,
                userRole: true,
                groupIdx: true,
                lastLogin: true,
                userStatus: true,
                group: { select: { groupCode: true, groupName: true } },
            },
            orderBy: { userIdx: 'asc' },
        });

        return rows.map(({ group, ...u }) => ({
            ...u,
            groupCode: group?.groupCode ?? null,
            groupName: group?.groupName ?? null,
        }));
    }

    /**
     * 어드민 수정 (master 전용 — MasterGuard 가 이미 확인했으므로 본문의 masterId 는 받지 않는다).
     *
     * 예전 구현은 본문 나머지를 그대로 updateMany 에 넘겨서 화이트리스트도 해싱도 없었다
     * (userPw 를 보내면 평문 저장). 여기서는 다룰 필드를 못 박고 비밀번호는 반드시 해시한다.
     */
    async patchAdmin(patchParams: any, caller?: any) {
        const userIdx = Number(patchParams?.userIdx);
        if (!Number.isInteger(userIdx)) {
            throw this.badRequest('수정할 userIdx가 입력되지 않았음.');
        }

        const target = await this.prisma.user.findUnique({ where: { userIdx } });
        if (!target) {
            throw this.badRequest('수정할 데이터가 존재하지 않습니다.');
        }

        const data: any = {};

        // 권한 그룹 변경 = userRole + groupIdx 동시 변경
        if (patchParams?.groupIdx !== undefined) {
            const role = await this.resolveGroupRole(patchParams.groupIdx);
            if (target.userRole === 'master' && role.userRole !== 'master') {
                await this.assertMasterQuorum([userIdx], caller, '변경');
            }
            data.userRole = role.userRole;
            data.groupIdx = role.groupIdx;
        }

        // 활성/비활성
        if (patchParams?.userStatus !== undefined) {
            const status = Number(patchParams.userStatus);
            if (status !== 0 && status !== 1) {
                throw this.badRequest('userStatus 는 0 또는 1 이어야 합니다.');
            }
            if (status === 0) {
                await this.assertMasterQuorum([userIdx], caller, '비활성화');
            }
            data.userStatus = status;
        }

        // 비밀번호 재설정 — 반드시 해시해서 저장 (salt 도 새로 발급)
        if (patchParams?.userPw !== undefined) {
            const pw = String(patchParams.userPw);
            if (pw.length < 4) {
                throw this.badRequest('비밀번호는 4자 이상이어야 합니다.');
            }
            data.userPw = hashPassword(pw);
            data.salt = crypto.randomBytes(16).toString('hex');
        }

        if (Object.keys(data).length === 0) {
            throw this.badRequest('수정할 내용이 없습니다.');
        }

        await this.prisma.user.update({ where: { userIdx }, data });

        logger.info(`[patchAdmin] ${userIdx} ${Object.keys(data).join(',')}`);
        return {
            success: true,
            message: '어드민 데이터 수정 완료.',
            affectedCount: 1,
        };
    }

    /**
     * 계정 목록의 '권한 그룹' 선택 한 칸이 userRole 과 groupIdx 를 함께 정한다.
     * master 그룹을 고르면 최고 권한(userRole='master'), 그 외는 admin + 해당 그룹.
     *
     * groupIdx 가 없으면 fallbackRole(기본 'admin')에 해당하는 붙박이 그룹을 찾아 넣는다.
     */
    private async resolveGroupRole(
        groupIdx: any,
        fallbackRole?: string,
    ): Promise<{ userRole: string; groupIdx: number | null }> {
        if (groupIdx === undefined || groupIdx === null || groupIdx === '') {
            const code = fallbackRole === 'master' ? 'master' : 'admin';
            const builtIn = await this.prisma.adminGroup.findUnique({ where: { groupCode: code } });
            return { userRole: code, groupIdx: builtIn?.groupIdx ?? null };
        }

        const idx = Number(groupIdx);
        if (!Number.isInteger(idx)) {
            throw this.badRequest('권한 그룹을 선택해주세요.');
        }

        const group = await this.prisma.adminGroup.findUnique({ where: { groupIdx: idx } });
        if (!group) {
            throw this.badRequest('존재하지 않는 권한 그룹입니다.');
        }

        return { userRole: group.groupCode === 'master' ? 'master' : 'admin', groupIdx: idx };
    }

    /**
     * 잠김 방지 — 본인 계정과 '마지막 활성 master' 는 강등·비활성화·삭제할 수 없다.
     * 권한 관리 화면 자체가 master 전용이라, 여기서 실수하면 아무도 되돌릴 수 없다.
     */
    private async assertMasterQuorum(targetIdxs: number[], caller: any, action: string) {
        if (caller?.userIdx != null && targetIdxs.includes(caller.userIdx)) {
            throw this.badRequest(`본인 계정은 ${action}할 수 없습니다. 다른 master 계정으로 진행해주세요.`);
        }

        const masters = await this.prisma.user.findMany({
            where: { userRole: 'master', userStatus: 1 },
            select: { userIdx: true },
        });

        if (masters.length > 0 && masters.every((m) => targetIdxs.includes(m.userIdx))) {
            throw this.badRequest(`마지막 master 계정은 ${action}할 수 없습니다.`);
        }
    }

    /**
     * 화면이 그대로 띄울 검증 오류.
     * 일반 Error 로 던지면 전역 필터가 운영에서 '서버 오류가 발생했습니다'로 덮어버려
     * 사용자가 이유를 알 수 없다 (all-exceptions.filter.ts 의 프로덕션 분기).
     */
    private badRequest(message: string) {
        return new HttpException({ success: false, message }, 400);
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
