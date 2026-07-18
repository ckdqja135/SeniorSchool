import { Module } from '@nestjs/common';
import { ChurchController } from './church.controller';
import { ChurchService } from './church.service';
import { ChurchBoardController } from './church-board.controller';
import { ChurchBoardService } from './church-board.service';
import { ChurchCommentController } from './church-comment.controller';
import { ChurchCommentService } from './church-comment.service';

@Module({
    controllers: [ChurchController, ChurchBoardController, ChurchCommentController],
    providers: [ChurchService, ChurchBoardService, ChurchCommentService],
})
export class ChurchModule {}
