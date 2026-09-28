/**
 * 어드민 권한 관리 — 권한 그룹 + 메뉴 트리 + 그룹별 메뉴 노출.
 *
 * 설계 요지
 * - userRole(admin/master)은 API 접근 판정용으로 그대로 두고(AdminGuard/MasterGuard),
 *   여기서 다루는 그룹은 '사이드바 메뉴 노출'만 정한다.
 * - master 는 데이터가 아니라 코드에서 최고 권한이다: getMyMenus 가 권한 JSON 을 아예 보지 않고
 *   전체 트리를 돌려준다. 그룹 행·JSON 키·화면 조작으로 master 의 시야를 줄일 수 없다.
 * - 그룹이 삭제되면 소속 계정의 groupIdx 는 FK(ON DELETE SET NULL)로 자동 해제된다.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../logger/winston.logger';

/** 사이드바가 3단까지만 그린다 (Sidebar/index.tsx 의 3단 렌더) */
const MAX_DEPTH = 3;

/** 붙박이 그룹 코드 — 새 그룹이 가져갈 수 없다 */
const RESERVED_CODES = ['master', 'admin'];

export interface MenuNode {
    menuIdx: number;
    menuName: string;
    menuPath: string | null;
    menuIcon: string | null;
    sortOrder: number;
    children: MenuNode[];
    /** 관리자 편집용 조회에만 실린다 */
    rolePermissions?: Record<string, boolean>;
}

type MenuRow = {
    menuIdx: number;
    parentIdx: number | null;
    menuName: string;
    menuPath: string | null;
    menuIcon: string | null;
    sortOrder: number;
    rolePermissions: Prisma.JsonValue;
};

@Injectable()
export class PermissionService {
    constructor(private readonly prisma: PrismaService) {}

    // ─── 조회 ────────────────────────────────────────────────

    /**
     * 로그인한 계정에게 보일 메뉴 트리.
     *
     * totalMenus 를 같이 주는 이유: 프론트가 '아직 시드 안 됨'(totalMenus=0 → 하드코딩 폴백)과
     * '그룹이 없어서 빈 메뉴'(totalMenus>0, menus=[] → 안내 문구)를 구분해야 한다.
     * 이게 없으면 마이그레이션 미적용 시 사이드바가 그냥 비어 어드민을 못 쓴다.
     */
    async getMyMenus(user: any) {
        const rows = await this.findMenuRows();
        const totalMenus = rows.length;

        // master 는 그룹과 무관하게 전체 — 권한 JSON 을 보지 않는다
        if (user?.userRole === 'master') {
            return { menus: this.buildTree(rows), totalMenus, hasGroup: true };
        }

        if (user?.groupIdx == null) {
            return { menus: [], totalMenus, hasGroup: false };
        }

        const group = await this.prisma.adminGroup.findUnique({ where: { groupIdx: user.groupIdx } });
        if (!group) {
            return { menus: [], totalMenus, hasGroup: false };
        }

        const visible = rows.filter((r) => this.permsOf(r)[group.groupCode] === true);
        return { menus: this.pruneEmptyContainers(this.buildTree(visible)), totalMenus, hasGroup: true };
    }

    /**
     * 권한 관리 화면용. 그룹 목록과 메뉴 트리를 한 번에 준다
     * (따로 받으면 트리 권한을 낡은 그룹 목록에 맞춰 그릴 수 있다).
     *
     * rolePermissions 는 살아 있는 그룹 기준으로 정규화한다 — 그룹을 추가해도 데이터 이관이
     * 필요 없고, 삭제된 그룹의 잔여 키는 응답에서 사라진다.
     */
    async getEditorData() {
        const [groups, rows] = await Promise.all([this.listGroups(), this.findMenuRows()]);
        const codes = groups.filter((g) => g.groupCode !== 'master').map((g) => g.groupCode);

        const withPerms = rows.map((r) => {
            const stored = this.permsOf(r);
            const normalized: Record<string, boolean> = {};
            for (const code of codes) normalized[code] = stored[code] === true;
            return { ...r, rolePermissions: normalized };
        });

        return { groups, menus: this.buildTree(withPerms, true) };
    }

    /** 그룹 목록 + 소속 인원수 */
    async listGroups() {
        const [groups, counts] = await Promise.all([
            this.prisma.adminGroup.findMany({ orderBy: [{ sortOrder: 'asc' }, { groupIdx: 'asc' }] }),
            this.prisma.user.groupBy({ by: ['groupIdx'], _count: { _all: true } }),
        ]);

        const countBy = new Map<number, number>();
        for (const c of counts) {
            if (c.groupIdx != null) countBy.set(c.groupIdx, c._count._all);
        }

        return groups.map((g) => ({
            groupIdx: g.groupIdx,
            groupCode: g.groupCode,
            groupName: g.groupName,
            isBuiltIn: g.isBuiltIn === 1,
            userCount: countBy.get(g.groupIdx) ?? 0,
        }));
    }

    // ─── 메뉴 쓰기 ───────────────────────────────────────────

    /** 메뉴 1건 추가. 같은 상위 안에서 맨 뒤에 붙는다 */
    async createMenu(body: any) {
        const menuName = this.requireName(body?.menuName);
        const menuPath = this.normalizePath(body?.menuPath);
        const menuIcon = this.normalizeIcon(body?.menuIcon);
        const parentIdx = body?.parentIdx == null ? null : Number(body.parentIdx);

        if (parentIdx !== null) {
            if (!Number.isInteger(parentIdx)) throw new Error('상위 메뉴가 올바르지 않습니다.');
            const rows = await this.findMenuRows();
            const parent = rows.find((r) => r.menuIdx === parentIdx);
            if (!parent) throw new Error('상위 메뉴를 찾을 수 없습니다.');
            // 새 메뉴가 들어갈 깊이 = 상위 깊이 + 1
            if (this.depthOf(rows, parentIdx) + 1 > MAX_DEPTH) {
                throw new Error(`메뉴는 ${MAX_DEPTH}단까지만 만들 수 있습니다.`);
            }
        }

        const last = await this.prisma.adminMenu.findFirst({
            where: { parentIdx },
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true },
        });

        // 새 메뉴는 '기본 관리자'에만 켜 둔다 — 아무도 못 보는 메뉴가 생기는 걸 막는다
        const created = await this.prisma.adminMenu.create({
            data: {
                parentIdx,
                menuName,
                menuPath,
                menuIcon,
                sortOrder: last ? last.sortOrder + 1 : 0,
                rolePermissions: { admin: true },
            },
        });

        logger.info(`[PermissionService:createMenu] ${created.menuIdx} ${menuName} (parent=${parentIdx})`);
        return created.menuIdx;
    }

    /** 메뉴 이름·경로·아이콘 수정 (상위 변경은 saveMenus 가 담당) */
    async updateMenu(menuIdx: number, body: any) {
        const target = await this.prisma.adminMenu.findUnique({ where: { menuIdx } });
        if (!target) throw new Error('메뉴를 찾을 수 없습니다.');

        const data: Prisma.AdminMenuUpdateInput = {};
        if (body?.menuName !== undefined) data.menuName = this.requireName(body.menuName);
        if (body?.menuPath !== undefined) data.menuPath = this.normalizePath(body.menuPath);
        if (body?.menuIcon !== undefined) data.menuIcon = this.normalizeIcon(body.menuIcon);

        if (Object.keys(data).length === 0) throw new Error('수정할 내용이 없습니다.');

        await this.prisma.adminMenu.update({ where: { menuIdx }, data });
        logger.info(`[PermissionService:updateMenu] ${menuIdx} ${JSON.stringify(data)}`);
    }

    /**
     * 메뉴 삭제. 하위는 FK(ON DELETE CASCADE)로 같이 지워진다.
     * 지워질 개수를 돌려줘서 화면이 확인 문구에 쓸 수 있게 한다.
     */
    async deleteMenu(menuIdx: number) {
        const rows = await this.findMenuRows();
        if (!rows.some((r) => r.menuIdx === menuIdx)) throw new Error('메뉴를 찾을 수 없습니다.');

        const doomed = this.collectSubtree(rows, menuIdx);
        await this.prisma.adminMenu.delete({ where: { menuIdx } });

        logger.info(`[PermissionService:deleteMenu] ${menuIdx} (하위 포함 ${doomed.length}건)`);
        return doomed.length;
    }

    /**
     * 트리 저장 — 순서·상위·그룹별 노출을 한 트랜잭션에 반영한다.
     *
     * 참조 구현은 payload 에 없는 행을 전부 삭제해서, 부분 전송 한 번에 메뉴가 전멸했다.
     * 여기서는 **받은 menuIdx 만 갱신하고 아무것도 삭제하지 않는다.** 삭제는 deleteMenu 전용.
     *
     * items: [{ menuIdx, parentIdx, sortOrder, rolePermissions }]
     */
    async saveMenus(items: any) {
        if (!Array.isArray(items) || items.length === 0) throw new Error('저장할 메뉴가 없습니다.');

        const rows = await this.findMenuRows();
        const known = new Set(rows.map((r) => r.menuIdx));

        const groups = await this.prisma.adminGroup.findMany({ select: { groupCode: true } });
        // master 는 코드에서 전체 노출이라 JSON 에 담지 않는다
        const codes = new Set(groups.map((g) => g.groupCode).filter((c) => c !== 'master'));

        const parsed = items.map((it: any) => {
            const menuIdx = Number(it?.menuIdx);
            if (!Number.isInteger(menuIdx) || !known.has(menuIdx)) {
                throw new Error(`존재하지 않는 메뉴입니다. (menuIdx=${it?.menuIdx})`);
            }
            const parentIdx = it?.parentIdx == null ? null : Number(it.parentIdx);
            if (parentIdx !== null && !known.has(parentIdx)) {
                throw new Error(`존재하지 않는 상위 메뉴입니다. (parentIdx=${it?.parentIdx})`);
            }
            const sortOrder = Number(it?.sortOrder);

            const perms: Record<string, boolean> = {};
            const incoming = it?.rolePermissions;
            if (incoming && typeof incoming === 'object') {
                // 모르는 그룹 코드와 master 키는 버린다
                for (const code of Object.keys(incoming)) {
                    if (codes.has(code)) perms[code] = incoming[code] === true;
                }
            }

            return {
                menuIdx,
                parentIdx,
                sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
                rolePermissions: perms,
            };
        });

        // 중복 menuIdx 차단 — 같은 노드를 두 번 보내면 마지막 값만 남아 조용히 어긋난다
        const seen = new Set<number>();
        for (const p of parsed) {
            if (seen.has(p.menuIdx)) throw new Error(`메뉴가 중복 전송되었습니다. (menuIdx=${p.menuIdx})`);
            seen.add(p.menuIdx);
        }

        // 순환·깊이 검사는 '저장 후' 부모 관계를 기준으로 한다
        const nextParent = new Map<number, number | null>();
        for (const r of rows) nextParent.set(r.menuIdx, r.parentIdx);
        for (const p of parsed) nextParent.set(p.menuIdx, p.parentIdx);

        for (const menuIdx of nextParent.keys()) {
            const depth = this.walkDepth(nextParent, menuIdx);
            if (depth === null) throw new Error('메뉴 상위 관계가 순환합니다.');
            if (depth > MAX_DEPTH) throw new Error(`메뉴는 ${MAX_DEPTH}단까지만 만들 수 있습니다.`);
        }

        await this.prisma.$transaction(
            parsed.map((p) =>
                this.prisma.adminMenu.update({
                    where: { menuIdx: p.menuIdx },
                    data: {
                        parentIdx: p.parentIdx,
                        sortOrder: p.sortOrder,
                        rolePermissions: p.rolePermissions,
                    },
                }),
            ),
        );

        logger.info(`[PermissionService:saveMenus] ${parsed.length}건 갱신`);
        return parsed.length;
    }

    // ─── 그룹 쓰기 ───────────────────────────────────────────

    async createGroup(body: any) {
        const groupName = this.requireName(body?.groupName, '그룹명');
        const groupCode = this.makeGroupCode(body?.groupCode, groupName);

        if (RESERVED_CODES.includes(groupCode)) {
            throw new Error(`'${groupCode}' 는 붙박이 그룹 코드라 쓸 수 없습니다.`);
        }
        const dup = await this.prisma.adminGroup.findUnique({ where: { groupCode } });
        if (dup) throw new Error('이미 같은 코드의 권한 그룹이 있습니다.');

        const last = await this.prisma.adminGroup.findFirst({
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true },
        });

        const created = await this.prisma.adminGroup.create({
            data: { groupCode, groupName, isBuiltIn: 0, sortOrder: last ? last.sortOrder + 1 : 0 },
        });

        logger.info(`[PermissionService:createGroup] ${created.groupIdx} ${groupCode}/${groupName}`);
        return { groupIdx: created.groupIdx, groupCode, groupName };
    }

    /** 그룹명 변경. 코드(groupCode)는 권한 JSON 의 키라서 바꾸지 않는다 */
    async renameGroup(groupIdx: number, body: any) {
        const group = await this.prisma.adminGroup.findUnique({ where: { groupIdx } });
        if (!group) throw new Error('권한 그룹을 찾을 수 없습니다.');
        if (group.groupCode === 'master') throw new Error('최고 관리자 그룹은 이름을 바꿀 수 없습니다.');

        const groupName = this.requireName(body?.groupName, '그룹명');
        await this.prisma.adminGroup.update({ where: { groupIdx }, data: { groupName } });
        logger.info(`[PermissionService:renameGroup] ${groupIdx} → ${groupName}`);
    }

    /**
     * 그룹 삭제. 소속 계정은 FK(SET NULL)로 그룹 없음이 되고(확정 동작),
     * 메뉴 JSON 에 남은 키는 같은 트랜잭션에서 걷어낸다.
     */
    async deleteGroup(groupIdx: number) {
        const group = await this.prisma.adminGroup.findUnique({ where: { groupIdx } });
        if (!group) throw new Error('권한 그룹을 찾을 수 없습니다.');
        if (group.isBuiltIn === 1) throw new Error('붙박이 권한 그룹은 삭제할 수 없습니다.');

        const rows = await this.findMenuRows();
        const dirty = rows.filter((r) => Object.prototype.hasOwnProperty.call(this.permsOf(r), group.groupCode));

        await this.prisma.$transaction([
            ...dirty.map((r) => {
                const perms = this.permsOf(r);
                delete perms[group.groupCode];
                return this.prisma.adminMenu.update({ where: { menuIdx: r.menuIdx }, data: { rolePermissions: perms } });
            }),
            this.prisma.adminGroup.delete({ where: { groupIdx } }),
        ]);

        logger.info(`[PermissionService:deleteGroup] ${groupIdx} ${group.groupCode} (메뉴 ${dirty.length}건 정리)`);
    }

    // ─── 내부 도우미 ─────────────────────────────────────────

    private findMenuRows(): Promise<MenuRow[]> {
        return this.prisma.adminMenu.findMany({
            orderBy: [{ sortOrder: 'asc' }, { menuIdx: 'asc' }],
            select: {
                menuIdx: true,
                parentIdx: true,
                menuName: true,
                menuPath: true,
                menuIcon: true,
                sortOrder: true,
                rolePermissions: true,
            },
        });
    }

    /** rolePermissions JSON 을 항상 평범한 객체로 (null·배열·스칼라 방어) */
    private permsOf(row: { rolePermissions: Prisma.JsonValue }): Record<string, boolean> {
        const v = row.rolePermissions;
        if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
        return { ...(v as Record<string, boolean>) };
    }

    private buildTree(rows: MenuRow[], withPerms = false, parentIdx: number | null = null): MenuNode[] {
        return rows
            .filter((r) => r.parentIdx === parentIdx)
            .map((r) => {
                const node: MenuNode = {
                    menuIdx: r.menuIdx,
                    menuName: r.menuName,
                    menuPath: r.menuPath,
                    menuIcon: r.menuIcon,
                    sortOrder: r.sortOrder,
                    children: this.buildTree(rows, withPerms, r.menuIdx),
                };
                if (withPerms) node.rolePermissions = this.permsOf(r);
                return node;
            });
    }

    /** 경로가 없는 묶음 메뉴인데 보일 하위도 없으면 사이드바에서 뺀다 (죽은 항목) */
    private pruneEmptyContainers(nodes: MenuNode[]): MenuNode[] {
        return nodes
            .map((n) => ({ ...n, children: this.pruneEmptyContainers(n.children) }))
            .filter((n) => n.menuPath !== null || n.children.length > 0);
    }

    /** 자신 + 모든 하위 */
    private collectSubtree(rows: MenuRow[], menuIdx: number): number[] {
        const out = [menuIdx];
        for (const child of rows.filter((r) => r.parentIdx === menuIdx)) {
            out.push(...this.collectSubtree(rows, child.menuIdx));
        }
        return out;
    }

    private depthOf(rows: MenuRow[], menuIdx: number): number {
        const parent = new Map<number, number | null>();
        for (const r of rows) parent.set(r.menuIdx, r.parentIdx);
        return this.walkDepth(parent, menuIdx) ?? MAX_DEPTH + 1;
    }

    /** 1부터 세는 깊이. 순환이면 null */
    private walkDepth(parent: Map<number, number | null>, menuIdx: number): number | null {
        let depth = 1;
        let cur = parent.get(menuIdx) ?? null;
        const seen = new Set<number>([menuIdx]);
        while (cur !== null && cur !== undefined) {
            if (seen.has(cur)) return null;
            seen.add(cur);
            depth += 1;
            if (depth > MAX_DEPTH + 2) return null;
            cur = parent.get(cur) ?? null;
        }
        return depth;
    }

    private requireName(v: any, label = '메뉴명'): string {
        const s = typeof v === 'string' ? v.trim() : '';
        if (!s) throw new Error(`${label}을 입력해주세요.`);
        if (s.length > 100) throw new Error(`${label}은 100자까지 입력할 수 있습니다.`);
        return s;
    }

    /** 경로는 자유 입력이다 — 실제 페이지 존재 여부는 확인하지 않는다(확정 사항) */
    private normalizePath(v: any): string | null {
        const s = typeof v === 'string' ? v.trim() : '';
        if (!s) return null;
        if (!s.startsWith('/')) throw new Error("경로는 '/' 로 시작해야 합니다.");
        if (s.length > 200) throw new Error('경로는 200자까지 입력할 수 있습니다.');
        return s;
    }

    private normalizeIcon(v: any): string | null {
        const s = typeof v === 'string' ? v.trim() : '';
        if (!s) return null;
        if (s.length > 20) throw new Error('아이콘은 20자까지 입력할 수 있습니다.');
        return s;
    }

    /** 그룹 코드: 직접 준 값이 있으면 그걸, 없으면 이름에서 만든다 */
    private makeGroupCode(given: any, groupName: string): string {
        const raw = typeof given === 'string' && given.trim() ? given.trim() : groupName;
        const code = raw
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]+/g, '_')
            .replace(/^_+|_+$/g, '');
        if (!code) throw new Error('그룹 코드를 만들 수 없습니다. 영문/숫자를 포함한 이름을 써주세요.');
        if (code.length > 50) throw new Error('그룹 코드는 50자까지 가능합니다.');
        return code;
    }
}
