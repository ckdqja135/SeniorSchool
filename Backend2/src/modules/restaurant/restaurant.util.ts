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

// 시/도명 정규화 (서울특별시/서울시/서울 → 서울). 목록에 없는 값은 원문 그대로
const CITY_NAMES = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
export function normalizeCity(raw: string): string {
    const s = raw.replace(/특별시|광역시|특별자치시|특별자치도/g, '').replace(/도$|시$/, '');
    return CITY_NAMES.includes(s) ? s : raw;
}

// 주소 → { city, district }. 둘 중 하나라도 없으면 null (지역 목록 집계 규칙)
export function parseCityDistrict(rawAddr: string | null | undefined): { city: string; district: string } | null {
    const addr = (rawAddr || '').trim();
    if (!addr) return null;
    const parts = addr.split(' ');
    const city = normalizeCity(parts[0] || '');
    const district = parts[1] || '';
    if (!city || !district) return null;
    return { city, district };
}

// 프론트 핫플 지역 칩의 주소 매칭 규칙과 동일 (HotplaceList.tsx / matzal-al-mentor page.tsx)
function addrMatchesCity(addr: string, city: string): boolean {
    const base = city.replace(/특별시|광역시|특별자치시|특별자치도/, '').replace(/도$|시$/, '');
    return addr.includes(city) || (!!base && addr.includes(base));
}

/**
 * 맛잘알 메인이 GET /restaurant 전체 목록에서 실제로 꺼내 쓰던 식당만 남긴다.
 * rows 는 /restaurant 와 같은 restaurantName ASC 순이어야 한다.
 * 각 화면 규칙의 상위 limit 개를 모두 포함하고 원래 순서를 유지하므로,
 * 결과에 프론트의 기존 필터·안정 정렬·slice 를 적용하면 전체 목록에 적용한 것과 같은 결과가 나온다.
 *  - 전국: 조회수순 limit
 *  - 도시별(탐색 탭): 주소 매칭 후 조회수순 limit
 *  - 도시별(카드 탭): 주소 매칭 후 원래 순서 앞 limit (평점 필드가 없어 정렬 키가 모두 0)
 *  - extraIdx: 인기 후기의 식당 (후기 탭 지도 이동 버튼이 좌표를 찾는 용도)
 */
export function selectHotplaceRows<T extends { restaurantIdx: any; restaurantAddr: string | null; restaurantViewCount: number }>(
    rows: T[],
    cities: string[],
    limit: number,
    extraIdx: string[],
): T[] {
    const keep = new Set<string>(extraIdx);
    const add = (list: T[]) => list.forEach((r) => keep.add(String(r.restaurantIdx)));
    const topByViews = (list: T[]) =>
        [...list].sort((a, b) => (b.restaurantViewCount || 0) - (a.restaurantViewCount || 0)).slice(0, limit);

    add(topByViews(rows));
    for (const city of cities) {
        const matched = rows.filter((r) => addrMatchesCity(r.restaurantAddr || '', city));
        add(matched.slice(0, limit));
        add(topByViews(matched));
    }
    return rows.filter((r) => keep.has(String(r.restaurantIdx)));
}

// RestaurantBoard Prisma row → 구 스택 형태 (boardRating DECIMAL → 문자열, 키 순서 보존)
export function mapBoard(b: any): any {
    return { ...b, boardRating: formatRating(b.boardRating) };
}
