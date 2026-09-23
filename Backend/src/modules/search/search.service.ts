// Backend/service/searchService.js의 Prisma 포팅.
// 원본 searchController가 searchService 외에 admin/compService, churchService, outsourceService로
// 위임하던 로직도 이 서비스에 함께 이식한다(교차 도메인 검색).
// 핵심: Prisma는 결과 객체의 키 순서를 "스키마 필드 정의 순서"로 반환하므로,
// 원본 Sequelize attributes 순서와 다를 수 있다 → 모든 결과를 명시적 객체로 재구성해 키 순서를 원본과 일치시킨다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../logger/winston.logger';

// 원본 Sequelize CompInfo 모델의 attributes 순서로 회사 레코드를 재구성.
// (Prisma 스키마 순서는 compAvgSalary/compAvgTenure가 totalEmployees보다 앞이라 순서가 다르다)
// BIGINT 필드는 전역 json replacer가 문자열화하므로 그대로 둔다. DECIMAL(compAvgTenure)은
// 구 스택(mariadb)이 문자열로 반환하므로 명시적으로 String() 변환한다.
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

@Injectable()
export class SearchService {
    constructor(private readonly prisma: PrismaService) {}

    // 학교 자동 완성 검색 (원본 searchService.autoComplete)
    async autoComplete(keyword: string) {
        const rows = await this.prisma.universityInfo.findMany({
            select: { univName: true, univLocate: true, univType: true, univPresident: true },
            where: { univName: { not: '', contains: keyword } },
        });
        return rows.map(r => ({
            univName: r.univName,
            univLocate: r.univLocate,
            univType: r.univType,
            univPresident: r.univPresident,
        }));
    }

    // 학교 정보 검색 (조회수 증가 포함) — 원본 searchService.getSchoolInfo
    async getSchoolInfo(univName: string) {
        const university = await this.prisma.universityInfo.findFirst({
            where: { univName },
        });

        if (!university) {
            return null; // 학교 정보가 없으면 null 반환
        }

        // univViewCount 증가 — 원본은 updated_at = updated_at으로 수정일 자동 갱신을 막았으므로 동일 SQL 유지
        await this.prisma.$executeRawUnsafe(
            'UPDATE tb_universityinfo SET univViewCount = univViewCount + 1, updated_at = updated_at WHERE univIdx = ?',
            university.univIdx
        );

        logger.info(`[getSchoolInfo] 대학교 검색 완료: ${univName}`);

        // 원본 Sequelize 인스턴스 직렬화 형태로 반환(univStatus tinyint → 1/0, createdAt/updatedAt 키명).
        return {
            univIdx: university.univIdx,
            univName: university.univName,
            univLocate: university.univLocate,
            univType: university.univType,
            univEstablish: university.univEstablish,
            univPresident: university.univPresident,
            univCampos: university.univCampos,
            univLateX: university.univLateX,
            univLateY: university.univLateY,
            univURL: university.univURL,
            univLotAddr: university.univLotAddr,
            univAddr: university.univAddr,
            univMapIMG: university.univMapIMG,
            univStatus: Number(university.univStatus),
            univViewCount: university.univViewCount,
            createdAt: university.created_at,
            updatedAt: university.updated_at,
        };
    }

    // univViewCount 높은 순으로 상위 10개 대학교 조회 — 원본 searchService.getTopViewedUniversities
    async getTopViewedUniversities() {
        try {
            const topUniversities = await this.prisma.universityInfo.findMany({
                select: {
                    univIdx: true,
                    univName: true,
                    univLocate: true,
                    univType: true,
                    univCampos: true,
                    univViewCount: true,
                },
                where: { univStatus: true }, // 활성화된 대학교만
                orderBy: { univViewCount: 'desc' }, // 조회수 높은 순 정렬
                take: 10, // 상위 10개만
            });

            const data = topUniversities.map(u => ({
                univIdx: u.univIdx,
                univName: u.univName,
                univLocate: u.univLocate,
                univType: u.univType,
                univCampos: u.univCampos,
                univViewCount: u.univViewCount,
            }));

            logger.info(`[getTopViewedUniversities] 상위 10개 대학교 조회 완료: ${data.length}개`);

            return {
                status: 200,
                data,
                totalCount: data.length,
            };
        } catch (error) {
            logger.error(`[searchService.getTopViewedUniversities] Error: ${error.message}`);
            throw error;
        }
    }

    // 회사 검색 (일반 유저) — 원본 admin/compService.searchComp
    // controller가 { compName, compStatus:1, rowsPerPage:20, currentPage:1 }를 전달하지만
    // searchComp는 page(기본 1)를 사용하므로 currentPage는 무시된다.
    async searchCompany(compName: string) {
        const where: Record<string, any> = {
            compName: { contains: compName },
            compStatus: 1, // 활성 상태인 회사만
        };

        const limit = 20;
        const page = 1;
        const offset = (page - 1) * limit;

        logger.info(`[searchComp] Search conditions: ${JSON.stringify(where)}`);
        logger.info(`[searchComp] Pagination: limit=${limit}, offset=${offset}`);

        const totalCount = await this.prisma.compInfo.count({ where });
        const companies = await this.prisma.compInfo.findMany({
            where,
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
                currentPage: page,
                rowsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    // 회사 상세보기 (compIdx 기반, 조회수 증가 포함) — 원본 admin/compService.getCompDetail
    async getCompDetail(compIdx: string) {
        logger.info(`[getCompDetail] Searching for compIdx: ${compIdx}`);

        const company = await this.prisma.compInfo.findUnique({
            where: { compIdx: Number(compIdx) },
        });

        if (!company) {
            logger.warn(`[getCompDetail] Company not found: ${compIdx}`);
            return {
                status: 404,
                message: '회사를 찾을 수 없습니다.',
                data: null,
            };
        }

        // 조회수 증가
        await this.prisma.$executeRawUnsafe(
            'UPDATE tb_comp_info SET compViewCount = compViewCount + 1, updated_at = updated_at WHERE compIdx = ?',
            company.compIdx
        );

        logger.info(`[getCompDetail] Company found: ${company.compName}`);

        return {
            status: 200,
            message: '회사 상세 정보를 조회했습니다.',
            data: toLegacyCompShape(company),
        };
    }

    // 교회 자동 검색 — 원본 churchService.autoComplete
    async autoCompleteChurch(keyword: string) {
        const churches = await this.prisma.churchInfo.findMany({
            select: { churchName: true, churchAddr: true, churchPastor: true },
            where: {
                churchName: { not: '', contains: keyword },
                churchStatus: 1, // 활성화된 교회만
            },
            orderBy: { churchName: 'asc' },
            take: 10, // 최대 10개까지만
        });

        logger.info(`[autoComplete] Found ${churches.length} churches for keyword: "${keyword}"`);
        return churches.map(c => ({
            churchName: c.churchName,
            churchAddr: c.churchAddr,
            churchPastor: c.churchPastor,
        }));
    }

    // 교회명으로 교회 정보 조회 (조회수 증가 포함) — 원본 churchService.getChurchInfoByName
    async getChurchInfoByName(churchName: string) {
        const church = await this.prisma.churchInfo.findFirst({
            where: { churchName, churchStatus: 1 },
        });

        if (!church) {
            return null;
        }

        // churchViewCount 증가
        await this.prisma.$executeRawUnsafe(
            'UPDATE tb_church_info SET churchViewCount = churchViewCount + 1, updated_at = updated_at WHERE churchIdx = ?',
            church.churchIdx
        );

        logger.info(`[getChurchInfoByName] 교회 검색 완료: ${churchName}`);
        return church;
    }

    // 외주업체 자동 완성 검색 — 원본 outsourceService.autoComplete
    async autoCompleteOutsource(keyword: string) {
        const outsources = await this.prisma.outsourceInfo.findMany({
            select: { outsourceName: true, outsourceAddr: true, outsourceCEO: true, outsourceType: true },
            where: {
                outsourceName: { not: '', contains: keyword },
                outsourceStatus: 1, // 활성화된 외주업체만
            },
            orderBy: { outsourceName: 'asc' },
            take: 10, // 최대 10개까지만
        });

        logger.info(`[autoComplete] Found ${outsources.length} outsources for keyword: "${keyword}"`);
        return outsources.map(o => ({
            outsourceName: o.outsourceName,
            outsourceAddr: o.outsourceAddr,
            outsourceCEO: o.outsourceCEO,
            outsourceType: o.outsourceType,
        }));
    }

    // 교회 조회수 높은 순으로 상위 10개 교회 조회 — 원본 churchService.getTopViewedChurches
    async getTopViewedChurches() {
        try {
            const topChurches = await this.prisma.churchInfo.findMany({
                select: {
                    churchIdx: true,
                    churchName: true,
                    churchLocation: true,
                    churchType: true,
                    churchPastor: true,
                    churchViewCount: true,
                },
                where: { churchStatus: 1 }, // 활성화된 교회만
                orderBy: { churchViewCount: 'desc' }, // 조회수 높은 순 정렬
                take: 10, // 상위 10개만
            });

            logger.info(`[getTopViewedChurches] 상위 10개 교회 조회 완료: ${topChurches.length}개`);

            const data = topChurches.map(c => ({
                churchIdx: c.churchIdx,
                churchName: c.churchName,
                churchLocation: c.churchLocation,
                churchType: c.churchType,
                churchPastor: c.churchPastor,
                churchViewCount: c.churchViewCount,
            }));

            return {
                status: 200,
                data,
                totalCount: data.length,
            };
        } catch (error) {
            logger.error(`[getTopViewedChurches] Error: ${error.message}`);
            throw error;
        }
    }
}
