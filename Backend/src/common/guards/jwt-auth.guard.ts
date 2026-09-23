// Backend/middlewares/authMiddleware.js의 authenticateToken을 가드로 포팅.
// 토큰 탐색 우선순위, 상태코드, 응답 바디, 만료 시 쿠키 삭제까지 원본과 동일해야 한다.
import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // @Public() 이 붙은 핸들러는 인증을 건너뛴다 (어드민 라우터 내 공개 라우트용)
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();

        //  Authorization 헤더에서 Bearer Token 추출
        const authHeader = req.headers.authorization;
        const tokenFromHeader = authHeader && authHeader.split(' ')[1];

        //  Cookie 헤더에서 accessToken 추출
        const tokenFromCookieHeader = req.headers.cookie?.split('; ')
            .find(row => row.startsWith('accessToken='))
            ?.split('=')[1];

        //  req.cookies에서 accessToken 추출 (cookie-parser 이용)
        const tokenFromCookie = req.cookies && req.cookies.accessToken;

        // 모든 가능한 위치에서 토큰을 탐색
        const token = tokenFromHeader || tokenFromCookieHeader || tokenFromCookie;

        if (!token) {
            throw new HttpException({
                success: false,
                message: "인증 토큰이 없습니다. (로그인 필요)"
            }, 401);
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

            const user = await this.prisma.user.findFirst({ where: { userId: decoded.userId } });

            if (!user) {
                throw new HttpException({
                    success: false,
                    message: "사용자를 찾을 수 없습니다."
                }, 403);
            }

            (req as any).user = user; // 사용자 정보 추가
            return true;
        } catch (error) {
            // 위에서 명시적으로 던진 403은 그대로 전파
            if (error instanceof HttpException) {
                throw error;
            }

            // 토큰 만료 에러 구분
            if (error.name === 'TokenExpiredError') {
                // 만료된 토큰인 경우 쿠키 삭제
                res.clearCookie('accessToken', {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict'
                });

                throw new HttpException({
                    success: false,
                    message: "토큰이 만료되었습니다. 다시 로그인해주세요.",
                    expired: true
                }, 401);
            }

            // 기타 토큰 에러 (유효하지 않은 토큰)
            throw new HttpException({
                success: false,
                message: "유효하지 않은 토큰입니다. 다시 로그인해주세요.",
                error: error.message
            }, 401);
        }
    }
}
