// Backend/routes/admin/user.router.js + controller/admin/userController.js 포팅.
// 가드 매핑(원본 그대로):
//   POST signIn / GET verify : 무가드
//   DELETE deleteAdmin / POST createAdmin / PATCH patchAdmin / GET getAdminlist : JwtAuthGuard + MasterGuard (master 전용)
//   PATCH signOut : JwtAuthGuard
// 에러는 원본 컨트롤러의 next(e)와 동일하게 전역 예외 필터로 전파(throw) — 잡아서 변환하지 않는다.
import { Controller, Post, Get, Delete, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MasterGuard } from '../../common/guards/master.guard';

@Controller('admin/user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    // 로그인 (무가드)
    @Post('signIn')
    async signIn(@Req() req: Request, @Res() res: Response) {
        const result = await this.userService.signIn(req.body);
        // JWT 토큰을 쿠키에 설정
        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'strict' as const,
            maxAge: 60 * 60 * 1000, // 1시간
        };
        res.cookie('accessToken', result.accessToken, cookieOptions);
        return res.status(200).json({ ...result, accessToken: result.accessToken });
    }

    // 토큰 검증 (무가드)
    @Get('verify')
    async verifyToken(@Req() req: Request, @Res() res: Response) {
        const authHeader = req.headers.authorization;
        const tokenFromHeader = authHeader && authHeader.split(' ')[1];
        const tokenFromQuery = req.query.token as string;
        const tokenFromCookie = (req as any).cookies && (req as any).cookies.accessToken;
        const token = tokenFromHeader || tokenFromQuery || tokenFromCookie;

        if (!token) {
            return res.status(401).json({ valid: false, message: '토큰이 없습니다. 다시 로그인해주세요.' });
        }

        try {
            await this.userService.verifyToken(token);
            return res.status(200).json({ valid: true });
        } catch (error) {
            // 만료/무효 토큰이면 쿠키 삭제
            res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'strict' });

            if (error.message.includes('expired') || error.message.includes('Expired')) {
                return res.status(401).json({ valid: false, message: '토큰이 만료되었습니다. 다시 로그인해주세요.', expired: true });
            }

            return res.status(401).json({ valid: false, message: '유효하지 않은 토큰입니다. 다시 로그인해주세요.' });
        }
    }

    // 어드민 삭제 (master 전용)
    @Delete('deleteAdmin')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async deleteAdmin(@Req() req: Request, @Res() res: Response) {
        const result = await this.userService.deleteAdmin(req.body);
        return res.status(200).json(result);
    }

    // 어드민 추가 (master 전용)
    @Post('createAdmin')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async createAdmin(@Req() req: Request, @Res() res: Response) {
        const result = await this.userService.createAdmin(req.body);
        return res.status(201).json(result);
    }

    // 어드민 수정 (master 전용)
    @Patch('patchAdmin')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async patchAdmin(@Req() req: Request, @Res() res: Response) {
        const result = await this.userService.patchAdmin(req.body);
        return res.status(200).json(result);
    }

    // 어드민 리스트 (master 전용)
    @Get('getAdminlist')
    @UseGuards(JwtAuthGuard, MasterGuard)
    async getAdminlist(@Res() res: Response) {
        const result = await this.userService.getAdminlist();
        return res.status(200).json(result);
    }

    // 로그아웃 (JwtAuthGuard만)
    @Patch('signOut')
    @UseGuards(JwtAuthGuard)
    async signOut(@Req() req: Request, @Res() res: Response) {
        const result = await this.userService.signOut((req as any).user);
        res.clearCookie('accessToken', { path: '/' });
        return res.status(200).json(result);
    }
}
