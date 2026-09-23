import { Global, Module } from '@nestjs/common';
import { BoardLikeHelperService } from './services/board-like-helper.service';

@Global()
@Module({
    providers: [BoardLikeHelperService],
    exports: [BoardLikeHelperService],
})
export class CommonModule {}
