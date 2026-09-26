// 크롤러 공용 주소 정규화.
//
// 소스마다 시/도 표기가 달라서 중복 판정이 실패한다.
// 카카오는 "서울 동작구 …", 네이버는 "서울특별시 동작구 …" 를 준다.
// 저장 전에 시/도를 정식명(긴 형태)으로 통일해 두 소스가 같은 문자열이 되게 한다.
//
// 원래 company-crawler.service.ts 안에 있던 것을 식당 크롤러와 같이 쓰려고 꺼냈다.
// 표시·필터용으로 반대 방향(긴 형태 → 짧은 형태)을 쓰는 곳이 따로 있다
// (`modules/restaurant/restaurant.util.ts` 의 normalizeCity). 목적이 다르니 섞지 않는다.

/** 시/도 표기 → 정식 행정구역명 (저장용) */
export const PROVINCE_LONG: Record<string, string> = {
    '서울': '서울특별시', '서울시': '서울특별시', '서울특별시': '서울특별시',
    '부산': '부산광역시', '부산시': '부산광역시', '부산광역시': '부산광역시',
    '대구': '대구광역시', '대구시': '대구광역시', '대구광역시': '대구광역시',
    '인천': '인천광역시', '인천시': '인천광역시', '인천광역시': '인천광역시',
    '광주': '광주광역시', '광주시': '광주광역시', '광주광역시': '광주광역시',
    '대전': '대전광역시', '대전시': '대전광역시', '대전광역시': '대전광역시',
    '울산': '울산광역시', '울산시': '울산광역시', '울산광역시': '울산광역시',
    '세종': '세종특별자치시', '세종시': '세종특별자치시', '세종특별자치시': '세종특별자치시',
    '경기': '경기도', '경기도': '경기도',
    '강원': '강원특별자치도', '강원도': '강원특별자치도', '강원특별자치도': '강원특별자치도',
    '충북': '충청북도', '충청북도': '충청북도',
    '충남': '충청남도', '충청남도': '충청남도',
    '전북': '전북특별자치도', '전라북도': '전북특별자치도', '전북특별자치도': '전북특별자치도',
    '전남': '전라남도', '전라남도': '전라남도',
    '경북': '경상북도', '경상북도': '경상북도',
    '경남': '경상남도', '경상남도': '경상남도',
    '제주': '제주특별자치도', '제주도': '제주특별자치도', '제주특별자치도': '제주특별자치도',
};

/** 정식 행정구역명 → 짧은 형태 (REGION_COORDS 키, 지역 드롭다운과 일치) */
export const PROVINCE_SHORT: Record<string, string> = {
    '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
    '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
    '경기도': '경기', '강원특별자치도': '강원', '충청북도': '충북', '충청남도': '충남',
    '전북특별자치도': '전북', '전라남도': '전남', '경상북도': '경북', '경상남도': '경남',
    '제주특별자치도': '제주',
};

/** 시/도 prefix 를 정식명으로 바꾸고 공백을 정리한다. 모르는 표기는 그대로 둔다 */
export function normalizeAddress(rawAddr: any): string {
    if (!rawAddr || typeof rawAddr !== 'string') return '';
    const trimmed = rawAddr.replace(/\s+/g, ' ').trim();
    const firstToken = trimmed.split(' ')[0];
    const longForm = PROVINCE_LONG[firstToken];
    if (!longForm) return trimmed;
    return (longForm + ' ' + trimmed.slice(firstToken.length).trimStart()).trim();
}

/** 정규화된 주소에서 시/도만 짧은 형태로 (기업 crawler 의 compLocate 용) */
export function extractLocate(normalizedAddr: any): string {
    const firstToken = (normalizedAddr || '').split(' ')[0];
    return PROVINCE_SHORT[firstToken] || firstToken || '미정';
}

/**
 * 정규화된 주소에서 "시/도 시군구" 를 짧은 형태로 (식당 crawler 의 restaurantLocation 용).
 * 예: "서울특별시 동작구 …" → "서울 동작구".
 * 기존 동작(주소 앞 두 토큰)을 유지하되 시/도 표기만 통일해, 소스가 달라도 같은 값이 나오게 한다.
 */
export function extractRegionLabel(normalizedAddr: any): string {
    const parts = (normalizedAddr || '').split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    const province = PROVINCE_SHORT[parts[0]] || parts[0];
    return parts.length > 1 ? `${province} ${parts[1]}` : province;
}

/** 중복 판정용 키. 이름과 주소를 같은 기준으로 맞춘다 */
export function dedupKey(name: any, addr: any): string {
    const n = (name || '').replace(/\s+/g, '').trim();
    return `${n}_${normalizeAddress(addr)}`;
}

/** 두 좌표가 같은 가게로 볼 만큼 가까운지 (약 50m). findExisting 이 쓰던 기준 */
export function isNearby(
    aLat: number, aLng: number, bLat: number, bLng: number,
): boolean {
    if (!aLat || !aLng || !bLat || !bLng) return false;
    return Math.abs(aLat - bLat) <= 0.0005 && Math.abs(aLng - bLng) <= 0.0006;
}
