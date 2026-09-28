// 어드민 권한 관리 모듈 (/admin/permission).
// 권한 그룹 · 메뉴 트리 · 그룹별 메뉴 노출을 다룬다.
// 계정 CRUD 는 기존 UserModule(/admin/user)을 그대로 쓴다.
import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';

@Module({
    controllers: [PermissionController],
    providers: [PermissionService],
    exports: [PermissionService],
})
export class PermissionModule {}
