// 식당 크롤러/스케줄러 모듈 (/admin/crawler + 주간 @Cron).
// PrismaService는 전역(PrismaModule @Global) 주입.
// 스케줄러의 @Cron 등록을 위해 오케스트레이터가 루트에 ScheduleModule.forRoot()를 추가한다(여기서는 미포함).
import { Module } from '@nestjs/common';
import { RestaurantCrawlerController } from './restaurant-crawler.controller';
import { RestaurantCrawlerService } from './restaurant-crawler.service';
import { CrawlerKeywordService } from './crawler-keyword.service';
import { RestaurantCrawlerSchedulerService } from './restaurant-crawler-scheduler.service';
import { RestaurantEnrichService } from './restaurant-enrich.service';

@Module({
    controllers: [RestaurantCrawlerController],
    providers: [
        RestaurantCrawlerService,
        CrawlerKeywordService,
        RestaurantCrawlerSchedulerService,
        RestaurantEnrichService,
    ],
    // 스케줄러 수동 실행 화면(SchedulerRunModule)이 주입받는다
    exports: [RestaurantCrawlerSchedulerService],
})
export class RestaurantCrawlerModule {}
