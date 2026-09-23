// 어드민 교회 관리 (/admin/church) + 교회 추가 요청 관리 (Backend/routes/admin/church.router.js 포팅).
// PrismaService는 전역(@Global PrismaModule)에서 주입되므로 providers에 나열하지 않는다.
// POST /request는 원본에서 무가드 → 단일 컨트롤러 안에서 @Public()으로 처리(클래스 가드 무력화).
import { Module } from '@nestjs/common';
import { AdminChurchController } from './admin-church.controller';
import { AdminChurchService } from './admin-church.service';

@Module({
    controllers: [AdminChurchController],
    providers: [AdminChurchService],
})
export class AdminChurchModule {}
