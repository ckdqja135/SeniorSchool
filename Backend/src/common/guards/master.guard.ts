// authMiddleware.js의 isMaster 포팅 — 반드시 JwtAuthGuard 뒤에 사용
import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class MasterGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // @Public() 핸들러는 권한 검사를 건너뛴다
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const req = context.switchToHttp().getRequest<Request>();
        const { userRole } = (req as any).user || {};

        if (userRole !== 'master') {
            throw new HttpException({
                success: false,
                message: "권한이 없습니다. (master 계정 필요)"
            }, 403);
        }

        return true;
    }
}
