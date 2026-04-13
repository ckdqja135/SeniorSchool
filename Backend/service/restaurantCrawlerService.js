/**
 * 맛집 데이터 통합 크롤러 서비스
 * 카카오, 네이버, 구글맵, 식신 등 여러 소스에서 맛집 데이터를 수집하여 DB에 저장
 */

const axios = require('axios');
const { RestaurantInfo, sequelize } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// ─── 공통 매핑 함수 ─────────────────────────────────────────
function normalizeToRestaurant(raw) {
    const addr = raw.addr || '';
    const location = addr ? addr.split(' ').slice(0, 2).join(' ') : '';
    return {
        restaurantName: (raw.name || '').slice(0, 60),
        restaurantLocation: location.slice(0, 45),
        restaurantType: (raw.type || '음식점').slice(0, 45),
        restaurantEstablished: raw.established || '미정',
        restaurantOwner: (raw.owner || '미정').slice(0, 45),
        restaurantLatX: raw.lat || 0,       // 위도
        restaurantLatY: raw.lng || 0,       // 경도
        restaurantURL: (raw.url || '').slice(0, 200),
        restaurantLotAddr: (raw.lotAddr || '').slice(0, 100),
        restaurantAddr: addr.slice(0, 200),
        restaurantMapIMG: null,
        restaurantImage: raw.image || null,
        restaurantRating: raw.rating ? Math.round(parseFloat(raw.rating) * 2) / 2 : null,
        restaurantMenu: raw.menu || null,   // 메뉴 JSON 배열: [{name, price}]
        _source: raw.source,                // 크롤링 출처 (DB 저장 X, 로그용)
        _sourceId: raw.sourceId || null,    // 출처 고유 ID (중복 체크용)
    };
}

// ─── 지역별 주요 거점 좌표 ───────────────────────────────────
const REGION_COORDS = {
    '서울': [
        { name: '시청/광화문', lat: 37.5665, lng: 126.9780 },
        { name: '강남/역삼', lat: 37.4979, lng: 127.0276 },
        { name: '홍대/마포', lat: 37.5563, lng: 126.9236 },
        { name: '송파/잠실', lat: 37.5145, lng: 127.1060 },
        { name: '종로/동대문', lat: 37.5704, lng: 127.0090 },
        { name: '영등포/여의도', lat: 37.5247, lng: 126.9265 },
        { name: '성북/노원', lat: 37.6320, lng: 127.0574 },
    ],
    '부산': [
        { name: '서면', lat: 35.1580, lng: 129.0596 },
        { name: '해운대', lat: 35.1631, lng: 129.1637 },
        { name: '남포동', lat: 35.0975, lng: 129.0365 },
    ],
    '대구': [
        { name: '동성로', lat: 35.8682, lng: 128.5964 },
        { name: '수성구', lat: 35.8286, lng: 128.6381 },
    ],
    '인천': [
        { name: '부평', lat: 37.5076, lng: 126.7219 },
        { name: '송도', lat: 37.3818, lng: 126.6568 },
    ],
    '대전': [{ name: '둔산', lat: 36.3504, lng: 127.3845 }],
    '광주': [{ name: '충장로', lat: 35.1468, lng: 126.9167 }],
    '울산': [{ name: '성남동', lat: 35.5563, lng: 129.3135 }],
    '세종': [{ name: '세종시', lat: 36.4800, lng: 127.2550 }],
    '경기': [
        { name: '수원', lat: 37.2636, lng: 127.0286 },
        { name: '성남/분당', lat: 37.3595, lng: 127.1132 },
    ],
    '강원': [{ name: '춘천', lat: 37.8813, lng: 127.7298 }],
    '충북': [{ name: '청주', lat: 36.6358, lng: 127.4913 }],
    '충남': [{ name: '천안', lat: 36.8151, lng: 127.1139 }],
    '전북': [{ name: '전주', lat: 35.8242, lng: 127.1480 }],
    '전남': [{ name: '여수', lat: 34.7604, lng: 127.6622 }],
    '경북': [{ name: '포항', lat: 36.0190, lng: 129.3435 }],
    '경남': [{ name: '창원', lat: 35.2270, lng: 128.6811 }],
    '제주': [
        { name: '제주시', lat: 33.4996, lng: 126.5312 },
        { name: '서귀포', lat: 33.2530, lng: 126.5601 },
    ],
};

// ─── 1) 카카오 Local API ─────────────────────────────────────
async function fetchFromKakao({ query = '맛집', lat, lng, radius = 20000, count = 50, region = '' }) {
    const key = process.env.KAKAO_REST_API_KEY;
    if (!key) {
        logger.warn('[Crawler:Kakao] KAKAO_REST_API_KEY 미설정, 스킵');
        return [];
    }

    const headers = { Authorization: `KakaoAK ${key}` };
    const results = [];
    const seen = new Set();

    // 좌표가 직접 지정되면 단일 좌표 검색, 아니면 지역 거점 분산 검색
    let searchPoints;
    if (lat && lng) {
        searchPoints = [{ lat, lng }];
    } else {
        // region에서 매칭되는 거점 좌표 찾기
        const regionKey = Object.keys(REGION_COORDS).find(k => region.includes(k));
        searchPoints = regionKey ? REGION_COORDS[regionKey] : [{ lat: 37.5665, lng: 126.9780 }];
    }

    const countPerPoint = Math.ceil(count / searchPoints.length);

    for (const point of searchPoints) {
        if (results.length >= count) break;

        // 카테고리 검색 (FD6: 음식점)
        let page = 1;
        const pointTarget = Math.min(countPerPoint, count - results.length);
        let pointCount = 0;

        while (pointCount < pointTarget && page <= 45) {
            try {
                const { data } = await axios.get('https://dapi.kakao.com/v2/local/search/category.json', {
                    headers,
                    params: {
                        category_group_code: 'FD6',
                        x: point.lng, y: point.lat, radius,
                        page, size: 15,
                        sort: 'accuracy'
                    }
                });

                for (const d of (data.documents || [])) {
                    if (seen.has(d.id)) continue;
                    seen.add(d.id);

                    const typeRaw = (d.category_name || '').split(' > ');
                    results.push(normalizeToRestaurant({
                        name: d.place_name,
                        addr: d.road_address_name || d.address_name || '',
                        lotAddr: d.address_name || '',
                        type: typeRaw[1] || typeRaw[0] || '음식점',
                        lat: parseFloat(d.y),
                        lng: parseFloat(d.x),
                        url: d.place_url || '',
                        source: 'kakao',
                        sourceId: `kakao_${d.id}`,
                    }));

                    pointCount++;
                    if (pointCount >= pointTarget) break;
                }

                if (data.meta?.is_end) break;
                page++;
            } catch (err) {
                logger.error(`[Crawler:Kakao] ${point.name || 'point'} page ${page} 에러: ${err.message}`);
                break;
            }
        }
    }

    logger.info(`[Crawler:Kakao] ${results.length}건 수집 완료 (거점 ${searchPoints.length}개)`);
    return results;
}

// ─── 2) 네이버 Local Search API ─────────────────────────────
async function fetchFromNaver({ query = '맛집', count = 50 }) {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        logger.warn('[Crawler:Naver] NAVER_CLIENT_ID/SECRET 미설정, 스킵');
        return [];
    }

    const headers = {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
    };

    const results = [];
    const seen = new Set();
    const maxPerRequest = 5;  // 네이버 로컬 API 최대 5개
    let start = 1;

    while (results.length < count && start <= 1000) {
        try {
            const { data } = await axios.get('https://openapi.naver.com/v1/search/local.json', {
                headers,
                params: {
                    query,
                    display: maxPerRequest,
                    start,
                    sort: 'comment'  // 리뷰순
                }
            });

            if (!data.items || data.items.length === 0) break;

            for (const item of data.items) {
                const cleanName = (item.title || '').replace(/<\/?b>/g, '');
                const rawCategory = (item.category || '').toLowerCase();

                // 비음식점 카테고리 필터링
                const excludeCategories = [
                    '쇼핑', '백화점', '마트', '편의점', '문구',
                    '숙박', '호텔', '모텔', '게스트하우스',
                    '병원', '약국', '의원', '치과',
                    '학교', '학원', '교육',
                    '은행', '금융', '보험', '증권',
                    '부동산', '공인중개사',
                    '주유소', '주차장', '세차',
                    '관공서', '우체국', '경찰', '소방',
                ];
                if (excludeCategories.some(ec => rawCategory.includes(ec))) continue;

                const key = `naver_${cleanName}_${item.address}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const coords = convertNaverCoords(item.mapx, item.mapy);

                const category = (item.category || '').split('>').pop()?.trim() || '음식점';

                results.push(normalizeToRestaurant({
                    name: cleanName,
                    addr: item.roadAddress || item.address || '',
                    lotAddr: item.address || '',
                    type: category,
                    lat: coords.lat,
                    lng: coords.lng,
                    url: item.link || '',
                    source: 'naver',
                    sourceId: key,
                }));

                if (results.length >= count) break;
            }

            start += maxPerRequest;
            if (data.total <= start) break;
        } catch (err) {
            logger.error(`[Crawler:Naver] start=${start} 에러: ${err.message}`);
            break;
        }
    }

    logger.info(`[Crawler:Naver] ${results.length}건 수집 완료`);
    return results;
}

/**
 * 네이버 좌표 변환 (WGS84 × 10^7 → WGS84)
 * 네이버 로컬 검색 API의 mapx/mapy는 WGS84 좌표에 10^7을 곱한 정수 형식
 */
function convertNaverCoords(mapx, mapy) {
    if (!mapx || !mapy) return { lat: 0, lng: 0 };
    return { lat: parseInt(mapy, 10) / 10000000, lng: parseInt(mapx, 10) / 10000000 };
}

// ─── 3) Google Places API ────────────────────────────────────
async function fetchFromGoogle({ query = 'restaurant in Seoul', lat = 37.5665, lng = 126.9780, radius = 5000, count = 50 }) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        logger.warn('[Crawler:Google] GOOGLE_MAPS_API_KEY 미설정, 스킵');
        return [];
    }

    const results = [];
    const seen = new Set();
    let nextPageToken = null;

    while (results.length < count) {
        try {
            const params = nextPageToken
                ? { pagetoken: nextPageToken, key: apiKey }
                : {
                    query,
                    location: `${lat},${lng}`,
                    radius,
                    type: 'restaurant',
                    language: 'ko',
                    key: apiKey,
                };

            const { data } = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', { params });

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                logger.error(`[Crawler:Google] API 상태: ${data.status} - ${data.error_message || ''}`);
                break;
            }

            for (const place of (data.results || [])) {
                if (seen.has(place.place_id)) continue;
                seen.add(place.place_id);

                const types = (place.types || []);
                let type = '음식점';
                if (types.includes('cafe')) type = '카페';
                else if (types.includes('bakery')) type = '베이커리';
                else if (types.includes('bar')) type = '술집';

                results.push(normalizeToRestaurant({
                    name: place.name,
                    addr: place.formatted_address || '',
                    type,
                    lat: place.geometry?.location?.lat || 0,
                    lng: place.geometry?.location?.lng || 0,
                    rating: place.rating || null,
                    url: '',
                    source: 'google',
                    sourceId: `google_${place.place_id}`,
                }));

                if (results.length >= count) break;
            }

            nextPageToken = data.next_page_token;
            if (!nextPageToken) break;

            // Google API next_page_token은 약 2초 후 활성화
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
            logger.error(`[Crawler:Google] 에러: ${err.message}`);
            break;
        }
    }

    logger.info(`[Crawler:Google] ${results.length}건 수집 완료`);
    return results;
}

// ─── 4) 식신(Siksin) JSON API 크롤링 ────────────────────────
/**
 * 식신 홈페이지에서 siksinOauth JWT 토큰 추출
 */
async function getSiksinToken() {
    try {
        const { data: html } = await axios.get('https://www.siksinhot.com', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
            timeout: 10000,
        });

        const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
        if (match) {
            const state = JSON.parse(match[1]);
            const token = state?.headers?.siksinOauth || state?.siksinOauth;
            if (token) return token;
        }

        // fallback: script 태그에서 직접 토큰 추출
        const tokenMatch = html.match(/siksinOauth['"]\s*:\s*['"]([^'"]+)['"]/);
        if (tokenMatch) return tokenMatch[1];

        logger.warn('[Crawler:Siksin] OAuth 토큰 추출 실패');
        return null;
    } catch (err) {
        logger.error(`[Crawler:Siksin] 토큰 요청 실패: ${err.message}`);
        return null;
    }
}

/**
 * 식신 메뉴 API에서 특정 식당의 메뉴 목록 조회
 */
async function fetchSiksinMenu(pid, token) {
    try {
        const { data } = await axios.get(`https://api.siksinhot.com/v1/hp/${pid}/menu`, {
            headers: {
                'siksinOauth': token,
                'Origin': 'https://www.siksinhot.com',
                'Referer': 'https://www.siksinhot.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 10000,
        });

        const menuItems = data?.data?.menu || [];
        if (menuItems.length === 0) return null;

        return menuItems.map(m => ({
            name: m.menuNm || '',
            price: m.price || 0,
        })).filter(m => m.name);
    } catch (err) {
        logger.error(`[Crawler:Siksin] 메뉴 조회 실패 (pid=${pid}): ${err.message}`);
        return null;
    }
}

async function fetchFromSiksin({ region = '서울', count = 50 }) {
    const token = await getSiksinToken();
    if (!token) {
        logger.warn('[Crawler:Siksin] 토큰 없이 HTML 방식으로 폴백');
        return fetchFromSiksinFallback({ region, count });
    }

    const results = [];
    const seen = new Set();

    // 지역 ID 매핑 (식신 API에서 사용하는 areaId)
    const AREA_MAP = {
        '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu', '인천': 'Incheon',
        '광주': 'Gwangju', '대전': 'Daejeon', '울산': 'Ulsan', '세종': 'Sejong',
        '경기': 'Gyeonggi', '강원': 'Gangwon', '충북': 'Chungbuk', '충남': 'Chungnam',
        '전북': 'Jeonbuk', '전남': 'Jeonnam', '경북': 'Gyeongbuk', '경남': 'Gyeongnam',
        '제주': 'Jeju',
    };

    const regionKey = Object.keys(AREA_MAP).find(k => region.includes(k));
    const areaId = regionKey ? AREA_MAP[regionKey] : 'Seoul';
    let offset = 0;
    const limit = 20;

    while (results.length < count) {
        try {
            const { data } = await axios.get('https://api.siksinhot.com/v1/hp', {
                headers: {
                    'siksinOauth': token,
                    'Origin': 'https://www.siksinhot.com',
                    'Referer': 'https://www.siksinhot.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                params: {
                    hpAreaId: areaId,
                    limit,
                    offset,
                    sort: 'R',  // 추천순
                },
                timeout: 10000,
            });

            const stores = data?.data?.list || data?.data || [];
            if (!Array.isArray(stores) || stores.length === 0) break;

            for (const store of stores) {
                const name = (store.storNm || store.name || '').trim();
                if (!name) continue;

                const addr = store.addr || store.roadAddr || '';
                const key = `siksin_${name}_${addr}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const pid = store.pid || store.storeId;

                // 목록 API 응답의 인라인 메뉴 정보
                let menu = null;
                if (store.menu && Array.isArray(store.menu) && store.menu.length > 0) {
                    menu = store.menu.map(m => ({
                        name: m.menuNm || '',
                        price: m.price || 0,
                    })).filter(m => m.name);
                }

                // 인라인 메뉴가 없으면 상세 메뉴 API 호출
                if ((!menu || menu.length === 0) && pid) {
                    menu = await fetchSiksinMenu(pid, token);
                }

                const type = store.foodKind || store.category || '음식점';
                const rating = store.score || store.totalScore || null;
                const image = store.mainImg || store.img || null;
                const url = pid ? `https://www.siksinhot.com/P/${pid}` : '';

                results.push(normalizeToRestaurant({
                    name,
                    addr,
                    type,
                    rating,
                    url,
                    image,
                    menu: (menu && menu.length > 0) ? menu : null,
                    source: 'siksin',
                    sourceId: key,
                }));

                if (results.length >= count) break;
            }

            offset += limit;
        } catch (err) {
            logger.error(`[Crawler:Siksin] offset=${offset} 에러: ${err.message}`);
            break;
        }
    }

    logger.info(`[Crawler:Siksin] ${results.length}건 수집 완료 (JSON API)`);
    return results;
}

/**
 * 식신 HTML 폴백 (토큰 추출 실패 시)
 */
async function fetchFromSiksinFallback({ region = '서울', count = 50 }) {
    const results = [];
    const seen = new Set();
    let page = 1;

    while (results.length < count && page <= 10) {
        try {
            const url = `https://www.siksinhot.com/search?keywords=${encodeURIComponent(region + ' 맛집')}&page=${page}`;
            const { data: html } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                timeout: 10000,
            });

            const itemPattern = /<ul class="localFood_list"[^>]*>([\s\S]*?)<\/ul>/g;
            let listHtml = '';
            let listMatch;
            while ((listMatch = itemPattern.exec(html)) !== null) {
                listHtml += listMatch[1];
            }

            const liPattern = /<li>([\s\S]*?)<\/li>/g;
            const blocks = [];
            let liMatch;
            while ((liMatch = liPattern.exec(listHtml)) !== null) {
                blocks.push(liMatch[1]);
            }

            if (blocks.length === 0) {
                if (results.length === 0 && page === 1) {
                    logger.warn('[Crawler:Siksin] HTML 파싱 실패 - 사이트 구조 변경 가능성');
                }
                break;
            }

            for (const block of blocks) {
                const nameMatch = block.match(/<h2>([^<]+)<\/h2>/);
                const ratingMatch = block.match(/<span class="score">([0-9.]+)<\/span>/);
                const linkMatch = block.match(/href="((?:https?:\/\/www\.siksinhot\.com)?\/P\/\d+)"/);
                const altMatch = block.match(/<img[^>]*alt="([^"]+)"[^>]*>/);
                const cateMatch = block.match(/<p class="cate">([\s\S]*?)<\/p>/);
                const imgMatch = block.match(/<img[^>]*src="(https:\/\/img\.siksinhot\.com\/[^"]+)"/);

                const name = nameMatch?.[1]?.trim();
                if (!name) continue;

                let addr = '';
                if (altMatch) {
                    const altParts = altMatch[1].split(' , ');
                    if (altParts.length >= 2) {
                        addr = altParts.slice(1).join(' , ').trim();
                        if (name && addr.endsWith(name)) {
                            addr = addr.slice(0, -name.length).trim();
                        }
                    }
                }

                let type = '음식점';
                if (cateMatch) {
                    const linkPattern = /<a[^>]*href="\/search\?keywords=([^"]+)"[^>]*>([^<]+)<\/a>/g;
                    const foodTypes = [];
                    let lm;
                    while ((lm = linkPattern.exec(cateMatch[1])) !== null) {
                        const keyword = decodeURIComponent(lm[1]);
                        if (!/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s/.test(keyword)) {
                            foodTypes.push(lm[2].trim());
                        }
                    }
                    if (foodTypes.length > 0) {
                        type = foodTypes.join('/');
                    }
                }

                const link = linkMatch?.[1] || '';
                const fullLink = link.startsWith('http') ? link : (link ? `https://www.siksinhot.com${link}` : '');

                const key = `siksin_${name}_${addr}`;
                if (seen.has(key)) continue;
                seen.add(key);

                results.push(normalizeToRestaurant({
                    name,
                    addr,
                    type,
                    rating: ratingMatch?.[1] || null,
                    url: fullLink,
                    image: imgMatch?.[1] || null,
                    source: 'siksin',
                    sourceId: key,
                }));

                if (results.length >= count) break;
            }

            page++;
        } catch (err) {
            logger.error(`[Crawler:Siksin:Fallback] page ${page} 에러: ${err.message}`);
            break;
        }
    }

    logger.info(`[Crawler:Siksin:Fallback] ${results.length}건 수집 완료 (HTML)`);
    return results;
}

// ─── 좌표 보정 (주소 → 카카오 Geocoding) ─────────────────────
async function geocodeByKakao(address) {
    const key = process.env.KAKAO_REST_API_KEY;
    if (!key || !address) return null;

    try {
        const { data } = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
            headers: { Authorization: `KakaoAK ${key}` },
            params: { query: address }
        });

        if (data.documents?.length > 0) {
            const doc = data.documents[0];
            return {
                lat: parseFloat(doc.y),
                lng: parseFloat(doc.x),
            };
        }
    } catch (err) {
        logger.error(`[Crawler:Geocode] ${address} 지오코딩 실패: ${err.message}`);
    }

    return null;
}

// ─── 중복 체크 ───────────────────────────────────────────────
async function isDuplicate(restaurant) {
    const existing = await RestaurantInfo.findOne({
        where: {
            restaurantStatus: 1,
            [Op.or]: [
                // 이름 + 주소 완전 일치
                {
                    restaurantName: restaurant.restaurantName,
                    restaurantAddr: restaurant.restaurantAddr,
                },
                // 이름 + 좌표 근접 (약 50m 이내)
                ...(restaurant.restaurantLatX && restaurant.restaurantLatY ? [{
                    restaurantName: restaurant.restaurantName,
                    restaurantLatX: {
                        [Op.between]: [restaurant.restaurantLatX - 0.0005, restaurant.restaurantLatX + 0.0005]
                    },
                    restaurantLatY: {
                        [Op.between]: [restaurant.restaurantLatY - 0.0006, restaurant.restaurantLatY + 0.0006]
                    },
                }] : []),
            ]
        }
    });

    return !!existing;
}

// ─── 통합 크롤링 실행 ────────────────────────────────────────
/**
 * @param {Object} options
 * @param {string[]} options.sources - 크롤링 소스 ['kakao','naver','google','siksin']
 * @param {string} options.query - 검색 키워드 (기본: '맛집')
 * @param {string} options.region - 지역 (기본: '서울')
 * @param {number} options.lat - 위도 (기본: 서울시청)
 * @param {number} options.lng - 경도
 * @param {number} options.radius - 검색 반경 (m)
 * @param {number} options.countPerSource - 소스별 수집 건수
 * @param {boolean} options.saveToDB - DB 저장 여부
 * @param {boolean} options.dryRun - true이면 수집만 하고 저장 안 함
 */
async function crawlRestaurants(options = {}) {
    const {
        sources = ['kakao', 'naver', 'google', 'siksin'],
        query = '맛집',
        region = '서울',
        lat,
        lng,
        radius = 20000,
        countPerSource = 50,
        saveToDB = true,
        dryRun = false,
    } = options;

    logger.info(`[Crawler] 크롤링 시작 - sources: ${sources.join(',')}, query: ${query}, region: ${region}, count/src: ${countPerSource}`);

    const allResults = [];
    const stats = {
        sources: {},
        totalFetched: 0,
        duplicateSkipped: 0,
        coordFixed: 0,
        saved: 0,
        failed: 0,
    };

    // 각 소스별 병렬 수집
    const fetchPromises = [];

    if (sources.includes('kakao')) {
        fetchPromises.push(
            fetchFromKakao({ query: `${region} ${query}`, ...(lat && lng ? { lat, lng } : {}), radius, count: countPerSource, region })
                .then(r => { stats.sources.kakao = r.length; return r; })
                .catch(e => { logger.error(`[Crawler] 카카오 실패: ${e.message}`); stats.sources.kakao = 0; return []; })
        );
    }

    if (sources.includes('naver')) {
        fetchPromises.push(
            fetchFromNaver({ query: `${region} ${query}`, count: countPerSource })
                .then(r => { stats.sources.naver = r.length; return r; })
                .catch(e => { logger.error(`[Crawler] 네이버 실패: ${e.message}`); stats.sources.naver = 0; return []; })
        );
    }

    if (sources.includes('google')) {
        fetchPromises.push(
            fetchFromGoogle({ query: `${query} in ${region}`, lat, lng, radius, count: countPerSource })
                .then(r => { stats.sources.google = r.length; return r; })
                .catch(e => { logger.error(`[Crawler] 구글 실패: ${e.message}`); stats.sources.google = 0; return []; })
        );
    }

    if (sources.includes('siksin')) {
        fetchPromises.push(
            fetchFromSiksin({ region, count: countPerSource })
                .then(r => { stats.sources.siksin = r.length; return r; })
                .catch(e => { logger.error(`[Crawler] 식신 실패: ${e.message}`); stats.sources.siksin = 0; return []; })
        );
    }

    const sourceResults = await Promise.all(fetchPromises);
    for (const arr of sourceResults) {
        allResults.push(...arr);
    }

    stats.totalFetched = allResults.length;
    logger.info(`[Crawler] 총 ${allResults.length}건 수집 완료, 소스별: ${JSON.stringify(stats.sources)}`);

    // 좌표 보정 (dryRun에서도 실행하여 미리보기에 반영)
    for (const item of allResults) {
        if ((!item.restaurantLatX || !item.restaurantLatY) && item.restaurantAddr) {
            const coords = await geocodeByKakao(item.restaurantAddr);
            if (coords) {
                item.restaurantLatX = coords.lat;
                item.restaurantLatY = coords.lng;
                stats.coordFixed++;
            }
        }
    }

    if (dryRun) {
        logger.info(`[Crawler] dryRun 모드 - DB 저장 건너뜀 (좌표보정: ${stats.coordFixed}건)`);
        return { stats, data: allResults };
    }

    // 중복 체크 + 좌표 보정 + DB 저장
    const savedList = [];

    for (const item of allResults) {
        try {
            // 이름이 없으면 스킵
            if (!item.restaurantName) {
                stats.failed++;
                continue;
            }

            // 중복 체크
            const dup = await isDuplicate(item);
            if (dup) {
                stats.duplicateSkipped++;
                continue;
            }

            if (saveToDB) {
                // restaurantOwner가 '미정'이면 빈값으로는 안 넣되, NOT NULL이니 기본값 유지
                await RestaurantInfo.create({
                    restaurantName: item.restaurantName,
                    restaurantLocation: item.restaurantLocation || '미정',
                    restaurantType: item.restaurantType || '음식점',
                    restaurantEstablished: item.restaurantEstablished || '미정',
                    restaurantOwner: item.restaurantOwner || '미정',
                    restaurantLatX: item.restaurantLatX || 0,
                    restaurantLatY: item.restaurantLatY || 0,
                    restaurantURL: item.restaurantURL || '',
                    restaurantLotAddr: item.restaurantLotAddr || '',
                    restaurantAddr: item.restaurantAddr || '',
                    restaurantMapIMG: item.restaurantMapIMG || null,
                    restaurantImage: item.restaurantImage || null,
                    restaurantRating: item.restaurantRating,
                    restaurantMenu: item.restaurantMenu || null,
                    restaurantStatus: 1,
                    restaurantViewCount: 0,
                });

                savedList.push(item.restaurantName);
                stats.saved++;
            }
        } catch (err) {
            stats.failed++;
            logger.error(`[Crawler] "${item.restaurantName}" 저장 실패: ${err.message}`);
        }
    }

    logger.info(`[Crawler] 완료 - 저장: ${stats.saved}, 중복스킵: ${stats.duplicateSkipped}, 좌표보정: ${stats.coordFixed}, 실패: ${stats.failed}`);

    return { stats, saved: savedList };
}

// ─── 소스별 상태 확인 ────────────────────────────────────────
function getAvailableSources() {
    const sources = [];
    if (process.env.KAKAO_REST_API_KEY) sources.push({ name: 'kakao', label: '카카오', ready: true });
    else sources.push({ name: 'kakao', label: '카카오', ready: false, reason: 'KAKAO_REST_API_KEY 미설정' });

    if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) sources.push({ name: 'naver', label: '네이버', ready: true });
    else sources.push({ name: 'naver', label: '네이버', ready: false, reason: 'NAVER_CLIENT_ID/SECRET 미설정' });

    sources.push({ name: 'siksin', label: '식신', ready: true, note: '웹 크롤링 (API 키 불필요)' });

    return sources;
}

module.exports = {
    crawlRestaurants,
    getAvailableSources,
    fetchFromKakao,
    fetchFromNaver,
    fetchFromGoogle,
    fetchFromSiksin,
};
