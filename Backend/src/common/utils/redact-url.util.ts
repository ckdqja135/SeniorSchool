// 로그용 요청 주소 정리.
//
// 맛잘알 지도의 '내 주변 식당'은 이용자 현재 위치를 쿼리(lat/lng)로 보낸다.
// 요청 로그는 90일 보관되므로 주소를 그대로 남기면 이용자 위치가 쌓인다.
// 위치 쿼리 값은 '*' 로 바꿔 남긴다 (어떤 파라미터가 왔는지는 보이게, 값은 남지 않게).
// 처리방침(/privacy)에 '위치는 저장하지 않는다'고 적었으므로 요청 주소를 로그에 남기는 곳은 모두 이걸 거친다.

/** 로그에 값을 남기지 않을 쿼리 이름 (소문자) */
const LOCATION_QUERY_KEYS = new Set(['lat', 'lng', 'lon', 'latitude', 'longitude']);

export function redactUrl(url: string | undefined | null): string {
    const s = String(url ?? '');
    const q = s.indexOf('?');
    if (q < 0) return s;
    const [query, hash = ''] = s.slice(q + 1).split('#');
    const parts = query.split('&').map((pair) => {
        const eq = pair.indexOf('=');
        const rawKey = eq < 0 ? pair : pair.slice(0, eq);
        let key = rawKey;
        try { key = decodeURIComponent(rawKey); } catch { /* 깨진 인코딩은 원문 그대로 비교 */ }
        return LOCATION_QUERY_KEYS.has(key.toLowerCase()) ? `${rawKey}=*` : pair;
    });
    return `${s.slice(0, q)}?${parts.join('&')}${hash ? `#${hash}` : ''}`;
}
