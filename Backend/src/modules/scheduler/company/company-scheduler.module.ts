// 회사 데이터/크롤러 스케줄러 + 외부 API 서비스 묶음.
// PrismaService 는 전역(@Global) PrismaModule 로 제공되어 별도 import 불필요.
// @Cron 스케줄러는 app.module 의 ScheduleModule.forRoot() 로 등록된다 (오케스트레이터가 이 모듈을 wiring).
import { Module } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { ConglomerateService } from './conglomerate.service';
import { CompanyCrawlerService } from './company-crawler.service';
import { CompanyDataSchedulerService } from './company-data-scheduler.service';
import { CompanyCrawlerSchedulerService } from './company-crawler-scheduler.service';
import { CompanyDataSchedulerController, CompanyCrawlerController } from './company-scheduler.controller';

@Module({
    controllers: [CompanyDataSchedulerController, CompanyCrawlerController],
    providers: [
        ExternalApiService,
        ConglomerateService,
        CompanyCrawlerService,
        CompanyDataSchedulerService,
        CompanyCrawlerSchedulerService,
    ],
    exports: [
        ExternalApiService,
        ConglomerateService,
        CompanyCrawlerService,
    ],
})
export class CompanySchedulerModule {}
