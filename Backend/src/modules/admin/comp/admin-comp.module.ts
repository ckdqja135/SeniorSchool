// 어드민 회사 관리 (/admin/comp). PrismaService 는 전역 모듈로 제공되어 별도 import 불필요
// (admin-board.module 과 동일 패턴).
import { Module } from '@nestjs/common';
import { AdminCompController } from './admin-comp.controller';
import { AdminCompService } from './admin-comp.service';

@Module({
    controllers: [AdminCompController],
    providers: [AdminCompService],
})
export class AdminCompModule {}
