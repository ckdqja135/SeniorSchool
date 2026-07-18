// 맛잘알(restaurant) 공통 변환 헬퍼.
// 구 스택(Sequelize + mariadb 드라이버)의 JSON 출력 형태를 Prisma 결과에서 재현한다.
//  - restaurantMenu: TEXT 컬럼이지만 Sequelize 커스텀 getter가 JSON.parse 후 결과를
//    최상단 키로 hoisting하므로(모델 get()이 커스텀 getter를 먼저 채운다) 동일하게 맨 앞에 둔다.
//  - restaurantRating / boardRating: DECIMAL(2,1) → 구 스택은 "4.0" 같은 문자열. Prisma는 Prisma.Decimal →
//    .toFixed(1)로 동일 형태 변환(comp 모듈과 동일).
//  - BigInt(restaurantIdx/boardIdx/boardLike/boardHits 등)는 전역 json replacer가 문자열화하므로 그대로 둔다.

// restaurantMenu getter: JSON.parse, 실패/빈 값이면 null
export function parseRestaurantMenu(raw: string | null | undefined): any {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// DECIMAL(2,1) → "4.0" 형태 문자열 (구 스택 bigNumberStrings 동작 재현)
export function formatRating(v: any): string | null {
    return v != null ? v.toFixed(1) : null;
}

// RestaurantInfo Prisma row → Sequelize toJSON() 형태 (restaurantMenu가 맨 앞)
export function mapRestaurant(r: any): any {
    return {
        restaurantMenu: parseRestaurantMenu(r.restaurantMenu),
        restaurantIdx: r.restaurantIdx,
        restaurantName: r.restaurantName,
        restaurantLocation: r.restaurantLocation,
        restaurantType: r.restaurantType,
        restaurantEstablished: r.restaurantEstablished,
        restaurantOwner: r.restaurantOwner,
        restaurantLatX: r.restaurantLatX,
        restaurantLatY: r.restaurantLatY,
        restaurantURL: r.restaurantURL,
        restaurantLotAddr: r.restaurantLotAddr,
        restaurantAddr: r.restaurantAddr,
        restaurantMapIMG: r.restaurantMapIMG,
        restaurantImage: r.restaurantImage,
        restaurantRating: formatRating(r.restaurantRating),
        restaurantStatus: r.restaurantStatus,
        restaurantViewCount: r.restaurantViewCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}

// RestaurantBoard Prisma row → 구 스택 형태 (boardRating DECIMAL → 문자열, 키 순서 보존)
export function mapBoard(b: any): any {
    return { ...b, boardRating: formatRating(b.boardRating) };
}
