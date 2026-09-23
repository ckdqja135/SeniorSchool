import { Module } from '@nestjs/common';
import { BestPostsController } from './best-posts.controller';
import { BestPostsService } from './best-posts.service';

@Module({
    controllers: [BestPostsController],
    providers: [BestPostsService],
})
export class BestPostsModule {}
