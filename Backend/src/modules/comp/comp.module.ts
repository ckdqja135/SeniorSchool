import { Module } from '@nestjs/common';
import { CompController } from './comp.controller';
import { CompService } from './comp.service';
import { CompBoardController } from './comp-board.controller';
import { CompBoardService } from './comp-board.service';
import { CompCommentController } from './comp-comment.controller';
import { CompCommentService } from './comp-comment.service';

@Module({
    controllers: [CompController, CompBoardController, CompCommentController],
    providers: [CompService, CompBoardService, CompCommentService],
})
export class CompModule {}
