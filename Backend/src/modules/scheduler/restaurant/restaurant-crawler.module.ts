// 식당 크롤러/스케줄러 모듈 (/admin/crawler + 주간 @Cron).
// PrismaService는 전역(PrismaModule @Global) 주입.
// 스케줄러의 @Cron 등록을 위해 오케스트레이터가 루트에 ScheduleModule.forRoot()를 추가한다(여기서는 미포함).
import { Module } from '@nestjs/common';
import { RestaurantCrawlerController } from './restaurant-crawler.controller';
import { RestaurantCrawlerService } from './restaurant-crawler.service';
import { CrawlerKeywordService } from './crawler-keyword.service';
import { RestaurantCrawlerSchedulerService } from './restaurant-crawler-scheduler.service';

@Module({
    controllers: [RestaurantCrawlerController],
    providers: [
        RestaurantCrawlerService,
        CrawlerKeywordService,
        RestaurantCrawlerSchedulerService,
    ],
})
export class RestaurantCrawlerModule {}
