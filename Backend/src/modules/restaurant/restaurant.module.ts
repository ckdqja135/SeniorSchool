import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { RestaurantBoardController } from './restaurant-board.controller';
import { RestaurantBoardService } from './restaurant-board.service';
import { RestaurantCommentController } from './restaurant-comment.controller';
import { RestaurantCommentService } from './restaurant-comment.service';

@Module({
    controllers: [RestaurantController, RestaurantBoardController, RestaurantCommentController],
    providers: [RestaurantService, RestaurantBoardService, RestaurantCommentService],
})
export class RestaurantModule {}
