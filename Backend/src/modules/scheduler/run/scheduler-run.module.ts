// 스케줄러 수동 실행 화면(/admin/scheduler-run) 모듈.
// 세 잡 서비스를 주입받아 잡 목록·큐·실행 기록을 한 곳에서 다룬다.
// 크론(@Cron)도 이 모듈의 SchedulerRunService 에 모여 있어, 정기 실행도 같은 기록을 남긴다.
import { Module } from '@nestjs/common';
import { CompanySchedulerModule } from '../company/company-scheduler.module';
import { RestaurantCrawlerModule } from '../restaurant/restaurant-crawler.module';
import { SchedulerRunService } from './scheduler-run.service';
import { SchedulerRunController } from './scheduler-run.controller';

@Module({
    imports: [CompanySchedulerModule, RestaurantCrawlerModule],
    controllers: [SchedulerRunController],
    providers: [SchedulerRunService],
})
export class SchedulerRunModule {}
