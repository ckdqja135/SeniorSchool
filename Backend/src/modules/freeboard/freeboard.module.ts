import { Module } from '@nestjs/common';
import { FreeBoardController } from './freeboard.controller';
import { FreeBoardService } from './freeboard.service';

@Module({
    controllers: [FreeBoardController],
    providers: [FreeBoardService],
})
export class FreeBoardModule {}
