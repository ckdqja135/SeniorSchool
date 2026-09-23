// Backend/service/admin/restaurantService.js의 Prisma 포팅 (/admin/restaurant).
// 직렬화 규칙:
//  - BigInt(restaurantIdx 등)는 전역 json replacer가 문자열화(main.ts).
//  - DECIMAL(restaurantRating)은 restaurant.util의 mapRestaurant/formatRating으로 "4.0" 형태.
//  - restaurantMenu(TEXT+JSON)는 mapRestaurant이 최상단 키로 hoisting(구 Sequelize getter 재현).
//  - stats/overview의 COUNT는 구 컨트롤러가 parseInt로 "숫자"를 방출하므로(문자열 아님) Number()로 변환.
//    (구 stats는 raw SQL 집계지만 최종 count 타입은 number — DEVIATIONS: 일반 raw-SQL의 COUNT→string 규칙 예외)
//  - DATETIME(requestDate/processedDate/createdAt/updatedAt)은 res.json이 ISO(UTC)로 직렬화.
// DEAD PATH: getRestaurantDetail은 GET /restaurant 라우트에 :restaurantIdx가 없어 항상 undefined를 받고,
//            구 findByPk(undefined)가 null 단축 반환 → 항상 404. 동일 동작을 재현한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';
import { mapRestaurant } from '../../restaurant/restaurant.util';

@Injectable()
export class AdminRestaurantService {
    constructor(private readonly prisma: PrismaService) {}

    // RestaurantInfo.update가 무시하는 비모델 키를 걸러내기 위한 화이트리스트
    // (Sequelize.update는 모델 속성만 반영 → Prisma는 미지의 키에서 예외 발생하므로 동일하게 픽)
    private static readonly UPDATABLE = [
        'restaurantName', 'restaurantLocation', 'restaurantType', 'restaurantEstablished', 'restaurantOwner',
        'restaurantLatX', 'restaurantLatY', 'restaurantURL', 'restaurantLotAddr', 'restaurantAddr',
        'restaurantMapIMG', 'restaurantImage', 'restaurantRating', 'restaurantMenu', 'restaurantStatus', 'restaurantViewCount',
    ];

    private pickRestaurantUpdate(src: any): Record<string, any> {
        const out: Record<string, any> = {};
        for (const k of AdminRestaurantService.UPDATABLE) {
            if (src[k] === undefined) continue;
            let v = src[k];
            if (k === 'restaurantMenu') {
                // 구 Sequelize setter 재현: null→null, string→그대로, else→JSON.stringify
                if (v === null) v = null;
                else if (typeof v !== 'string') v = JSON.stringify(v);
            }
            out[k] = v;
        }
        return out;
    }

    // 식당 생성 (단일/배열). 필수값/별점 검증 실패는 throw → 컨트롤러 next(e) → 500 { message }.
    async createRestaurant(restaurantData: any) {
        try {
            if (Array.isArray(restaurantData)) {
                const results: any[] = [];
                for (const restaurant of restaurantData) {
                    const { restaurantName, restaurantLocation, restaurantType } = restaurant;
                    if (!restaurantName || !restaurantLocation || !restaurantType) {
                        logger.warn(`[createRestaurant] Missing required fields: ${JSON.stringify(restaurant)}`);
                        throw new Error('필수값이 누락되었습니다. (restaurantName, restaurantLocation, restaurantType)');
                    }
                    let restaurantRating: number | null = null;
                    if (restaurant.restaurantRating !== undefined && restaurant.restaurantRating !== null) {
                        const rating = parseFloat(restaurant.restaurantRating);
                        if (isNaN(rating) || rating < 0 || rating > 5) {
                            throw new Error('별점은 0.0 ~ 5.0 사이의 값이어야 합니다.');
                        }
                        restaurantRating = Math.round(rating * 2) / 2;
                    }
                    const created = await this.prisma.restaurantInfo.create({
                        data: {
                            restaurantName: restaurant.restaurantName,
                            restaurantLocation: restaurant.restaurantLocation,
                            restaurantType: restaurant.restaurantType,
                            restaurantEstablished: restaurant.restaurantEstablished ?? '',
                            restaurantOwner: restaurant.restaurantOwner ?? '',
                            restaurantLatX: restaurant.restaurantLatX ?? 0,
                            restaurantLatY: restaurant.restaurantLatY ?? 0,
                            restaurantURL: restaurant.restaurantURL ?? '',
                            restaurantLotAddr: restaurant.restaurantLotAddr ?? '',
                            restaurantAddr: restaurant.restaurantAddr ?? '',
                            restaurantMapIMG: restaurant.restaurantMapIMG ?? null,
                            restaurantImage: restaurant.restaurantImage ?? null,
                            restaurantRating: restaurantRating,
                            restaurantStatus: 1,
                            restaurantViewCount: 0,
                        },
                    });
                    results.push(created);
                    logger.info(`[createRestaurant] 식당 등록 완료! : ${created.restaurantIdx}`);
                }
                return { insert: results.length, success: true };
            } else {
                const { restaurantName, restaurantLocation, restaurantType } = restaurantData;
                if (!restaurantName || !restaurantLocation || !restaurantType) {
                    logger.warn(`[createRestaurant] Missing required fields: ${JSON.stringify(restaurantData)}`);
                    throw new Error('필수값이 누락되었습니다. (restaurantName, restaurantLocation, restaurantType)');
                }
                let restaurantRating: number | null = null;
                if (restaurantData.restaurantRating !== undefined && restaurantData.restaurantRating !== null) {
                    const rating = parseFloat(restaurantData.restaurantRating);
                    if (isNaN(rating) || rating < 0 || rating > 5) {
                        throw new Error('별점은 0.0 ~ 5.0 사이의 값이어야 합니다.');
                    }
                    restaurantRating = Math.round(rating * 2) / 2;
                }
                const created = await this.prisma.restaurantInfo.create({
                    data: {
                        restaurantName: restaurantData.restaurantName,
                        restaurantLocation: restaurantData.restaurantLocation,
                        restaurantType: restaurantData.restaurantType,
                        restaurantEstablished: restaurantData.restaurantEstablished ?? '',
                        restaurantOwner: restaurantData.restaurantOwner ?? '',
                        restaurantLatX: restaurantData.restaurantLatX ?? 0,
                        restaurantLatY: restaurantData.restaurantLatY ?? 0,
                        restaurantURL: restaurantData.restaurantURL ?? '',
                        restaurantLotAddr: restaurantData.restaurantLotAddr ?? '',
                        restaurantAddr: restaurantData.restaurantAddr ?? '',
                        restaurantMapIMG: restaurantData.restaurantMapIMG ?? null,
                        restaurantImage: restaurantData.restaurantImage ?? null,
                        restaurantRating: restaurantRating,
                        restaurantStatus: 1,
                        restaurantViewCount: 0,
                    },
                });
                logger.info(`[createRestaurant] 식당 등록 완료! : ${created.restaurantIdx}`);
                // 구 스택은 방금 생성한 Sequelize 인스턴스를 반환(쓰기 경로 — 패리티 대상 아님).
                // 읽기 계약과 동일한 형태(mapRestaurant: restaurantMenu 우선/rating 문자열)로 직렬화한다.
                return { insert: 1, success: true, data: mapRestaurant(created) };
            }
        } catch (error) {
            logger.error(`[createRestaurant] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 검색 (활성 상태만, 이름/지역 LIKE, 종류 정확일치, 페이징)
    async searchRestaurant(searchParams: any) {
        try {
            const { name, type, location, page = 1, limit = 10 } = searchParams;

            const whereClause: Record<string, any> = { restaurantStatus: 1 }; // 활성 상태만

            if (name && name.trim() !== '') {
                whereClause.restaurantName = { contains: name.trim() };
            }
            if (type && type.trim() !== '') {
                whereClause.restaurantType = type.trim();
            }
            if (location && location.trim() !== '') {
                whereClause.restaurantLocation = { contains: location.trim() };
            }

            const offset: any = (page - 1) * limit;

            const count = await this.prisma.restaurantInfo.count({ where: whereClause });
            const rows = await this.prisma.restaurantInfo.findMany({
                where: whereClause,
                orderBy: { restaurantName: 'asc' },
                take: parseInt(limit),
                skip: parseInt(offset),
            });

            logger.info(`[searchRestaurant] Found ${count} restaurants`);

            return {
                status: 200,
                totalCount: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                restaurants: rows.map(mapRestaurant),
            };
        } catch (error) {
            logger.error(`[searchRestaurant] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 상세 (구 findByPk 재현 — restaurantIdx==null이면 null 단축 → 404). GET /restaurant는 항상 404(DEAD PATH).
    async getRestaurantDetail(restaurantIdx: any) {
        try {
            const restaurant = restaurantIdx == null
                ? null
                : await this.prisma.restaurantInfo.findUnique({ where: { restaurantIdx: Number(restaurantIdx) } });

            if (!restaurant) {
                return { status: 404, message: '식당을 찾을 수 없습니다.' };
            }

            // 식당 후기 평점 평균 계산
            const ratingResult = await this.prisma.restaurantBoard.aggregate({
                where: { restaurantIdx: restaurant.restaurantIdx, boardRating: { not: null } },
                _avg: { boardRating: true },
                _count: { boardRating: true },
            });

            const averageRating = ratingResult._avg.boardRating != null
                ? parseFloat(Number(ratingResult._avg.boardRating).toFixed(1))
                : null;
            const ratingCount = ratingResult._count.boardRating ? Number(ratingResult._count.boardRating) : 0;

            const restaurantData: any = mapRestaurant(restaurant);
            restaurantData.averageRating = averageRating;
            restaurantData.ratingCount = ratingCount;

            logger.info(`[getRestaurantDetail] Restaurant detail retrieved: ${restaurantIdx}, AverageRating: ${averageRating}, RatingCount: ${ratingCount}`);

            return { status: 200, restaurant: restaurantData };
        } catch (error) {
            logger.error(`[getRestaurantDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 컨트롤러 updateRestaurant의 사전 findByPk 재현 (존재 확인 + 기존 이미지 경로 접근용)
    async getRestaurantById(restaurantIdx: any) {
        if (restaurantIdx == null) return null;
        return this.prisma.restaurantInfo.findUnique({ where: { restaurantIdx: Number(restaurantIdx) } });
    }

    // 식당 수정 (별점 검증 → 400, 미존재 → 404, 성공 → 200)
    async updateRestaurant(restaurantIdx: any, updateData: any) {
        try {
            const restaurant = restaurantIdx == null
                ? null
                : await this.prisma.restaurantInfo.findUnique({ where: { restaurantIdx: Number(restaurantIdx) } });

            if (!restaurant) {
                return { status: 404, message: '식당을 찾을 수 없습니다.' };
            }

            if (updateData.restaurantRating !== undefined && updateData.restaurantRating !== null) {
                const rating = parseFloat(updateData.restaurantRating);
                if (isNaN(rating) || rating < 0 || rating > 5) {
                    return { status: 400, message: '별점은 0.0 ~ 5.0 사이의 값이어야 합니다.' };
                }
                updateData.restaurantRating = Math.round(rating * 2) / 2;
            }

            await this.prisma.restaurantInfo.updateMany({
                where: { restaurantIdx: Number(restaurantIdx) },
                data: this.pickRestaurantUpdate(updateData),
            });

            logger.info(`[updateRestaurant] Restaurant updated: ${restaurantIdx}`);

            return { status: 200, message: '식당 정보가 성공적으로 수정되었습니다.' };
        } catch (error) {
            logger.error(`[updateRestaurant] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 삭제 (soft delete: restaurantStatus=0). 매칭 0건 → 404.
    async deleteRestaurant(restaurantIdx: any) {
        try {
            const result = await this.prisma.restaurantInfo.updateMany({
                where: { restaurantIdx: Number(restaurantIdx) },
                data: { restaurantStatus: 0 },
            });

            if (result.count === 0) {
                return { status: 404, message: '식당을 찾을 수 없습니다.' };
            }

            logger.info(`[deleteRestaurant] Restaurant deleted: ${restaurantIdx}`);

            return { status: 200, message: '식당이 성공적으로 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[deleteRestaurant] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 통계 (총계/종류별/지역별/최근5). COUNT는 number(구 parseInt 재현).
    async getRestaurantStats() {
        try {
            const totalRestaurants = await this.prisma.restaurantInfo.count({
                where: { restaurantStatus: 1 },
            });

            // 음식 종류별 통계 (구: findAll group by restaurantType, COUNT(*) DESC)
            const typeRows = await this.prisma.$queryRawUnsafe<any[]>(
                'SELECT restaurantType, COUNT(*) AS cnt FROM tb_restaurant_info WHERE restaurantStatus = 1 GROUP BY restaurantType ORDER BY COUNT(*) DESC'
            );

            // 지역별 통계 (구: findAll group by restaurantLocation, COUNT(*) DESC)
            const locationRows = await this.prisma.$queryRawUnsafe<any[]>(
                'SELECT restaurantLocation, COUNT(*) AS cnt FROM tb_restaurant_info WHERE restaurantStatus = 1 GROUP BY restaurantLocation ORDER BY COUNT(*) DESC'
            );

            // 최근 등록된 식당 5개 (키 순서: restaurantIdx, restaurantName, restaurantType, restaurantLocation)
            const recentRestaurants = await this.prisma.restaurantInfo.findMany({
                where: { restaurantStatus: 1 },
                orderBy: { restaurantIdx: 'desc' },
                take: 5,
                select: { restaurantIdx: true, restaurantName: true, restaurantType: true, restaurantLocation: true },
            });

            logger.info(`[getRestaurantStats] Stats retrieved - Total: ${totalRestaurants}`);

            return {
                status: 200,
                stats: {
                    totalRestaurants,
                    typeStats: typeRows.map((item) => ({ type: item.restaurantType, count: Number(item.cnt) })),
                    locationStats: locationRows.map((item) => ({ location: item.restaurantLocation, count: Number(item.cnt) })),
                    recentRestaurants,
                },
            };
        } catch (error) {
            logger.error(`[getRestaurantStats] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 추가 요청 목록 (상태 필터 + 페이징, requestDate DESC)
    async getRestaurantRequests(searchParams: any) {
        try {
            const { status, page = 1, limit = 10 } = searchParams;

            const whereClause: Record<string, any> = {};
            if (status && ['pending', 'completed', 'rejected'].includes(status)) {
                whereClause.requestStatus = status;
            }

            const offset: any = (page - 1) * limit;

            const count = await this.prisma.restaurantRequest.count({ where: whereClause });
            const rows = await this.prisma.restaurantRequest.findMany({
                where: whereClause,
                orderBy: { requestDate: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset),
            });

            logger.info(`[getRestaurantRequests] Found ${count} requests`);

            return {
                status: 200,
                totalCount: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                requests: rows,
            };
        } catch (error) {
            logger.error(`[getRestaurantRequests] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 추가 요청 상태 변경 (상태값 검증 → 400, 미존재 → 404, 성공 → 200)
    async updateRestaurantRequestStatus(requestIdx: any, statusData: any) {
        try {
            const { requestStatus, adminNote } = statusData;

            if (!['pending', 'completed', 'rejected'].includes(requestStatus)) {
                return { status: 400, message: '유효하지 않은 상태값입니다. (pending, completed, rejected)' };
            }

            const request = await this.prisma.restaurantRequest.findUnique({
                where: { requestIdx: Number(requestIdx) },
            });

            if (!request) {
                return { status: 404, message: '요청을 찾을 수 없습니다.' };
            }

            const updateData: any = {
                requestStatus,
                adminNote: adminNote || null,
            };

            if (requestStatus === 'completed') {
                updateData.processedDate = new Date();
            }

            await this.prisma.restaurantRequest.updateMany({
                where: { requestIdx: Number(requestIdx) },
                data: updateData,
            });

            logger.info(`[updateRestaurantRequestStatus] Request status updated: ${requestIdx} -> ${requestStatus}`);

            return { status: 200, message: '요청 상태가 성공적으로 업데이트되었습니다.' };
        } catch (error) {
            logger.error(`[updateRestaurantRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }
}
