// /admin/univ 서브라우터 모듈. 단일 컨트롤러(AdminUnivController) — POST /request만 @Public()으로 무가드.
// PrismaService는 전역(@Global) PrismaModule에서 주입되므로 여기 providers에 넣지 않는다.
import { Module } from '@nestjs/common';
import { AdminUnivController } from './admin-univ.controller';
import { AdminUnivService } from './admin-univ.service';

@Module({
    controllers: [AdminUnivController],
    providers: [AdminUnivService],
})
export class AdminUnivModule {}
