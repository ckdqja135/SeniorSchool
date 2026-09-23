// 어드민 방문 통계 (/admin/pageview). POST /track만 무가드(@Public).
import { Module } from '@nestjs/common';
import { AdminPageViewController } from './admin-pageview.controller';
import { AdminPageViewService } from './admin-pageview.service';

@Module({
    controllers: [AdminPageViewController],
    providers: [AdminPageViewService],
})
export class AdminPageViewModule {}
