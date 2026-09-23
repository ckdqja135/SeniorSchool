// 스케줄러/크롤러 집계 모듈. @Cron은 app.module의 ScheduleModule.forRoot()로 등록된다.
//   - 회사측: companyData(매일 00:00)/companyCrawler(월 04:00) 스케줄러 + external(OpenDart 등) + /admin/scheduler·/admin/company-crawler
//   - 맛집측: restaurantCrawler(월 03:00) 스케줄러 + Gemini/kakao/naver/siksin + /admin/crawler
import { Module } from '@nestjs/common';
import { CompanySchedulerModule } from './company/company-scheduler.module';
import { RestaurantCrawlerModule } from './restaurant/restaurant-crawler.module';

@Module({
    imports: [
        CompanySchedulerModule,
        RestaurantCrawlerModule,
    ],
})
export class SchedulerModule {}
