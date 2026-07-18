// 어드민 게시판(후기) 관리 5종 (/admin/{univ,church,comp,outsource,restaurant}board).
import { Module } from '@nestjs/common';
import {
    AdminUnivBoardController,
    AdminChurchBoardController,
    AdminCompBoardController,
    AdminOutsourceBoardController,
    AdminRestaurantBoardController,
} from './admin-board.controller';
import {
    AdminUnivBoardService,
    AdminChurchBoardService,
    AdminCompBoardService,
    AdminOutsourceBoardService,
    AdminRestaurantBoardService,
} from './admin-board.service';

@Module({
    controllers: [
        AdminUnivBoardController,
        AdminChurchBoardController,
        AdminCompBoardController,
        AdminOutsourceBoardController,
        AdminRestaurantBoardController,
    ],
    providers: [
        AdminUnivBoardService,
        AdminChurchBoardService,
        AdminCompBoardService,
        AdminOutsourceBoardService,
        AdminRestaurantBoardService,
    ],
})
export class AdminBoardModule {}
