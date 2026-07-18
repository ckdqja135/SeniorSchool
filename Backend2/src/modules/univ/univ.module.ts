// 학교(univ) 오빠 도메인 — tb_univboard/tb_univcomment 계열 전부를 한 모듈에 모은다.
//   - /univ/board, /univ/comment : 신 라우터 (Univ*)
//   - /board, /comment           : 레거시 호환 라우터 (Board*/Comment*, 같은 테이블/다른 코드)
import { Module } from '@nestjs/common';
import { UnivBoardController } from './univ-board.controller';
import { UnivBoardService } from './univ-board.service';
import { UnivCommentController } from './univ-comment.controller';
import { UnivCommentService } from './univ-comment.service';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
    controllers: [UnivBoardController, UnivCommentController, BoardController, CommentController],
    providers: [UnivBoardService, UnivCommentService, BoardService, CommentService],
})
export class UnivModule {}
