/**
 * 권한 그룹 기반 API 접근 제어 — 반드시 JwtAuthGuard + AdminGuard 뒤에 쓴다.
 *
 * 사이드바에서 메뉴를 감추는 것만으로는 주소를 직접 치거나 API 를 직접 부르면 그대로 열린다.
 * 여기서 '요청 경로 → 그 기능을 담당하는 메뉴' 를 찾아, 호출자의 권한 그룹에 그 메뉴가
 * 켜져 있는지 확인한다.
 *
 * - master 는 통과 (코드상 최고 권한)
 * - 그룹이 없는 계정은 전부 차단 (사이드바가 비어 있는 것과 같은 상태)
 * - 표에 없는 /admin 경로는 차단한다(fail-closed). 새 어드민 컨트롤러를 만들면
 *   아래 표에 한 줄 추가해야 한다 — 빠뜨리면 403 과 함께 로그가 남는다.
 *
 * 계정 관리(/admin/user)와 권한 관리(/admin/permission)에는 이 가드를 붙이지 않는다.
 * 각각 MasterGuard 로 막혀 있고, 사이드바 조회(/admin/permission/menus/me)는
 * 모든 어드민이 불러야 하기 때문이다.
 */
import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PermissionService } from '../../modules/permission/permission.service';
import { logger } from '../../logger/winston.logger';

/**
 * 어드민 API prefix → 그 기능을 담당하는 메뉴 경로.
 *
 * 경로 비교는 구분자 단위라 'admin/comp' 가 'admin/company-crawler' 를 삼키지 않는다.
 * 그래서 순서에 의존하지 않는다.
 */
const API_MENU_MAP: ReadonlyArray<readonly [string, string]> = [
    ['admin/dashboard', '/myoriadmin'],
    ['admin/freeboard', '/myoriadmin/freeboard'],

    ['admin/univ', '/myoriadmin/school'],
    ['admin/univboard', '/myoriadmin/school'],

    ['admin/church', '/myoriadmin/church'],
    ['admin/churchboard', '/myoriadmin/church'],

    ['admin/comp', '/myoriadmin/company'],
    ['admin/compboard', '/myoriadmin/company'],
    ['admin/company-crawler', '/myoriadmin/company/crawler'],

    ['admin/outsource', '/myoriadmin/outsource'],
    ['admin/outsourceboard', '/myoriadmin/outsource'],

    ['admin/restaurant', '/myoriadmin/restaurant'],
    ['admin/restaurantboard', '/myoriadmin/restaurant'],
    ['admin/crawler', '/myoriadmin/restaurant/crawler'],

    ['admin/services', '/myoriadmin/services'],
    ['admin/pageview', '/myoriadmin/analytics'],
    ['admin/report', '/myoriadmin/posts'],

    ['admin/scheduler', '/myoriadmin/scheduler'],
    ['admin/scheduler-run', '/myoriadmin/scheduler'],
];

/** a 가 b 를 구분자 단위로 덮는지 ('admin/comp' 는 'admin/company-crawler' 를 덮지 않는다) */
function covers(prefix: string, path: string): boolean {
    return path === prefix || path.startsWith(`${prefix}/`);
}

@Injectable()
export class MenuAccessGuard implements CanActivate {
    constructor(
        private readonly permission: PermissionService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const req = context.switchToHttp().getRequest<Request>();
        const user = (req as any).user;

        // master 는 그룹과 무관하게 전부 통과
        if (user?.userRole === 'master') return true;

        // 쿼리스트링을 떼고 앞의 '/' 도 뗀 순수 경로
        const path = (req.path || req.url || '').split('?')[0].replace(/^\/+/, '').replace(/\/+$/, '');

        const rule = API_MENU_MAP.find(([prefix]) => covers(prefix, path));
        if (!rule) {
            logger.warn(`[MenuAccessGuard] 매핑되지 않은 어드민 경로: ${path} — API_MENU_MAP 에 추가 필요`);
            throw new HttpException({ success: false, message: '접근 권한을 확인할 수 없는 경로입니다.' }, 403);
        }

        const allowed = await this.permission.canAccessMenuPath(user, rule[1]);
        if (!allowed) {
            logger.warn(`[MenuAccessGuard] 차단: userId=${user?.userId} path=${path} 필요메뉴=${rule[1]}`);
            throw new HttpException(
                { success: false, message: '이 기능에 대한 권한이 없습니다. 최고 관리자에게 요청해주세요.' },
                403,
            );
        }

        return true;
    }
}
