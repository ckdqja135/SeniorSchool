// 어드민 서브라우터 집계 모듈 (/admin/*). 하위 도메인 admin 모듈을 순차적으로 추가한다.
// (참고: /admin/user는 UserModule, /admin/services는 DynamicModule에서 이미 처리)
import { Module } from '@nestjs/common';
import { AdminBoardModule } from './board/admin-board.module';
import { AdminUnivModule } from './univ/admin-univ.module';
import { AdminCompModule } from './comp/admin-comp.module';
import { AdminChurchModule } from './church/admin-church.module';
import { AdminRestaurantModule } from './restaurant/admin-restaurant.module';
import { AdminOutsourceModule } from './outsource/admin-outsource.module';
import { AdminReportModule } from './report/admin-report.module';
import { AdminFreeBoardModule } from './freeboard/admin-freeboard.module';
import { AdminPageViewModule } from './pageview/admin-pageview.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';

@Module({
    imports: [
        AdminBoardModule,
        AdminUnivModule,
        AdminCompModule,
        AdminChurchModule,
        AdminRestaurantModule,
        AdminOutsourceModule,
        AdminReportModule,
        AdminFreeBoardModule,
        AdminPageViewModule,
        AdminDashboardModule,
    ],
})
export class AdminModule {}
