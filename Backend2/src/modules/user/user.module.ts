// 어드민 사용자/인증 모듈 (/admin/user) — 로그인·토큰검증·어드민 CRUD.
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
    controllers: [UserController],
    providers: [UserService],
})
export class UserModule {}
