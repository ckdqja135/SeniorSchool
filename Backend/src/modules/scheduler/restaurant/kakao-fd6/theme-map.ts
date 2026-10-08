/**
 * 카카오 category_name → 테마 태그 매핑 표.
 *
 * category_name 은 "음식점 > 한식 > 육류,고기 > 삼겹살" 처럼 단계가 ' > ' 로 이어진 문자열이다.
 * 표의 키워드가 category_name 의 어느 단계에든 들어 있으면 그 테마를 붙인다 (여러 개 가능).
 * 하나도 안 맞으면 '기타'.
 *
 * 테마를 늘리거나 키워드를 고칠 때는 이 표만 바꾸면 된다 (크롤러와 수집 스크립트가 같이 쓴다).
 * 이미 저장된 행은 바뀌지 않으므로, 표를 바꾼 뒤 저장분에 반영하려면 원본(restaurantCategory)으로 다시 계산한다.
 */

export const THEME_ETC = '기타';

/** [테마, 키워드들] — 위에서부터 순서대로 붙는다 (태그 순서도 이 순서) */
export const THEME_KEYWORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['한식', ['한식', '한정식', '쌈밥', '죽', '두부', '기사식당']],
    ['중식', ['중식', '중국요리', '양꼬치', '마라탕', '딤섬']],
    ['일식', ['일식', '초밥', '롤', '돈까스', '일본식', '이자카야', '오니기리', '덮밥']],
    ['양식', ['양식', '이탈리안', '프랑스', '스페인', '멕시칸', '스테이크', '파스타', '패밀리레스토랑']],
    ['아시아', ['아시아', '베트남', '태국', '인도', '쌀국수', '중동', '터키']],
    ['분식', ['분식', '떡볶이', '김밥', '순대', '라볶이']],
    ['치킨', ['치킨', '닭강정']],
    // '토스트'는 넣지 않는다 — 카카오가 토스트 가게를 '간식'으로 분류해 카페·디저트로 이미 잡힌다
    ['패스트푸드', ['패스트푸드', '피자', '햄버거', '핫도그', '샌드위치']],
    ['고기', ['육류', '고기', '갈비', '삼겹살', '곱창', '막창', '족발', '보쌈', '닭갈비', '닭요리', '오리', '양고기', '정육식당', '바베큐']],
    ['해산물', ['해물', '생선', '회', '조개', '게,대게', '대게', '장어', '굴,전복', '복어', '아구', '매운탕', '해물탕', '참치', '랍스타']],
    ['국물요리', ['국밥', '해장국', '곰탕', '설렁탕', '감자탕', '찌개', '전골', '샤브샤브', '추어', '삼계탕', '순대국']],
    ['면요리', ['국수', '냉면', '칼국수', '우동', '라면', '수제비', '막국수', '소바']],
    ['술집', ['술집', '호프', '요리주점', '포장마차', '와인', '칵테일', '오뎅바', '전통주', '맥주', '바(BAR)']],
    ['카페·디저트', ['카페', '간식', '제과', '베이커리', '디저트', '아이스크림', '도넛', '떡,한과', '와플', '초콜릿', '빙수']],
    ['뷔페', ['뷔페']],
    ['샐러드·건강식', ['샐러드', '비건', '채식', '포케']],
    ['도시락', ['도시락']],
];

/**
 * category_name 의 단계들 (첫 단계 '음식점' 은 뺀다).
 * 키워드를 문자열 전체에 그냥 includes 하면 '회'가 '회관', '롤'이 '롤링' 같은 상호성 단어에 걸리므로,
 * 단계 이름(쉼표로 묶인 하위 이름까지)을 토큰으로 쪼개 토큰 단위로 비교한다.
 */
function categoryTokens(categoryName: string): string[] {
    const steps = (categoryName || '')
        .split('>')
        .map((s) => s.trim())
        .filter(Boolean);
    const rest = steps[0] === '음식점' ? steps.slice(1) : steps;
    const tokens: string[] = [];
    for (const step of rest) {
        tokens.push(step);
        // '육류,고기' · '게,대게' 처럼 쉼표로 묶인 단계는 각각도 토큰으로
        if (step.includes(',')) tokens.push(...step.split(',').map((s) => s.trim()).filter(Boolean));
    }
    return tokens;
}

/** 키워드가 토큰과 맞는지 — 같거나, 토큰이 키워드로 시작·끝나는 경우 ('일본식라면' ← '일본식', '라면') */
function tokenMatches(token: string, keyword: string): boolean {
    if (token === keyword) return true;
    // 한 글자 키워드('회','죽','롤')는 정확히 같을 때만 — 접두/접미로 보면 엉뚱한 단계에 걸린다
    if (keyword.length < 2) return false;
    return token.startsWith(keyword) || token.endsWith(keyword);
}

/** category_name → 테마 태그 배열. 매칭 없으면 ['기타'] */
export function themesOf(categoryName: string): string[] {
    const tokens = categoryTokens(categoryName);
    const out: string[] = [];
    for (const [theme, keywords] of THEME_KEYWORDS) {
        if (keywords.some((k) => tokens.some((t) => tokenMatches(t, k)))) out.push(theme);
    }
    return out.length > 0 ? out : [THEME_ETC];
}

/** 저장용 문자열 (쉼표 구분). 컬럼 길이(100)를 넘지 않게 자른다 — 태그 단위로 잘라 깨진 태그가 남지 않게 */
export function themeLabel(categoryName: string, maxLen = 100): string {
    const tags = themesOf(categoryName);
    let s = '';
    for (const t of tags) {
        const next = s ? `${s},${t}` : t;
        if (next.length > maxLen) break;
        s = next;
    }
    return s;
}
