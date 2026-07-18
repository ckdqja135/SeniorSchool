// Backend/service/admin/compService.js + controller/admin/compController.js(위임 로직) 포팅.
// /admin/comp 어드민 회사 관리. 원본 Sequelize → Prisma.
//
// 직렬화 규칙(패리티 핵심):
//  - CompInfo: 원본 Sequelize 모델 attributes 순서가 Prisma 스키마 순서와 다르다
//    (Sequelize는 totalEmployees/newHires/resignations 가 compAvgSalary/compAvgTenure 보다 앞).
//    → toLegacyCompShape 로 원본 순서 재구성. DECIMAL(compAvgTenure(4,1))은 전역 replacer가
//    처리하지 못하므로 .toFixed(1) 문자열로 변환. BIGINT는 전역 json replacer가 문자열화.
//  - CompRequest: Sequelize 모델 순서 == Prisma 스키마 순서 → 원본 그대로 반환.
//
// 외부 의존 엔드포인트:
//  - validateBusiness: 국세청 사업자 진위/휴폐업 조회(businessRegistryService)를 자체 포함으로 이식(native fetch + env).
//  - updateCompStatistics / batchUpdateCompStatistics: externalApiService + tb_comp_statistics 의존.
//    tb_comp_statistics 는 Backend2 Prisma 스키마/실DB에 존재하지 않고(DEAD table), externalApiService 도
//    미이식이라 기능 재현 불가. 원본 실측 동작을 최대한 보존(단건 → 500, 일괄 → 200 all-failed)한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';

// ── CompInfo 직렬화 (원본 Sequelize attributes 순서 유지, compAvgTenure DECIMAL → toFixed(1)) ──
// (Backend2/src/modules/search/search.service.ts 의 toLegacyCompShape 와 동일)
function toLegacyCompShape(c: any) {
    return {
        compIdx: c.compIdx,
        compName: c.compName,
        compLocate: c.compLocate,
        compType: c.compType,
        compEstablish: c.compEstablish,
        compCEO: c.compCEO,
        compIndustry: c.compIndustry,
        compLateX: c.compLateX,
        compLateY: c.compLateY,
        compURL: c.compURL,
        compLotAddr: c.compLotAddr,
        compAddr: c.compAddr,
        compMapIMG: c.compMapIMG,
        compStatus: c.compStatus,
        compViewCount: c.compViewCount,
        compEmployeeCount: c.compEmployeeCount,
        compCapital: c.compCapital,
        compSales: c.compSales,
        totalEmployees: c.totalEmployees,
        newHires: c.newHires,
        resignations: c.resignations,
        compAvgSalary: c.compAvgSalary,
        compAvgTenure: c.compAvgTenure != null ? c.compAvgTenure.toFixed(1) : null,
        compOperatingProfit: c.compOperatingProfit,
        compNetIncome: c.compNetIncome,
        compTotalAssets: c.compTotalAssets,
        compTotalLiabilities: c.compTotalLiabilities,
        compTotalEquity: c.compTotalEquity,
        compCorpCode: c.compCorpCode,
        compDataUpdatedAt: c.compDataUpdatedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}

// ── 국세청 사업자등록정보 진위/상태조회 (Backend/service/businessRegistryService.js 자체 포함 이식) ──
const NTS_FETCH_TIMEOUT = 15000;
const NTS_MAX_BATCH = 100; // API 정책: 1회 최대 100개
const NTS_STATUS_CODE_LABEL: Record<string, string> = {
    '01': '계속사업자',
    '02': '휴업자',
    '03': '폐업자',
};

function ntsGetApiBase(): { base: string; apiKey: string } {
    const base = process.env.NTS_BUSINESS_API_URL;
    const apiKey = process.env.PUBLIC_DATA_API_KEY;
    if (!base || !apiKey) {
        throw new Error('NTS_BUSINESS_API_URL 또는 PUBLIC_DATA_API_KEY 미설정');
    }
    return { base: base.replace(/\/$/, ''), apiKey };
}

function ntsNormalizeBizNo(raw: any): string | null {
    if (raw == null) return null;
    const digits = String(raw).replace(/\D/g, '');
    return digits.length === 10 ? digits : null;
}

async function ntsPostJson(url: string, body: any): Promise<any> {
    const fetchFn: any = (globalThis as any).fetch;
    const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: (AbortSignal as any).timeout(NTS_FETCH_TIMEOUT),
    });
    const text = await res.text();
    let json: any;
    try {
        json = JSON.parse(text);
    } catch {
        json = null;
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${text.slice(0, 200)}`);
    }
    return json;
}

async function ntsCheckBusinessStatus(bizNumbers: any[]): Promise<any[]> {
    const { base, apiKey } = ntsGetApiBase();
    const normalized = (bizNumbers || []).map(ntsNormalizeBizNo).filter(Boolean) as string[];
    if (normalized.length === 0) return [];

    const url = `${base}/nts-businessman/v1/status?serviceKey=${apiKey}`;
    const out: any[] = [];
    for (let i = 0; i < normalized.length; i += NTS_MAX_BATCH) {
        const batch = normalized.slice(i, i + NTS_MAX_BATCH);
        try {
            const json = await ntsPostJson(url, { b_no: batch });
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
        } catch (err: any) {
            logger.error(`[NTS:status] 배치(${i}-${i + batch.length}) 실패: ${err.message}`);
        }
    }
    return out;
}

async function ntsValidateBusiness(businesses: any[]): Promise<any[]> {
    const { base, apiKey } = ntsGetApiBase();
    if (!Array.isArray(businesses) || businesses.length === 0) return [];

    const items = businesses
        .map((b) => {
            const b_no = ntsNormalizeBizNo(b.b_no);
            const start_dt = String(b.start_dt || '').replace(/\D/g, '');
            const p_nm = (b.p_nm || '').trim();
            if (!b_no || start_dt.length !== 8 || !p_nm) return null;
            return { b_no, start_dt, p_nm };
        })
        .filter(Boolean) as any[];
    if (items.length === 0) return [];

    const url = `${base}/nts-businessman/v1/validate?serviceKey=${apiKey}`;
    const out: any[] = [];
    for (let i = 0; i < items.length; i += NTS_MAX_BATCH) {
        const batch = items.slice(i, i + NTS_MAX_BATCH);
        try {
            const json = await ntsPostJson(url, { businesses: batch });
            const rows = json?.data || [];
            for (const r of rows) {
                out.push({
                    b_no: r.b_no,
                    valid: r.valid === '01',
                    status_code: r.status_code,
                    request_param: r.request_param,
                });
            }
        } catch (err: any) {
            logger.error(`[NTS:validate] 배치(${i}-${i + batch.length}) 실패: ${err.message}`);
        }
    }
    return out;
}

async function ntsCheckSingleBusiness(bizNo: any): Promise<any> {
    const norm = ntsNormalizeBizNo(bizNo);
    if (!norm) return { ok: false, status: 'INVALID_FORMAT', message: '사업자번호 형식이 올바르지 않습니다 (10자리 숫자)' };

    const results = await ntsCheckBusinessStatus([norm]);
    if (results.length === 0) {
        return { ok: false, status: 'NOT_FOUND', message: '등록되지 않은 사업자번호입니다' };
    }
    const r = results[0];
    if (!r.b_stt_cd || r.b_stt_cd === '') {
        return { ok: false, status: 'NOT_FOUND', message: '등록되지 않은 사업자번호입니다', raw: r };
    }
    if (r.isActive) {
        return { ok: true, status: 'ACTIVE', message: NTS_STATUS_CODE_LABEL[r.b_stt_cd] || r.b_stt, raw: r };
    }
    return { ok: false, status: r.b_stt_cd === '03' ? 'CLOSED' : 'SUSPENDED', message: NTS_STATUS_CODE_LABEL[r.b_stt_cd] || r.b_stt, raw: r };
}

@Injectable()
export class AdminCompService {
    constructor(private readonly prisma: PrismaService) {}

    // CompInfo create/update 페이로드 구성 (원본 Sequelize 는 모델 attribute 만 취하고 타입 캐스팅).
    // Prisma 는 unknown 키/타입에 엄격하므로 화이트리스트 + 타입 변환으로 동일 동작 재현.
    private buildCompData(source: any): Record<string, any> {
        const data: Record<string, any> = {};
        const stringFields = ['compName', 'compLocate', 'compType', 'compEstablish', 'compCEO', 'compIndustry', 'compURL', 'compLotAddr', 'compAddr', 'compMapIMG', 'compCorpCode'];
        const floatFields = ['compLateX', 'compLateY'];
        const intFields = ['compStatus', 'compViewCount', 'compEmployeeCount', 'totalEmployees', 'newHires', 'resignations'];
        const bigIntFields = ['compCapital', 'compSales', 'compAvgSalary', 'compOperatingProfit', 'compNetIncome', 'compTotalAssets', 'compTotalLiabilities', 'compTotalEquity'];
        const decimalFields = ['compAvgTenure'];
        const dateFields = ['compDataUpdatedAt', 'createdAt', 'updatedAt'];

        for (const f of stringFields) if (source[f] !== undefined) data[f] = source[f];
        for (const f of floatFields) if (source[f] !== undefined) data[f] = Number(source[f]);
        for (const f of intFields) if (source[f] !== undefined) data[f] = Number(source[f]);
        for (const f of bigIntFields) if (source[f] !== undefined) data[f] = BigInt(source[f]);
        for (const f of decimalFields) if (source[f] !== undefined) data[f] = source[f]; // Prisma.Decimal 은 string/number 입력 허용
        for (const f of dateFields) if (source[f] !== undefined) data[f] = new Date(source[f]);
        return data;
    }

    // 회사 생성 (단일/배열). 원본 service/admin/compService.createComp
    async createComp(compData: any) {
        try {
            const requiredFields = ['compName', 'compLocate', 'compType', 'compCEO', 'compIndustry', 'compLateX', 'compLateY', 'compLotAddr', 'compAddr'];

            if (Array.isArray(compData)) {
                const results: any[] = [];
                for (const comp of compData) {
                    const missingFields = requiredFields.filter((field) => !comp[field]);
                    if (missingFields.length > 0) {
                        logger.warn(`[createComp] Missing required fields: ${missingFields.join(', ')}`);
                        throw new Error(`필수값이 누락되었습니다. (${missingFields.join(', ')})`);
                    }
                    const created = await this.prisma.compInfo.create({ data: this.buildCompData(comp) as any });
                    results.push(created);
                    logger.info(`[createComp] 회사 등록 완료! : ${created.compIdx}`);
                }
                return results;
            } else {
                const missingFields = requiredFields.filter((field) => !compData[field]);
                if (missingFields.length > 0) {
                    logger.warn(`[createComp] Missing required fields: ${missingFields.join(', ')}`);
                    throw new Error(`필수값이 누락되었습니다. (${missingFields.join(', ')})`);
                }
                const created = await this.prisma.compInfo.create({ data: this.buildCompData(compData) as any });
                logger.info(`[createComp] 회사 등록 완료! : ${created.compIdx}`);
                return created;
            }
        } catch (error: any) {
            logger.error(`[createComp] Error: ${error.message}`);
            throw error;
        }
    }

    // 사업자번호 휴폐업·진위 검증. 원본 controller/admin/compController.validateBusiness 의 분기 로직을 그대로 이식.
    // 반환: { httpStatus, body } — 컨트롤러가 res.status(httpStatus).json(body). throw 는 컨트롤러 catch → 500.
    async validateBusiness(reqBody: any): Promise<{ httpStatus: number; body: any }> {
        const { bizNo, b_no, ceoName, p_nm, startDate, start_dt } = reqBody || {};
        const num = bizNo || b_no;
        if (!num) {
            return { httpStatus: 400, body: { status: 400, ok: false, message: '사업자번호(bizNo)가 필요합니다.' } };
        }

        // 진위확인까지 원하면 ceoName + startDate 같이 보냄. 없으면 휴폐업만 체크.
        if ((ceoName || p_nm) && (startDate || start_dt)) {
            const [validateResult] = await ntsValidateBusiness([
                {
                    b_no: num,
                    p_nm: ceoName || p_nm,
                    start_dt: startDate || start_dt,
                },
            ]);
            const status = await ntsCheckSingleBusiness(num);
            return {
                httpStatus: 200,
                body: {
                    status: 200,
                    ok: status.ok && validateResult?.valid === true,
                    businessStatus: status,
                    identityValidation: validateResult || null,
                },
            };
        }

        // 휴폐업만 체크
        const result = await ntsCheckSingleBusiness(num);
        return { httpStatus: 200, body: { status: 200, ...result } };
    }

    // 회사 검색 (관리자용). 원본 service/admin/compService.searchComp
    async searchComp(searchParams: any) {
        try {
            const { compName, compLocate, compType, compIndustry, compStatus, rowsPerPage = 20, page = 1 } = searchParams;

            const whereClause: Record<string, any> = {};
            if (compName) whereClause.compName = { contains: compName };
            if (compLocate) whereClause.compLocate = { contains: compLocate };
            if (compType) whereClause.compType = compType;
            if (compIndustry) whereClause.compIndustry = { contains: compIndustry };
            if (compStatus !== undefined) whereClause.compStatus = Number(compStatus);

            const limit = parseInt(rowsPerPage);
            const offset = (parseInt(page) - 1) * limit;

            logger.info(`[searchComp] Search conditions: ${JSON.stringify(whereClause)}`);
            logger.info(`[searchComp] Pagination: limit=${limit}, offset=${offset}`);

            const totalCount = await this.prisma.compInfo.count({ where: whereClause });
            const companies = await this.prisma.compInfo.findMany({
                where: whereClause,
                take: limit,
                skip: offset,
                orderBy: { compIdx: 'desc' },
            });

            const totalPages = Math.ceil(totalCount / limit);

            logger.info(`[searchComp] Found ${totalCount} companies, returning ${companies.length} companies`);

            return {
                status: 200,
                message: '회사 검색이 완료되었습니다.',
                data: companies.map(toLegacyCompShape),
                totalCount: totalCount,
                pagination: {
                    totalCount: totalCount,
                    totalPages: totalPages,
                    currentPage: parseInt(page),
                    rowsPerPage: limit,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                },
            };
        } catch (error: any) {
            logger.error(`[searchComp] Error: ${error.message}`);
            logger.error(`[searchComp] Stack trace: ${error.stack}`);
            throw error;
        }
    }

    // 회사 상세보기 (idx 기반, 조회수 증가). 원본 service/admin/compService.getCompDetail
    async getCompDetail(compIdx: string) {
        try {
            logger.info(`[getCompDetail] Searching for compIdx: ${compIdx}`);

            const company = await this.prisma.compInfo.findUnique({ where: { compIdx: Number(compIdx) } });

            if (!company) {
                logger.warn(`[getCompDetail] Company not found: ${compIdx}`);
                return { status: 404, message: '회사를 찾을 수 없습니다.', data: null };
            }

            // 조회수 증가 (updated_at 는 갱신하지 않음: 원본 literal('updated_at') 재현)
            await this.prisma.$executeRawUnsafe(
                'UPDATE tb_comp_info SET compViewCount = compViewCount + 1, updated_at = updated_at WHERE compIdx = ?',
                company.compIdx,
            );

            logger.info(`[getCompDetail] Company found: ${company.compName}`);

            return { status: 200, message: '회사 상세 정보를 조회했습니다.', data: toLegacyCompShape(company) };
        } catch (error: any) {
            logger.error(`[getCompDetail] Error: ${error.message}`);
            logger.error(`[getCompDetail] Stack trace: ${error.stack}`);
            throw error;
        }
    }

    // 회사 정보 수정. 원본 service/admin/compService.putCompData
    async putCompData(compIdx: string, updateData: any) {
        try {
            logger.info(`[putCompData] Updating compIdx: ${compIdx}`);
            logger.info(`[putCompData] Update data: ${JSON.stringify(updateData)}`);

            const company = await this.prisma.compInfo.findUnique({ where: { compIdx: Number(compIdx) } });

            if (!company) {
                logger.warn(`[putCompData] Company not found: ${compIdx}`);
                return { status: 404, message: '회사를 찾을 수 없습니다.', data: null };
            }

            const updated = await this.prisma.compInfo.update({
                where: { compIdx: Number(compIdx) },
                data: this.buildCompData(updateData),
            });

            logger.info(`[putCompData] Company updated successfully: ${compIdx}`);

            return { status: 200, message: '회사 정보가 수정되었습니다.', data: toLegacyCompShape(updated) };
        } catch (error: any) {
            logger.error(`[putCompData] Error: ${error.message}`);
            logger.error(`[putCompData] Stack trace: ${error.stack}`);
            throw error;
        }
    }

    // 회사 삭제. 원본 service/admin/compService.deleteComp
    async deleteComp(compIdx: string) {
        try {
            logger.info(`[deleteComp] Deleting compIdx: ${compIdx}`);

            const company = await this.prisma.compInfo.findUnique({ where: { compIdx: Number(compIdx) } });

            if (!company) {
                logger.warn(`[deleteComp] Company not found: ${compIdx}`);
                return { status: 404, message: '회사를 찾을 수 없습니다.', data: null };
            }

            await this.prisma.compInfo.deleteMany({ where: { compIdx: Number(compIdx) } });

            logger.info(`[deleteComp] Company deleted successfully: ${compIdx}`);

            return { status: 200, message: '회사가 삭제되었습니다.', data: null };
        } catch (error: any) {
            logger.error(`[deleteComp] Error: ${error.message}`);
            logger.error(`[deleteComp] Stack trace: ${error.stack}`);
            throw error;
        }
    }

    // 회사 상태 변경 (활성/비활성). 원본 service/admin/compService.updateCompStatus
    async updateCompStatus(compIdx: string, compStatus: any) {
        try {
            logger.info(`[updateCompStatus] Updating compIdx: ${compIdx}, status: ${compStatus}`);

            const company = await this.prisma.compInfo.findUnique({ where: { compIdx: Number(compIdx) } });

            if (!company) {
                logger.warn(`[updateCompStatus] Company not found: ${compIdx}`);
                return { status: 404, message: '회사를 찾을 수 없습니다.', data: null };
            }

            // 원본 Sequelize 는 undefined 값을 SET 에서 제외 → 동일하게 정의된 경우에만 갱신.
            const data: Record<string, any> = {};
            if (compStatus !== undefined) data.compStatus = Number(compStatus);

            const updated = await this.prisma.compInfo.update({ where: { compIdx: Number(compIdx) }, data });

            logger.info(`[updateCompStatus] Company status updated successfully: ${compIdx} -> ${compStatus}`);

            return { status: 200, message: '회사 상태가 변경되었습니다.', data: toLegacyCompShape(updated) };
        } catch (error: any) {
            logger.error(`[updateCompStatus] Error: ${error.message}`);
            logger.error(`[updateCompStatus] Stack trace: ${error.stack}`);
            throw error;
        }
    }

    // 회사 추가 요청 목록 조회 (관리자용). 원본 service/admin/compService.getCompRequests
    // CompRequest 는 Sequelize 모델 순서 == Prisma 스키마 순서 → 원본 그대로 반환.
    async getCompRequests(searchParams: any = {}) {
        try {
            const { status, page = 1, rowsPerPage = 10 } = searchParams;

            const pageNum = parseInt(page, 10) || 1;
            const rowsPerPageNum = parseInt(rowsPerPage, 10) || 10;
            const offset = (pageNum - 1) * rowsPerPageNum;

            const whereClause: Record<string, any> = {};
            if (status && ['pending', 'completed', 'rejected'].includes(status)) {
                whereClause.requestStatus = status;
            }

            const count = await this.prisma.compRequest.count({ where: whereClause });
            const rows = await this.prisma.compRequest.findMany({
                where: whereClause,
                orderBy: { requestDate: 'desc' },
                take: rowsPerPageNum,
                skip: offset,
            });

            logger.info(`[getCompRequests] 회사 요청 목록 조회 완료: ${rows.length}개 / 총 ${count}개`);

            return {
                status: 200,
                data: rows,
                totalCount: count,
                currentPage: pageNum,
                rowsPerPage: rowsPerPageNum,
                totalPages: Math.ceil(count / rowsPerPageNum),
            };
        } catch (error: any) {
            logger.error(`[getCompRequests] Error: ${error.message}`);
            throw error;
        }
    }

    // 회사 추가 요청 상태 업데이트 (관리자용). 원본 service/admin/compService.updateCompRequestStatus
    async updateCompRequestStatus(requestIdx: string, status: any, adminNote: any) {
        try {
            const request = await this.prisma.compRequest.findUnique({ where: { requestIdx: Number(requestIdx) } });

            if (!request) {
                return { status: 404, message: '회사 요청을 찾을 수 없습니다.', data: null };
            }

            const updateData: Record<string, any> = { requestStatus: status };
            if (status === 'completed') {
                updateData.processedDate = new Date();
            }
            if (adminNote) {
                updateData.adminNote = adminNote;
            }

            await this.prisma.compRequest.updateMany({ where: { requestIdx: Number(requestIdx) }, data: updateData });

            const updatedRequest = await this.prisma.compRequest.findUnique({ where: { requestIdx: Number(requestIdx) } });

            logger.info(`[updateCompRequestStatus] 회사 요청 상태 업데이트 완료: ${requestIdx} -> ${status}`);

            return {
                status: 200,
                message: '회사 요청 상태가 성공적으로 업데이트되었습니다.',
                data: updatedRequest,
            };
        } catch (error: any) {
            logger.error(`[updateCompRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }

    // ── 통계 엔드포인트 (DEAD path) ──
    // 원본은 externalApiService + tb_comp_statistics 테이블에 의존. Backend2 에는 둘 다 없다
    // (tb_comp_statistics: Prisma 스키마/실DB 모두 부재 → 원본에서도 단건은 SQL 에러로 500).
    // → 기능 재현 불가. 원본 실측 동작만 보존한다.

    // 단건: 원본은 통계 저장 단계에서 예외 → 컨트롤러 catch → 500. 동일하게 throw.
    async updateCompStatistics(_compIdx: string, _compName: any, _businessNumber: any, _year: any, _quarter: any): Promise<any> {
        throw new Error('회사 통계 기능은 사용할 수 없습니다. (tb_comp_statistics 테이블/externalApiService 미이식)');
    }

    // 일괄: 원본 batchUpdateCompanyStatistics 는 각 회사 처리 예외를 잡아 errors 에 적재하고
    // { success, failed, errors } 를 반환 → 컨트롤러 200. tb_comp_statistics 부재 상황에서
    // 모든 항목이 실패하므로 all-failed 로 동일 형태 재현.
    async batchUpdateCompStatistics(companies: any): Promise<{ success: number; failed: number; errors: any[] }> {
        const results = { success: 0, failed: 0, errors: [] as any[] };
        for (const company of companies) {
            results.failed++;
            results.errors.push({
                compIdx: company.compIdx,
                compName: company.compName,
                error: '회사 통계 기능은 사용할 수 없습니다. (tb_comp_statistics 테이블/externalApiService 미이식)',
            });
        }
        logger.info(`[batchUpdateCompStatistics] Completed: ${results.success} success, ${results.failed} failed`);
        return results;
    }
}
