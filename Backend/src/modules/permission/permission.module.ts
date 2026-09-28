// 어드민 권한 관리 모듈 (/admin/permission).
// 권한 그룹 · 메뉴 트리 · 그룹별 메뉴 노출을 다룬다.
// 계정 CRUD 는 기존 UserModule(/admin/user)을 그대로 쓴다.
// MenuAccessGuard 가 어드민 컨트롤러 전반에서 PermissionService 를 쓰므로 @Global 로 둔다
// (PrismaModule 과 같은 방식 — 모듈 15개에 import 를 흩뿌리지 않는다).
import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';

@Global()
@Module({
    controllers: [PermissionController],
    providers: [PermissionService],
    exports: [PermissionService],
})
export class PermissionModule {}
