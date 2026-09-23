import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './modules/health/health.module';
import { UnivModule } from './modules/univ/univ.module';
import { ChurchModule } from './modules/church/church.module';
import { CompModule } from './modules/comp/comp.module';
import { OutsourceModule } from './modules/outsource/outsource.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { FreeBoardModule } from './modules/freeboard/freeboard.module';
import { BestPostsModule } from './modules/best-posts/best-posts.module';
import { RequestsModule } from './modules/requests/requests.module';
import { ReportModule } from './modules/report/report.module';
import { SearchModule } from './modules/search/search.module';
import { DynamicModule } from './modules/dynamic/dynamic.module';
import { UserModule } from './modules/user/user.module';
import { AdminModule } from './modules/admin/admin.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
    imports: [
        ScheduleModule.forRoot(), // @Cron 스케줄러 등록 (companyData/restaurantCrawler/companyCrawler)
        PrismaModule,
        CommonModule,
        HealthModule,
        UnivModule,
        ChurchModule,
        CompModule,
        OutsourceModule,
        RestaurantModule,
        FreeBoardModule,
        BestPostsModule,
        RequestsModule,
        ReportModule,
        SearchModule,
        DynamicModule,
        UserModule,
        AdminModule,
        SchedulerModule,
    ],
})
export class AppModule {}
