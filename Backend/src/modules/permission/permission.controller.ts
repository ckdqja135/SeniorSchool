/**
 * 어드민 권한 관리 API (/admin/permission).
 *
 * 가드 매핑
 *   GET  menus/me                : JwtAuthGuard + AdminGuard  (사이드바 — 로그인한 계정 본인 것만)
 *   그 외 전부                    : JwtAuthGuard + MasterGuard (권한 편집은 master 전용)
 *
 * 참조 구현(shop-admin)은 메뉴 컨트롤러에 역할 가드가 아예 없어 아무 로그인 계정이나
 * 권한 행렬을 덮어쓸 수 있었고, 메뉴 조회 대상을 경로 파라미터로 받아 남의 트리도 볼 수 있었다.
 * 둘 다 여기서 막는다 — 쓰기는 MasterGuard, 조회 대상은 JWT 의 계정뿐.
 */
import { Controller, Get, Post, Put, Patch, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { MasterGuard } from '../../common/guards/master.guard';
import { logger } from '../../logger/winston.logger';
import { PermissionService } from './permission.service';

@Controller('admin/permission')
export class PermissionController {
    constructor(private readonly service: PermissionService) {}

    // ─── 사이드바 ────────────────────────────────────────────

    /** 로그인한 계정에게 보일 메뉴 트리 (master 는 전체) */
    @Get('menus/me')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async myMenus(@Req() req: Request, @Res() res: Response) {
        try {
            const r = await this.service.getMyMenus((req as any).user);
            return res.status(200).json({ success: true, ...r });
        } catch (error: any) {
            logger.error(`[PermissionController:myMenus] ${error.message}`);
            return res.status(500).json({ success: false, message: '메뉴 조회 실패' });
        }
    }

    // ─── 권한 관리 화면 ──────────────────────────────────────

    /** 화면 초기 데이터 — 그룹 목록 + 메뉴 트리(그룹별 노출 포함) */
    @Get('menus')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async editorData(@Res() res: Response) {
        try {
            return res.status(200).json({ success: true, ...(await this.service.getEditorData()) });
        } catch (error: any) {
            logger.error(`[PermissionController:editorData] ${error.message}`);
            return res.status(500).json({ success: false, message: '권한 정보 조회 실패' });
        }
    }

    /** 메뉴 추가 */
    @Post('menus')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async createMenu(@Req() req: Request, @Res() res: Response) {
        try {
            const menuIdx = await this.service.createMenu(req.body);
            return res.status(201).json({ success: true, message: '메뉴를 추가했습니다.', menuIdx });
        } catch (error: any) {
            return this.fail(res, 'createMenu', error, '메뉴 추가 실패');
        }
    }

    /** 메뉴 이름·경로·아이콘 수정 */
    @Patch('menus/:menuIdx')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async updateMenu(@Param('menuIdx') menuIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            await this.service.updateMenu(Number(menuIdx), req.body);
            return res.status(200).json({ success: true, message: '메뉴를 수정했습니다.' });
        } catch (error: any) {
            return this.fail(res, 'updateMenu', error, '메뉴 수정 실패');
        }
    }

    /** 메뉴 삭제 (하위 포함) */
    @Delete('menus/:menuIdx')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async deleteMenu(@Param('menuIdx') menuIdx: string, @Res() res: Response) {
        try {
            const deletedCount = await this.service.deleteMenu(Number(menuIdx));
            return res.status(200).json({
                success: true,
                message: `메뉴 ${deletedCount}건을 삭제했습니다.`,
                deletedCount,
            });
        } catch (error: any) {
            return this.fail(res, 'deleteMenu', error, '메뉴 삭제 실패');
        }
    }

    /** 트리 저장 — 순서·상위·그룹별 노출. 받은 메뉴만 갱신하고 삭제는 하지 않는다 */
    @Put('menus')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async saveMenus(@Req() req: Request, @Res() res: Response) {
        try {
            const updated = await this.service.saveMenus(req.body?.items);
            return res.status(200).json({ success: true, message: '메뉴 권한을 저장했습니다.', updated });
        } catch (error: any) {
            return this.fail(res, 'saveMenus', error, '메뉴 저장 실패');
        }
    }

    // ─── 권한 그룹 ───────────────────────────────────────────

    @Get('groups')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async listGroups(@Res() res: Response) {
        try {
            return res.status(200).json({ success: true, data: await this.service.listGroups() });
        } catch (error: any) {
            logger.error(`[PermissionController:listGroups] ${error.message}`);
            return res.status(500).json({ success: false, message: '권한 그룹 조회 실패' });
        }
    }

    @Post('groups')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async createGroup(@Req() req: Request, @Res() res: Response) {
        try {
            const group = await this.service.createGroup(req.body);
            return res.status(201).json({ success: true, message: '권한 그룹을 추가했습니다.', data: group });
        } catch (error: any) {
            return this.fail(res, 'createGroup', error, '권한 그룹 추가 실패');
        }
    }

    @Patch('groups/:groupIdx')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async renameGroup(@Param('groupIdx') groupIdx: string, @Req() req: Request, @Res() res: Response) {
        try {
            await this.service.renameGroup(Number(groupIdx), req.body);
            return res.status(200).json({ success: true, message: '그룹명을 변경했습니다.' });
        } catch (error: any) {
            return this.fail(res, 'renameGroup', error, '그룹명 변경 실패');
        }
    }

    @Delete('groups/:groupIdx')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async deleteGroup(@Param('groupIdx') groupIdx: string, @Res() res: Response) {
        try {
            await this.service.deleteGroup(Number(groupIdx));
            return res.status(200).json({ success: true, message: '권한 그룹을 삭제했습니다.' });
        } catch (error: any) {
            return this.fail(res, 'deleteGroup', error, '권한 그룹 삭제 실패');
        }
    }

    /**
     * 서비스가 던진 검증 오류는 메시지를 그대로 400 으로 돌려준다(화면이 그대로 띄운다).
     * Prisma 오류는 내부 사정이라 메시지를 숨기고 500.
     */
    private fail(res: Response, where: string, error: any, generic: string) {
        logger.error(`[PermissionController:${where}] ${error.message}`);
        const isPrisma =
            error instanceof Prisma.PrismaClientKnownRequestError ||
            error instanceof Prisma.PrismaClientValidationError;
        if (isPrisma) {
            return res.status(500).json({ success: false, message: generic });
        }
        return res.status(400).json({ success: false, message: error.message || generic });
    }
}
