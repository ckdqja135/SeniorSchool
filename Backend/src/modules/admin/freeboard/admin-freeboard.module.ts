// 어드민 자유게시판 관리 (/admin/freeboard).
import { Module } from '@nestjs/common';
import { AdminFreeBoardController } from './admin-freeboard.controller';
import { AdminFreeBoardService } from './admin-freeboard.service';

@Module({
    controllers: [AdminFreeBoardController],
    providers: [AdminFreeBoardService],
})
export class AdminFreeBoardModule {}
