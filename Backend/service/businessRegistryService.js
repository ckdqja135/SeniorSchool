/**
 * 국세청 사업자등록정보 진위확인 및 상태조회 서비스
 *   /status   : 휴폐업 상태 조회 (사업자번호만 입력)
 *   /validate : 진위확인 (사업자번호 + 대표자명 + 개업일 등 입력)
 *
 * 공공데이터포털 OpenAPI (POST 메소드, JSON 응답)
 * 인증키: PUBLIC_DATA_API_KEY (Encoding 키 그대로 사용)
 */

const logger = require('../utils/logger');

const FETCH_TIMEOUT = 15000;
// API 정책: status/validate 모두 1회 호출당 최대 100개 사업자번호
const MAX_BATCH = 100;

const STATUS_CODE_LABEL = {
    '01': '계속사업자',
    '02': '휴업자',
    '03': '폐업자',
};

function getApiBase() {
    const base = process.env.NTS_BUSINESS_API_URL;
    const apiKey = process.env.PUBLIC_DATA_API_KEY;
    if (!base || !apiKey) {
        throw new Error('NTS_BUSINESS_API_URL 또는 PUBLIC_DATA_API_KEY 미설정');
    }
    return { base: base.replace(/\/$/, ''), apiKey };
}

// 사업자번호 정규화: 하이픈/공백 제거, 10자리 숫자만
function normalizeBizNo(raw) {
    if (raw == null) return null;
    const digits = String(raw).replace(/\D/g, '');
    return digits.length === 10 ? digits : null;
}

async function postJson(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${text.slice(0, 200)}`);
    }
    return json;
}

/**
 * 휴폐업 상태 조회 (배치)
 * @param {string[]} bizNumbers
 * @returns {Promise<Array<{b_no, b_stt, b_stt_cd, tax_type, isActive}>>}
 *   isActive = b_stt_cd === '01' (계속사업자만 true)
 */
async function checkBusinessStatus(bizNumbers) {
    const { base, apiKey } = getApiBase();
    const normalized = (bizNumbers || []).map(normalizeBizNo).filter(Boolean);
    if (normalized.length === 0) return [];

    const url = `${base}/nts-businessman/v1/status?serviceKey=${apiKey}`;
    const out = [];
    for (let i = 0; i < normalized.length; i += MAX_BATCH) {
        const batch = normalized.slice(i, i + MAX_BATCH);
        try {
            const json = await postJson(url, { b_no: batch });
            const rows = json?.data || [];
            for (const r of rows) {
                out.push({
                    b_no: r.b_no,
                    b_stt: r.b_stt,
                    b_stt_cd: r.b_stt_cd,
                    tax_type: r.tax_type,
                    isActive: r.b_stt_cd === '01',
                });
            }
        } catch (err) {
            logger.error(`[NTS:status] 배치(${i}-${i + batch.length}) 실패: ${err.message}`);
        }
    }
    return out;
}

/**
 * 진위확인 — 사업자번호 + 대표자명 + 개업일이 일치하는지 검증
 * @param {Array<{b_no, start_dt(YYYYMMDD), p_nm}>} businesses
 * @returns {Promise<Array<{b_no, valid, status_code, requestParam}>>}
 */
async function validateBusiness(businesses) {
    const { base, apiKey } = getApiBase();
    if (!Array.isArray(businesses) || businesses.length === 0) return [];

    // 정규화: b_no 10자리, start_dt YYYYMMDD 8자리 숫자
    const items = businesses
        .map(b => {
            const b_no = normalizeBizNo(b.b_no);
            const start_dt = String(b.start_dt || '').replace(/\D/g, '');
            const p_nm = (b.p_nm || '').trim();
            if (!b_no || start_dt.length !== 8 || !p_nm) return null;
            return { b_no, start_dt, p_nm };
        })
        .filter(Boolean);
    if (items.length === 0) return [];

    const url = `${base}/nts-businessman/v1/validate?serviceKey=${apiKey}`;
    const out = [];
    for (let i = 0; i < items.length; i += MAX_BATCH) {
        const batch = items.slice(i, i + MAX_BATCH);
        try {
            const json = await postJson(url, { businesses: batch });
            const rows = json?.data || [];
            for (const r of rows) {
                out.push({
                    b_no: r.b_no,
                    valid: r.valid === '01',
                    status_code: r.status_code,
                    request_param: r.request_param,
                });
            }
        } catch (err) {
            logger.error(`[NTS:validate] 배치(${i}-${i + batch.length}) 실패: ${err.message}`);
        }
    }
    return out;
}

/**
 * 단건 헬퍼 — 어드민 폼에서 단일 사업자번호 즉시 체크
 * @returns {Promise<{ok: boolean, status: string, message: string, raw?}>}
 */
async function checkSingleBusiness(bizNo) {
    const norm = normalizeBizNo(bizNo);
    if (!norm) return { ok: false, status: 'INVALID_FORMAT', message: '사업자번호 형식이 올바르지 않습니다 (10자리 숫자)' };

    const results = await checkBusinessStatus([norm]);
    if (results.length === 0) {
        return { ok: false, status: 'NOT_FOUND', message: '등록되지 않은 사업자번호입니다' };
    }
    const r = results[0];
    if (!r.b_stt_cd || r.b_stt_cd === '') {
        return { ok: false, status: 'NOT_FOUND', message: '등록되지 않은 사업자번호입니다', raw: r };
    }
    if (r.isActive) {
        return { ok: true, status: 'ACTIVE', message: STATUS_CODE_LABEL[r.b_stt_cd] || r.b_stt, raw: r };
    }
    return { ok: false, status: r.b_stt_cd === '03' ? 'CLOSED' : 'SUSPENDED', message: STATUS_CODE_LABEL[r.b_stt_cd] || r.b_stt, raw: r };
}

module.exports = {
    checkBusinessStatus,
    validateBusiness,
    checkSingleBusiness,
    normalizeBizNo,
    STATUS_CODE_LABEL,
};
