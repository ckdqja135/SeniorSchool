// Backend/controller/admin/{univ,church,comp,outsource,restaurant}BoardController.js 포팅.
// 5개 어드민 게시판 컨트롤러 — 동일 패턴(getPosts/createPost/updatePost/deletePost), 전부 JwtAuthGuard+AdminGuard.
// 원본 컨트롤러는 에러를 catch해 500 {status,message}로 응답하므로 그대로 재현.
import { Controller, Get, Post, Put, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { logger } from '../../../logger/winston.logger';
import {
    AdminBoardBaseService,
    AdminUnivBoardService,
    AdminChurchBoardService,
    AdminCompBoardService,
    AdminOutsourceBoardService,
    AdminRestaurantBoardService,
} from './admin-board.service';

// 공통 핸들러 (각 컨트롤러가 자신의 service와 tag를 넘겨 호출)
async function handleList(service: AdminBoardBaseService, tag: string, req: Request, res: Response) {
    try {
        const result = await service.listPosts(req.query);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.${tag}.controller.list] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
}
async function handleCreate(service: AdminBoardBaseService, tag: string, req: Request, res: Response) {
    try {
        const result = await service.createPost(req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.${tag}.controller.create] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
}
async function handleUpdate(service: AdminBoardBaseService, tag: string, boardIdx: string, req: Request, res: Response) {
    try {
        const result = await service.updatePost(boardIdx, req.body);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.${tag}.controller.update] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
}
async function handleDelete(service: AdminBoardBaseService, tag: string, boardIdx: string, res: Response) {
    try {
        const result = await service.deletePost(boardIdx);
        return res.status(result.status).json(result);
    } catch (error) {
        logger.error(`[admin.${tag}.controller.delete] ${error.message}`);
        return res.status(500).json({ status: 500, message: '서버 오류가 발생했습니다.' });
    }
}

@Controller('admin/univboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUnivBoardController {
    constructor(private readonly service: AdminUnivBoardService) {}
    @Get() getPosts(@Req() req: Request, @Res() res: Response) { return handleList(this.service, 'univboard', req, res); }
    @Post() createPost(@Req() req: Request, @Res() res: Response) { return handleCreate(this.service, 'univboard', req, res); }
    @Put(':boardIdx') updatePost(@Param('boardIdx') b: string, @Req() req: Request, @Res() res: Response) { return handleUpdate(this.service, 'univboard', b, req, res); }
    @Delete(':boardIdx') deletePost(@Param('boardIdx') b: string, @Res() res: Response) { return handleDelete(this.service, 'univboard', b, res); }
}

@Controller('admin/churchboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminChurchBoardController {
    constructor(private readonly service: AdminChurchBoardService) {}
    @Get() getPosts(@Req() req: Request, @Res() res: Response) { return handleList(this.service, 'churchboard', req, res); }
    @Post() createPost(@Req() req: Request, @Res() res: Response) { return handleCreate(this.service, 'churchboard', req, res); }
    @Put(':boardIdx') updatePost(@Param('boardIdx') b: string, @Req() req: Request, @Res() res: Response) { return handleUpdate(this.service, 'churchboard', b, req, res); }
    @Delete(':boardIdx') deletePost(@Param('boardIdx') b: string, @Res() res: Response) { return handleDelete(this.service, 'churchboard', b, res); }
}

@Controller('admin/compboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCompBoardController {
    constructor(private readonly service: AdminCompBoardService) {}
    @Get() getPosts(@Req() req: Request, @Res() res: Response) { return handleList(this.service, 'compboard', req, res); }
    @Post() createPost(@Req() req: Request, @Res() res: Response) { return handleCreate(this.service, 'compboard', req, res); }
    @Put(':boardIdx') updatePost(@Param('boardIdx') b: string, @Req() req: Request, @Res() res: Response) { return handleUpdate(this.service, 'compboard', b, req, res); }
    @Delete(':boardIdx') deletePost(@Param('boardIdx') b: string, @Res() res: Response) { return handleDelete(this.service, 'compboard', b, res); }
}

@Controller('admin/outsourceboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOutsourceBoardController {
    constructor(private readonly service: AdminOutsourceBoardService) {}
    @Get() getPosts(@Req() req: Request, @Res() res: Response) { return handleList(this.service, 'outsourceboard', req, res); }
    @Post() createPost(@Req() req: Request, @Res() res: Response) { return handleCreate(this.service, 'outsourceboard', req, res); }
    @Put(':boardIdx') updatePost(@Param('boardIdx') b: string, @Req() req: Request, @Res() res: Response) { return handleUpdate(this.service, 'outsourceboard', b, req, res); }
    @Delete(':boardIdx') deletePost(@Param('boardIdx') b: string, @Res() res: Response) { return handleDelete(this.service, 'outsourceboard', b, res); }
}

@Controller('admin/restaurantboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminRestaurantBoardController {
    constructor(private readonly service: AdminRestaurantBoardService) {}
    @Get() getPosts(@Req() req: Request, @Res() res: Response) { return handleList(this.service, 'restaurantboard', req, res); }
    @Post() createPost(@Req() req: Request, @Res() res: Response) { return handleCreate(this.service, 'restaurantboard', req, res); }
    @Put(':boardIdx') updatePost(@Param('boardIdx') b: string, @Req() req: Request, @Res() res: Response) { return handleUpdate(this.service, 'restaurantboard', b, req, res); }
    @Delete(':boardIdx') deletePost(@Param('boardIdx') b: string, @Res() res: Response) { return handleDelete(this.service, 'restaurantboard', b, res); }
}
