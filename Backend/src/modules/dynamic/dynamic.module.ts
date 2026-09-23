// 동적 서비스 엔진 모듈.
//   퍼블릭: /services (목록), /services/:slug/{entities,boards,comments,requests} (SlugResolverGuard)
//   어드민: /admin/services (설정 CRUD + 사가), /admin/services/:slug/... (Jwt+Admin+Slug 가드)
import { Module } from '@nestjs/common';
import { DynamicServiceController } from './dynamic-service.controller';
import { DynamicServiceService } from './dynamic-service.service';
import { DynamicEntityController } from './dynamic-entity.controller';
import { DynamicEntityService } from './dynamic-entity.service';
import { DynamicBoardController } from './dynamic-board.controller';
import { DynamicBoardService } from './dynamic-board.service';
import { DynamicCommentController } from './dynamic-comment.controller';
import { DynamicCommentService } from './dynamic-comment.service';
import { DynamicRequestController } from './dynamic-request.controller';
import { DynamicRequestService } from './dynamic-request.service';
import { ServiceConfigService } from './service-config.service';
import { AdminServiceConfigController } from './admin-service-config.controller';
import { AdminDynamicController } from './admin-dynamic.controller';
import { SlugResolverGuard } from './slug-resolver.guard';

@Module({
    controllers: [
        DynamicServiceController,
        DynamicEntityController,
        DynamicBoardController,
        DynamicCommentController,
        DynamicRequestController,
        AdminServiceConfigController,
        AdminDynamicController,
    ],
    providers: [
        DynamicServiceService,
        DynamicEntityService,
        DynamicBoardService,
        DynamicCommentService,
        DynamicRequestService,
        ServiceConfigService,
        SlugResolverGuard,
    ],
})
export class DynamicModule {}
