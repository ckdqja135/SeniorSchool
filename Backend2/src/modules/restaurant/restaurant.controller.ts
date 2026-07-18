// Backend/routes/restaurant.router.js + controller/restaurantController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
// 라우터 선언 순서(정적 → 파라미터)를 그대로 유지한다.
import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { RestaurantService } from './restaurant.service';
import { logger } from '../../logger/winston.logger';

@Controller('restaurant')
export class RestaurantController {
    constructor(private readonly restaurantService: RestaurantService) {}

    // 식당 목록 조회
    @Get()
    async getRestaurants(@Req() req: Request, @Res() res: Response) {
        try {
            const { name, type, location, limit } = req.query as Record<string, string>;

            const searchParams: Record<string, string> = {};
            if (name) searchParams.name = name;
            if (type) searchParams.type = type;
            if (location) searchParams.location = location;
            if (limit) searchParams.limit = limit;

            const restaurants = await this.restaurantService.getRestaurants(searchParams);
            res.status(200).json(restaurants);
        } catch (error) {
            logger.error(`[getRestaurants] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 상세 조회 (restaurantName, restaurantAddr로 조회 가능)
    @Get('restaurant')
    async getRestaurantDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const { restaurantName, restaurantAddr } = req.query as Record<string, string>;

            // restaurantName, restaurantAddr 중 하나는 필수
            if (!restaurantName && !restaurantAddr) {
                return res.status(400).json({ error: 'restaurantName or restaurantAddr is required' });
            }

            const restaurant = await this.restaurantService.getRestaurantDetail(null, restaurantName, restaurantAddr);
            res.status(200).json(restaurant);
        } catch (error) {
            logger.error(`[getRestaurantDetail] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 주변 식당 조회 (좌표 기반, 지도용)
    @Get('nearby')
    async getNearbyRestaurants(@Req() req: Request, @Res() res: Response) {
        try {
            const { lat, lng, radius, limit } = req.query as Record<string, string>;

            if (!lat || !lng) {
                return res.status(400).json({ error: 'lat and lng are required' });
            }

            const result = await this.restaurantService.getNearbyRestaurants(
                parseFloat(lat),
                parseFloat(lng),
                radius ? parseFloat(radius) : 5,
                limit ? parseInt(limit) : 200,
            );
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getNearbyRestaurants] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 조회수 TOP10 조회
    @Get('top-viewed')
    async getTopViewedRestaurants(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.restaurantService.getTopViewedRestaurants();
            res.status(200).json(result);
        } catch (error) {
            logger.error(`[getTopViewedRestaurants] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 최근 후기 5개 조회
    // NOTE: 원본 컨트롤러가 req.params.restaurantIdx(라우트에 파라미터 없음 → 항상 undefined)를 읽어 항상 400을 반환한다.
    @Get('recent')
    async getRecentRestaurantComments(@Req() req: Request, @Res() res: Response) {
        try {
            const { restaurantIdx } = req.params as Record<string, string>;

            if (!restaurantIdx) {
                return res.status(400).json({ error: 'restaurantIdx is required' });
            }

            const comments = await this.restaurantService.getRecentRestaurantComments(restaurantIdx);
            res.status(200).json(comments);
        } catch (error) {
            logger.error(`[getRecentRestaurantComments] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 후기 TOP10 조회 (조회수 기준)
    @Get('board/top-viewed')
    async getTopRestaurantComments(@Req() req: Request, @Res() res: Response) {
        try {
            const boards = await this.restaurantService.getTopRestaurantComments();
            res.status(200).json(boards);
        } catch (error) {
            logger.error(`[getTopRestaurantComments] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 후기 상세 조회
    // NOTE: 원본은 belongsTo 별칭 누락으로 항상 500이던 DEAD PATH — 의도된 스펙대로 구현.
    @Get('board/:boardIdx')
    async getRestaurantBoardDetail(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx } = req.params;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const board = await this.restaurantService.getRestaurantBoardDetail(boardIdx);
            res.status(200).json(board);
        } catch (error) {
            if (error.message === 'Board not found') {
                return res.status(404).json({ error: 'Board not found' });
            }
            logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 게시판 좋아요 조회
    @Get('like')
    async getRestaurantBoardLike(@Req() req: Request, @Res() res: Response) {
        try {
            const { boardIdx } = req.query as Record<string, string>;

            if (!boardIdx) {
                return res.status(400).json({ error: 'boardIdx is required' });
            }

            const likeInfo = await this.restaurantService.getRestaurantBoardLike(boardIdx);
            res.status(200).json(likeInfo);
        } catch (error) {
            if (error.message === 'Board not found') {
                return res.status(404).json({ error: 'Board not found' });
            }
            logger.error(`[getRestaurantBoardLike] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 추가 요청 생성 (일반 사용자용)
    // 원본은 catch에서 next(error) → 전역 에러 핸들러(AllExceptionsFilter)가 { message } 500 반환.
    // 여기서도 예외를 잡지 않고 전파시켜 동일 응답을 만든다.
    @Post('requests')
    async createRestaurantRequest(@Req() req: Request, @Res() res: Response) {
        const result = await this.restaurantService.createRestaurantRequest(req.body);

        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(409).json(result); // 409 Conflict for duplicate request
        }
    }

    // 식당 자동 완성 검색
    @Get('auto')
    async autoComplete(@Req() req: Request, @Res() res: Response) {
        try {
            const { keyword } = req.query as Record<string, string>;

            if (!keyword) {
                logger.warn('[autoComplete] Missing keyword in request');
                return res.status(400).json({ error: 'Keyword is required' });
            }

            const decodedKeyword = decodeURIComponent(keyword);
            const restaurants = await this.restaurantService.autoComplete(decodedKeyword);

            return res.status(200).json(restaurants);
        } catch (error) {
            logger.error(`[autoComplete] Error: ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 랜덤 식당 추천
    @Get('random')
    async getRandomRestaurant(@Req() req: Request, @Res() res: Response) {
        try {
            const { type } = req.query as Record<string, string>;
            const restaurant = await this.restaurantService.getRandomRestaurant(type);

            if (!restaurant) {
                return res.status(404).json({ error: 'No restaurant found' });
            }

            res.status(200).json(restaurant);
        } catch (error) {
            logger.error(`[getRandomRestaurant] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 카테고리(업종) 목록 조회
    @Get('types')
    async getRestaurantTypes(@Req() req: Request, @Res() res: Response) {
        try {
            const types = await this.restaurantService.getRestaurantTypes();
            res.status(200).json(types);
        } catch (error) {
            logger.error(`[getRestaurantTypes] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 식당 지역 목록 조회
    @Get('locations')
    async getRestaurantLocations(@Req() req: Request, @Res() res: Response) {
        try {
            const locations = await this.restaurantService.getRestaurantLocations();
            res.status(200).json(locations);
        } catch (error) {
            logger.error(`[getRestaurantLocations] Error: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
