// Backend/service/restaurantService.js의 Prisma 포팅.
// 직렬화: BigInt(restaurantIdx/boardIdx 등)는 전역 json replacer가 문자열화,
// DECIMAL(restaurantRating/boardRating)은 restaurant.util의 formatRating/mapRestaurant으로 "4.0" 형태.
// 도달 불가(항상 500/400) 경로 처리 방침은 SeniorSchool/docs/DEVIATIONS.md 참조.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeRows } from '../../common/utils/serialize-row.util';
import { logger } from '../../logger/winston.logger';
import { mapRestaurant, parseCityDistrict, selectHotplaceRows } from './restaurant.util';

@Injectable()
export class RestaurantService {
    constructor(private readonly prisma: PrismaService) {}

    // 식당 목록 조회
    async getRestaurants(searchParams: any = {}) {
        try {
            const whereClause: Record<string, any> = { restaurantStatus: 1 }; // 활성화된 식당만

            const { name, type, location, limit } = searchParams;

            if (name && name.trim() !== '') {
                whereClause.restaurantName = { contains: name.trim() };
                logger.info(`[getRestaurants] Name search applied: "${name.trim()}"`);
            }

            if (type && type.trim() !== '') {
                whereClause.restaurantType = type.trim();
                logger.info(`[getRestaurants] Type search applied: "${type.trim()}"`);
            }

            if (location && location.trim() !== '') {
                whereClause.restaurantLocation = { contains: location.trim() };
                logger.info(`[getRestaurants] Location search applied: "${location.trim()}"`);
            }

            const queryOptions: any = {
                where: whereClause,
                orderBy: { restaurantName: 'asc' }, // 식당명 순 정렬
            };

            if (limit && !isNaN(parseInt(limit))) {
                queryOptions.take = parseInt(limit);
                logger.info(`[getRestaurants] Limit applied: ${limit}`);
            }

            const restaurants = await this.prisma.restaurantInfo.findMany(queryOptions);

            logger.info(`[getRestaurants] Found ${restaurants.length} restaurants`);
            return restaurants.map(mapRestaurant);
        } catch (error) {
            logger.error(`[getRestaurants] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 상세 조회
    async getRestaurantDetail(restaurantIdx: any, restaurantName: any, restaurantAddr: any) {
        try {
            const whereClause: Record<string, any> = { restaurantStatus: 1 };

            if (restaurantIdx) {
                whereClause.restaurantIdx = Number(restaurantIdx);
            } else if (restaurantName) {
                whereClause.restaurantName = restaurantName;
            } else if (restaurantAddr) {
                whereClause.restaurantAddr = restaurantAddr;
            }

            const restaurant = await this.prisma.restaurantInfo.findFirst({ where: whereClause });

            if (!restaurant) {
                throw new Error('Restaurant not found');
            }

            // 조회수 증가 (updatedAt은 건드리지 않음 — 스키마상 @updatedAt이 아니므로 increment만 반영)
            await this.prisma.restaurantInfo.updateMany({
                where: { restaurantIdx: restaurant.restaurantIdx },
                data: { restaurantViewCount: { increment: 1 } },
            });

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

            // 평균 평점 정보를 식당 객체에 추가 (조회수 증가 전 값 반환)
            const restaurantData: any = mapRestaurant(restaurant);
            restaurantData.averageRating = averageRating;
            restaurantData.ratingCount = ratingCount;

            logger.info(`[getRestaurantDetail] Restaurant detail retrieved. RestaurantIdx: ${restaurant.restaurantIdx}, RestaurantName: ${restaurant.restaurantName}, AverageRating: ${averageRating}, RatingCount: ${ratingCount}`);
            return restaurantData;
        } catch (error) {
            logger.error(`[getRestaurantDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 추가 요청 생성
    async createRestaurantRequest(requestData: any) {
        try {
            const { restaurantName, restaurantOwner, restaurantType, restaurantAddr } = requestData;

            // 필수값 체크
            if (!restaurantName || restaurantName.trim() === '') {
                throw new Error('식당명은 필수입니다.');
            }

            // 중복 요청 체크 (pending 상태인 동일 식당명)
            const existingRequest = await this.prisma.restaurantRequest.findFirst({
                where: {
                    restaurantName: restaurantName.trim(),
                    requestStatus: 'pending',
                },
            });

            if (existingRequest) {
                return {
                    success: false,
                    message: '이미 동일한 식당에 대한 요청이 처리 대기중입니다.',
                };
            }

            // 새 요청 생성
            const newRequest = await this.prisma.restaurantRequest.create({
                data: {
                    restaurantName: restaurantName.trim(),
                    restaurantOwner: restaurantOwner ? restaurantOwner.trim() : null,
                    restaurantType: restaurantType ? restaurantType.trim() : null,
                    restaurantAddr: restaurantAddr ? restaurantAddr.trim() : null,
                    requestStatus: 'pending',
                },
            });

            logger.info(`[createRestaurantRequest] New restaurant request created. RequestIdx: ${newRequest.requestIdx}, RestaurantName: ${restaurantName}`);

            return {
                success: true,
                message: '식당 추가 요청이 성공적으로 등록되었습니다.',
                data: newRequest,
            };
        } catch (error) {
            logger.error(`[createRestaurantRequest] Error: ${error.message}`);
            throw error;
        }
    }

    // 주변 식당 조회 (좌표 기반, 지도용) — Haversine 거리 계산을 JS로 재현
    async getNearbyRestaurants(lat: number, lng: number, radiusKm = 5, limit = 200) {
        try {
            // 원본(Sequelize)과 동일하게 Haversine 거리·반경 필터·정렬·LIMIT 을 전부 SQL 에서 처리한다.
            // 이전 포팅은 전체 식당(약 7천 행, restaurantMenu 포함 7MB)을 매 호출마다 Node 로 가져와 JS 로 걸렀고,
            // 지도가 카메라 이동마다 이 API 를 부르면 이벤트 루프가 수 초씩 막혀 다른 요청까지 지연됐다.
            // acos 인자는 부동소수 오차로 1 을 살짝 넘을 수 있어(같은 좌표) LEAST/GREATEST 로 정의역을 고정한다.
            const rows = await this.prisma.$queryRawUnsafe<any[]>(
                `SELECT restaurantIdx, restaurantName, restaurantLocation, restaurantType, restaurantEstablished,
                        restaurantOwner, restaurantLatX, restaurantLatY, restaurantURL, restaurantLotAddr, restaurantAddr,
                        restaurantMapIMG, restaurantImage, restaurantRating, restaurantMenu, restaurantStatus,
                        restaurantViewCount, created_at AS createdAt, updated_at AS updatedAt,
                        (6371 * ACOS(LEAST(1, GREATEST(-1,
                            COS(RADIANS(?)) * COS(RADIANS(restaurantLatX)) * COS(RADIANS(restaurantLatY) - RADIANS(?))
                            + SIN(RADIANS(?)) * SIN(RADIANS(restaurantLatX)))))) AS distance
                 FROM tb_restaurant_info
                 WHERE restaurantStatus = 1
                   AND restaurantLatX IS NOT NULL AND restaurantLatX <> 0
                   AND restaurantLatY IS NOT NULL AND restaurantLatY <> 0
                 HAVING distance <= ?
                 ORDER BY distance ASC
                 LIMIT ?`,
                lat, lng, lat, radiusKm, limit,
            );
            const withDistance = rows.map((r) => {
                const { distance, ...rest } = r;
                return { r: rest, distance: Number(distance) };
            });

            // 평균 평점 일괄 조회
            const idxList = withDistance.map((x) => x.r.restaurantIdx as bigint);
            const ratings = idxList.length > 0
                ? await this.prisma.restaurantBoard.groupBy({
                    by: ['restaurantIdx'],
                    where: { restaurantIdx: { in: idxList }, boardRating: { not: null } },
                    _avg: { boardRating: true },
                    _count: { boardRating: true },
                })
                : [];
            const ratingMap = new Map(ratings.map((r) => [String(r.restaurantIdx), r]));

            const result = withDistance.map(({ r, distance }) => {
                const data: any = mapRestaurant(r);
                data.distance = distance;
                const rating = ratingMap.get(String(r.restaurantIdx));
                data.averageRating = rating && rating._avg.boardRating != null
                    ? parseFloat(Number(rating._avg.boardRating).toFixed(1))
                    : null;
                data.ratingCount = rating ? Number(rating._count.boardRating) : 0;
                return data;
            });

            logger.info(`[getNearbyRestaurants] lat=${lat}, lng=${lng}, radius=${radiusKm}km → ${result.length}건`);
            return result;
        } catch (error) {
            logger.error(`[getNearbyRestaurants] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 조회수 TOP10 조회
    async getTopViewedRestaurants() {
        try {
            const restaurants = await this.prisma.restaurantInfo.findMany({
                where: { restaurantStatus: 1 }, // 활성 상태인 식당만
                // 원본은 restaurantViewCount DESC 단일 정렬이라 동점 조회수의 순서가 비결정적(DEVIATIONS.md 참조).
                // 신 API는 재현성을 위해 restaurantIdx ASC를 2차 정렬로 고정한다. 패리티는 순서 무관 비교.
                orderBy: [{ restaurantViewCount: 'desc' }, { restaurantIdx: 'asc' }],
                take: 10, // TOP 10
            });

            const idxList = restaurants.map((r) => r.restaurantIdx);
            const ratings = idxList.length > 0
                ? await this.prisma.restaurantBoard.groupBy({
                    by: ['restaurantIdx'],
                    where: { restaurantIdx: { in: idxList }, boardRating: { not: null } },
                    _avg: { boardRating: true },
                    _count: { boardRating: true },
                })
                : [];
            const ratingMap = new Map(ratings.map((r) => [String(r.restaurantIdx), r]));

            const restaurantsWithRating = restaurants.map((restaurant) => {
                const rating = ratingMap.get(String(restaurant.restaurantIdx));
                const restaurantData: any = mapRestaurant(restaurant);
                restaurantData.averageRating = rating && rating._avg.boardRating != null
                    ? parseFloat(Number(rating._avg.boardRating).toFixed(1))
                    : null;
                restaurantData.ratingCount = rating ? Number(rating._count.boardRating) : 0;
                return restaurantData;
            });

            logger.info(`[getTopViewedRestaurants] Found ${restaurantsWithRating.length} top viewed restaurants with ratings`);
            return restaurantsWithRating;
        } catch (error) {
            logger.error(`[getTopViewedRestaurants] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 최근 후기 5개 조회
    // NOTE: 컨트롤러가 req.params.restaurantIdx(항상 undefined)를 읽어 항상 400을 반환하므로
    //       이 서비스 메서드는 실제로 도달하지 않는다(라우터에 :restaurantIdx 파라미터가 없음). DEVIATIONS.md 참조.
    async getRecentRestaurantComments(restaurantIdx: any) {
        try {
            const boards = await this.prisma.restaurantBoard.findMany({
                where: { restaurantIdx: Number(restaurantIdx) },
                select: { boardIdx: true, boardTitle: true },
            });
            const boardMap = new Map(boards.map((b) => [String(b.boardIdx), b]));
            const boardIdxList = boards.map((b) => b.boardIdx);

            const comments = boardIdxList.length > 0
                ? await this.prisma.restaurantComment.findMany({
                    where: { boardIdx: { in: boardIdxList } },
                    select: { commentIdx: true, commentContent: true, writerId: true, regDate: true, commentLike: true, boardIdx: true },
                    orderBy: { regDate: 'desc' }, // 최신순
                    take: 5,
                })
                : [];

            logger.info(`[getRecentRestaurantComments] Found ${comments.length} recent comments for restaurantIdx: ${restaurantIdx}`);
            return comments.map((c) => ({
                commentIdx: c.commentIdx,
                commentContent: c.commentContent,
                writerId: c.writerId,
                regDate: c.regDate,
                commentLike: c.commentLike,
                RestaurantBoard: boardMap.get(String(c.boardIdx)) || null,
            }));
        } catch (error) {
            logger.error(`[getRecentRestaurantComments] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 후기 TOP10 조회 (조회수 기준) — belongsTo 'restaurant'(restaurantName, restaurantAddr) 포함
    async getTopRestaurantComments() {
        try {
            const boards = await this.prisma.restaurantBoard.findMany({
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardID: true,
                    boardRegDate: true,
                    boardLike: true,
                    boardHits: true,
                    restaurantIdx: true,
                },
                // 원본은 boardHits DESC 단일 정렬(2차 키 없음)이라 동점은 MySQL filesort 순서 = PK(boardIdx) 오름차순으로 나온다.
                // 신 쿼리는 idx_restaurant_board_hits 인덱스를 타 동점 순서가 달라지므로, 원본 관측 순서(boardIdx ASC)를 2차 정렬로 고정한다.
                orderBy: [{ boardHits: 'desc' }, { boardIdx: 'asc' }],
                take: 10,
            });

            const idxList = boards.filter((b) => b.restaurantIdx != null).map((b) => b.restaurantIdx as bigint);
            const infos = idxList.length > 0
                ? await this.prisma.restaurantInfo.findMany({
                    where: { restaurantIdx: { in: idxList } },
                    select: { restaurantIdx: true, restaurantName: true, restaurantAddr: true },
                })
                : [];
            const infoMap = new Map(infos.map((i) => [String(i.restaurantIdx), i]));

            logger.info(`[getTopRestaurantComments] Found ${boards.length} top restaurant boards by hits`);
            return boards.map((b) => {
                const info = b.restaurantIdx != null ? infoMap.get(String(b.restaurantIdx)) : undefined;
                return {
                    boardIdx: b.boardIdx,
                    boardTitle: b.boardTitle,
                    boardContent: b.boardContent,
                    boardID: b.boardID,
                    boardRegDate: b.boardRegDate,
                    boardLike: b.boardLike,
                    boardHits: b.boardHits,
                    restaurantIdx: b.restaurantIdx,
                    restaurant: info ? { restaurantName: info.restaurantName, restaurantAddr: info.restaurantAddr } : null,
                };
            });
        } catch (error) {
            logger.error(`[getTopRestaurantComments] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 후기 상세 조회
    // NOTE: 원본은 include에 belongsTo 별칭('restaurant')을 누락해 항상 500이던 DEAD PATH.
    //       의도된 스펙(상세 + 식당 정보 + 댓글 + 조회수 증가)대로 구현한다. DEVIATIONS.md 참조.
    async getRestaurantBoardDetail(boardIdx: any) {
        try {
            const board = await this.prisma.restaurantBoard.findFirst({
                where: { boardIdx: Number(boardIdx) },
                select: {
                    boardIdx: true,
                    boardTitle: true,
                    boardContent: true,
                    boardID: true,
                    boardRegDate: true,
                    boardLike: true,
                    boardHits: true,
                    restaurantIdx: true,
                },
            });

            if (!board) {
                throw new Error('Board not found');
            }

            const info = board.restaurantIdx != null
                ? await this.prisma.restaurantInfo.findFirst({
                    where: { restaurantIdx: board.restaurantIdx },
                    select: { restaurantName: true, restaurantAddr: true, restaurantLocation: true },
                })
                : null;

            const comments = await this.prisma.restaurantComment.findMany({
                where: { boardIdx: Number(boardIdx) },
                select: { commentIdx: true, commentContent: true, writerId: true, regDate: true, commentLike: true },
                orderBy: { regDate: 'asc' }, // 댓글은 시간순으로 정렬
            });

            // 조회수 증가
            await this.prisma.restaurantBoard.updateMany({
                where: { boardIdx: Number(boardIdx) },
                data: { boardHits: { increment: 1 } },
            });

            logger.info(`[getRestaurantBoardDetail] Board detail retrieved. BoardIdx: ${boardIdx}`);
            return {
                boardIdx: board.boardIdx,
                boardTitle: board.boardTitle,
                boardContent: board.boardContent,
                boardID: board.boardID,
                boardRegDate: board.boardRegDate,
                boardLike: board.boardLike,
                boardHits: board.boardHits,
                restaurantIdx: board.restaurantIdx,
                restaurant: info
                    ? { restaurantName: info.restaurantName, restaurantAddr: info.restaurantAddr, restaurantLocation: info.restaurantLocation }
                    : null,
                RestaurantComments: comments.map((c) => ({
                    commentIdx: c.commentIdx,
                    commentContent: c.commentContent,
                    writerId: c.writerId,
                    regDate: c.regDate,
                    commentLike: c.commentLike,
                })),
            };
        } catch (error) {
            logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 게시판 좋아요 조회
    async getRestaurantBoardLike(boardIdx: any) {
        try {
            const board = await this.prisma.restaurantBoard.findFirst({
                where: { boardIdx: Number(boardIdx) },
                select: { boardIdx: true, boardLike: true },
            });

            if (!board) {
                throw new Error('Board not found');
            }

            logger.info(`[getRestaurantBoardLike] Board like count retrieved. BoardIdx: ${boardIdx}, LikeCount: ${board.boardLike}`);
            return { boardIdx: board.boardIdx, boardLike: board.boardLike };
        } catch (error) {
            logger.error(`[getRestaurantBoardLike] Error: ${error.message}`);
            throw error;
        }
    }

    // 랜덤 식당 추천 (비결정적 — 패리티 케이스에서 제외)
    async getRandomRestaurant(type: any) {
        try {
            const whereClause: Record<string, any> = { restaurantStatus: 1 };
            if (type && type.trim() !== '' && type !== '전체') {
                whereClause.restaurantType = { contains: type.trim() };
            }

            const candidates = await this.prisma.restaurantInfo.findMany({
                where: whereClause,
                select: { restaurantIdx: true },
            });

            if (candidates.length === 0) {
                logger.info(`[getRandomRestaurant] No restaurant found for type: ${type || '전체'}`);
                return null;
            }

            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const restaurant = await this.prisma.restaurantInfo.findFirst({
                where: { restaurantIdx: pick.restaurantIdx },
            });

            if (!restaurant) {
                return null;
            }

            const ratingResult = await this.prisma.restaurantBoard.aggregate({
                where: { restaurantIdx: restaurant.restaurantIdx },
                _avg: { boardRating: true },
                _count: { boardRating: true },
            });

            const result: any = mapRestaurant(restaurant);
            result.averageRating = ratingResult._avg.boardRating != null
                ? parseFloat(Number(ratingResult._avg.boardRating).toFixed(1))
                : null;
            result.ratingCount = ratingResult._count.boardRating || 0;

            logger.info(`[getRandomRestaurant] Random pick: ${result.restaurantName} (type: ${type || '전체'})`);
            return result;
        } catch (error) {
            logger.error(`[getRandomRestaurant] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 지역 목록 조회 (시/도 → 구/군 계층 구조)
    async getRestaurantLocations() {
        try {
            const restaurants = await this.prisma.restaurantInfo.findMany({
                where: { restaurantStatus: 1 },
                select: { restaurantAddr: true },
            });

            // 주소에서 시/도 + 구/군 추출하여 집계
            const cityMap: Record<string, Record<string, number>> = {};

            for (const r of restaurants) {
                const parsed = parseCityDistrict(r.restaurantAddr);
                if (!parsed) continue;
                const { city, district } = parsed;

                if (!cityMap[city]) cityMap[city] = {};
                cityMap[city][district] = (cityMap[city][district] || 0) + 1;
            }

            // 정렬된 구조로 변환
            const result = Object.entries(cityMap)
                .map(([city, districts]) => ({
                    city,
                    count: Object.values(districts).reduce((a, b) => a + b, 0),
                    districts: Object.entries(districts)
                        .map(([district, count]) => ({ district, count }))
                        .sort((a, b) => b.count - a.count),
                }))
                .sort((a, b) => b.count - a.count);

            logger.info(`[getRestaurantLocations] Found ${result.length} cities`);
            return result;
        } catch (error) {
            logger.error(`[getRestaurantLocations] Error: ${error.message}`);
            throw error;
        }
    }

    // 지역별 핫플레이스용 경량 목록 (맛잘알 메인)
    // 메인이 GET /restaurant 전체(7천여 행·메뉴 포함 7MB)를 받아 지역별 TOP N 과 인기 후기 식당 좌표만 쓰던 것을,
    // 필요한 컬럼만 조회하고 실제로 쓰이는 식당만 남겨 보낸다. 필드명·순서(restaurantName ASC)는 /restaurant 와 동일.
    // 평점 필드는 넣지 않는다 — 프론트 도시별 정렬이 평점 우선이라, 넣으면 기존 목록 순서가 바뀐다.
    async getHotplaces(limit = 10) {
        try {
            const [rows, topBoards] = await Promise.all([
                this.prisma.restaurantInfo.findMany({
                    where: { restaurantStatus: 1 },
                    orderBy: { restaurantName: 'asc' },
                    select: {
                        restaurantIdx: true,
                        restaurantName: true,
                        restaurantType: true,
                        restaurantAddr: true,
                        restaurantLatX: true,
                        restaurantLatY: true,
                        restaurantViewCount: true,
                    },
                }),
                // 인기 후기 TOP10 과 같은 기준 (getTopRestaurantComments)
                this.prisma.restaurantBoard.findMany({
                    select: { restaurantIdx: true },
                    orderBy: [{ boardHits: 'desc' }, { boardIdx: 'asc' }],
                    take: 10,
                }),
            ]);

            // 지역 칩 후보 = 지역 목록(getRestaurantLocations)에 나오는 모든 도시
            const cities = new Set<string>();
            for (const r of rows) {
                const parsed = parseCityDistrict(r.restaurantAddr);
                if (parsed) cities.add(parsed.city);
            }
            const reviewIdx = topBoards.filter((b) => b.restaurantIdx != null).map((b) => String(b.restaurantIdx));

            const result = selectHotplaceRows(rows, [...cities], limit, reviewIdx);
            logger.info(`[getHotplaces] ${rows.length} → ${result.length} restaurants (cities=${cities.size}, limit=${limit})`);
            return result;
        } catch (error) {
            logger.error(`[getHotplaces] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 자동 완성 검색
    async autoComplete(keyword: string) {
        try {
            const restaurants = await this.prisma.restaurantInfo.findMany({
                where: {
                    restaurantName: { not: '', contains: keyword },
                    restaurantStatus: 1, // 활성화된 식당만
                },
                orderBy: { restaurantName: 'asc' },
                take: 10, // 최대 10개까지만
                select: { restaurantName: true, restaurantAddr: true, restaurantOwner: true, restaurantType: true },
            });

            logger.info(`[autoComplete] Found ${restaurants.length} restaurants for keyword: "${keyword}"`);
            return restaurants.map((r) => ({
                restaurantName: r.restaurantName,
                restaurantAddr: r.restaurantAddr,
                restaurantOwner: r.restaurantOwner,
                restaurantType: r.restaurantType,
            }));
        } catch (error) {
            logger.error(`[autoComplete] Error: ${error.message}`);
            throw error;
        }
    }

    // 식당 카테고리(업종) 목록 조회
    async getRestaurantTypes() {
        try {
            // 원본은 GROUP BY restaurantType ORDER BY COUNT DESC(2차 키 없음). 동점 count의 순서는
            // 원본에서도 실행마다 뒤바뀌는 비결정적 순서라 프론트 계약이 아니다(DEVIATIONS.md 참조).
            // 신 API는 재현성을 위해 동점 시 restaurantType ASC로 2차 정렬해 결정적으로 만든다
            // (원본보다 안정적이며 {type,count} 집합은 동일). 패리티는 순서 무관(unordered)으로 비교한다.
            // COUNT(BIGINT)는 전역 직렬화 정책상 문자열이어야 하므로 serializeRows로 BigInt→문자열 변환.
            const types = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(
                `SELECT restaurantType, COUNT(restaurantIdx) AS count
                 FROM tb_restaurant_info
                 WHERE restaurantStatus = 1
                 GROUP BY restaurantType
                 ORDER BY COUNT(restaurantIdx) DESC, restaurantType ASC`
            ));

            logger.info(`[getRestaurantTypes] Found ${types.length} restaurant types`);
            return types;
        } catch (error) {
            logger.error(`[getRestaurantTypes] Error: ${error.message}`);
            throw error;
        }
    }
}
