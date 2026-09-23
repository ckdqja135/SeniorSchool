// /admin/outsource 서브라우터 모듈.
// 단일 컨트롤러(AdminOutsourceController): 클래스 레벨 가드 + POST /request 만 @Public().
// PrismaService 는 전역 PrismaModule(@Global)에서 주입되므로 여기서 provider 로 선언하지 않는다.
import { Module } from '@nestjs/common';
import { AdminOutsourceController } from './admin-outsource.controller';
import { AdminOutsourceService } from './admin-outsource.service';

@Module({
    controllers: [AdminOutsourceController],
    providers: [AdminOutsourceService],
})
export class AdminOutsourceModule {}
