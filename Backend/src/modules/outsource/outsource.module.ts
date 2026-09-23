import { Module } from '@nestjs/common';
import { OutsourceController } from './outsource.controller';
import { OutsourceService } from './outsource.service';
import { OutsourceBoardController } from './outsource-board.controller';
import { OutsourceBoardService } from './outsource-board.service';
import { OutsourceCommentController } from './outsource-comment.controller';
import { OutsourceCommentService } from './outsource-comment.service';

@Module({
    controllers: [OutsourceController, OutsourceBoardController, OutsourceCommentController],
    providers: [OutsourceService, OutsourceBoardService, OutsourceCommentService],
})
export class OutsourceModule {}
