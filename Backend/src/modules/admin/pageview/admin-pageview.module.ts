// 어드민 방문 통계 (/admin/pageview). POST /track만 무가드(@Public).
// 서비스는 스케줄러(보관 기간 지난 기록 삭제)도 쓰므로 내보낸다.
import { Module } from '@nestjs/common';
import { AdminPageViewController } from './admin-pageview.controller';
import { AdminPageViewService } from './admin-pageview.service';

@Module({
    controllers: [AdminPageViewController],
    providers: [AdminPageViewService],
    exports: [AdminPageViewService],
})
export class AdminPageViewModule {}
