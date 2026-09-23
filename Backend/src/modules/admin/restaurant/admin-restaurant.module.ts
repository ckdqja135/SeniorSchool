// 어드민 식당 관리 (/admin/restaurant). PrismaService는 전역(PrismaModule @Global) 주입.
import { Module } from '@nestjs/common';
import { AdminRestaurantController } from './admin-restaurant.controller';
import { AdminRestaurantService } from './admin-restaurant.service';

@Module({
    controllers: [AdminRestaurantController],
    providers: [AdminRestaurantService],
})
export class AdminRestaurantModule {}
