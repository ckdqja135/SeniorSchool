// Backend/service/compService.js의 Prisma 포팅.
// - 원본 Sequelize CompInterview 모델에는 interviewRating 속성이 없어 create/update 시
//   Sequelize가 해당 값을 조용히 무시했다(검증 normalizeRating만 수행됨). 동일하게 검증만 수행하고 저장하지 않는다.
// - isDeleted: Sequelize BOOLEAN → true/false로 직렬화되던 것을 Prisma Int(0/1)에서 Boolean()으로 변환.
// - include(as: 'company')는 CompInfo 별도 조회 후 병합으로 재현 (키 순서 동일).
// - getCompDetail은 원본에도 라우트가 없는 미사용 메서드라 포팅하지 않음 (admin 버전은 별도 서비스).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash-password.util';
import { logger } from '../../logger/winston.logger';

// 평점 검증 함수 (0.5 ~ 5.0, 0.5 단위) — 원본 service/compService.js의 normalizeRating
const normalizeRating = (rating: any) => {
    if (rating === undefined || rating === null) {
        return null;
    }

    const numericRating = parseFloat(rating);

    if (
        Number.isNaN(numericRating) ||
        numericRating < 0.5 ||
        numericRating > 5.0 ||
        !Number.isInteger(numericRating * 2)
    ) {
        throw new Error('평점은 0.5부터 5.0 사이의 0.5 단위 값이어야 합니다.');
    }

    return numericRating;
};

// 구 스택 JSON 형태로 면접 후기 행 변환 (isDeleted: tinyint 0/1 → boolean)
const toLegacyInterviewShape = (interview: any) => ({
    ...interview,
    isDeleted: Boolean(interview.isDeleted),
});

@Injectable()
export class CompService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * 회사 조회수 기준 인기 회사 TOP10 조회
     */
    async getTopViewedCompanies() {
        try {
            const topViewedCompanies = await this.prisma.compInfo.findMany({
                select: {
                    compIdx: true,
                    compName: true,
                    compLocate: true,
                    compType: true,
                    compIndustry: true,
                    compCEO: true,
                    compViewCount: true,
                },
                orderBy: [
                    { compViewCount: 'desc' }, // 회사 조회수 기준 내림차순
                    { compName: 'asc' }        // 동일 조회수일 경우 회사명 오름차순
                ],
                take: 10 // TOP 10만 조회
            });

            // 원본 attributes 순서(compIndustry가 compCEO보다 앞)와 동일한 키 순서로 구성
            const data = topViewedCompanies.map(c => ({
                compIdx: c.compIdx,
                compName: c.compName,
                compLocate: c.compLocate,
                compType: c.compType,
                compIndustry: c.compIndustry,
                compCEO: c.compCEO,
                compViewCount: c.compViewCount,
            }));

            logger.info(`[getTopViewedCompanies] 인기 회사 TOP10 조회 성공: ${data.length}개`);

            return {
                status: 200,
                data,
                totalCount: data.length
            };
        } catch (error) {
            logger.error(`[getTopViewedCompanies] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 회사 추가 요청 생성
     */
    async createCompRequest(requestData: any) {
        try {
            const { compName, compType, compIndustry, compCEO, compAddr, requesterId } = requestData;

            // 필수값 체크
            if (!compName) {
                throw new Error('회사명은 필수입니다.');
            }

            const request = await this.prisma.compRequest.create({
                data: {
                    compName,
                    compCEO: compCEO || null,
                    compType: compType || null,
                    compIndustry: compIndustry || null,
                    compAddr: compAddr || null,
                    requesterId: requesterId || null,
                    requestStatus: 'pending'
                }
            });

            logger.info(`[createCompRequest] 회사 추가 요청 생성 완료: ${request.requestIdx}`);

            return {
                status: 201,
                data: request,
                message: '회사 추가 요청이 성공적으로 제출되었습니다.'
            };
        } catch (error) {
            logger.error(`[createCompRequest] Error: ${error.message}`);
            throw error;
        }
    }

    // ========== 면접 후기 관련 서비스 ==========

    /**
     * 면접 후기 생성
     */
    async createInterview(interviewData: any) {
        try {
            const { compIdx, writerId, writerPw, interviewTitle, interviewContent, interviewDate, interviewResult, interviewDifficulty, position, interviewRating } = interviewData;

            // 필수값 체크
            if (!compIdx || !writerId || !writerPw || !interviewTitle) {
                throw new Error('필수값이 누락되었습니다. (compIdx, writerId, writerPw, interviewTitle)');
            }

            // 회사 존재 확인
            const company = await this.prisma.compInfo.findUnique({
                where: { compIdx: Number(compIdx) }
            });
            if (!company) {
                return {
                    status: 404,
                    message: '회사를 찾을 수 없습니다.',
                    data: null
                };
            }

            // 원본 모델에 interviewRating 속성이 없어 값은 무시되고 검증만 수행됨 — 동일하게 검증만 수행
            normalizeRating(interviewRating);

            const interview = await this.prisma.compInterview.create({
                data: {
                    compIdx: Number(compIdx),
                    writerId,
                    writerPw: hashPassword(writerPw),
                    interviewTitle,
                    interviewContent: interviewContent || null,
                    interviewDate: interviewDate ? new Date(interviewDate) : null,
                    interviewResult: interviewResult || null,
                    interviewDifficulty: interviewDifficulty || null,
                    position: position || null
                }
            });

            logger.info(`[createInterview] 면접 후기 생성 완료: ${interview.interviewIdx}`);

            return {
                status: 201,
                message: '면접 후기가 작성되었습니다.',
                data: toLegacyInterviewShape(interview)
            };
        } catch (error) {
            logger.error(`[createInterview] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 면접 후기 조회 (목록)
     */
    async getInterviews(compIdx: number | null = null, pagination: any = {}) {
        try {
            const { page = 1, rowsPerPage = 20 } = pagination;
            const pageNum = parseInt(page, 10) || 1;
            const rowsPerPageNum = parseInt(rowsPerPage, 10) || 20;
            const offset = (pageNum - 1) * rowsPerPageNum;

            const whereClause: Record<string, any> = {
                isDeleted: 0
            };

            if (compIdx) {
                whereClause.compIdx = compIdx;
            }

            const count = await this.prisma.compInterview.count({ where: whereClause });
            const rows = await this.prisma.compInterview.findMany({
                where: whereClause,
                orderBy: { regDate: 'desc' },
                take: rowsPerPageNum,
                skip: offset
            });

            // company(include) 재현: CompInfo에서 compIdx, compName 조회 후 병합
            const compInfos = await this.prisma.compInfo.findMany({
                where: { compIdx: { in: rows.map(r => Number(r.compIdx)) } },
                select: { compIdx: true, compName: true }
            });
            const compMap = new Map(compInfos.map(c => [String(c.compIdx), c]));

            const data = rows.map(r => {
                const company = compMap.get(String(r.compIdx));
                return {
                    ...toLegacyInterviewShape(r),
                    company: company ? {
                        compIdx: company.compIdx,
                        compName: company.compName,
                    } : null,
                };
            });

            logger.info(`[getInterviews] 면접 후기 조회 완료: ${data.length}개 / 총 ${count}개`);

            return {
                status: 200,
                message: '면접 후기 조회가 완료되었습니다.',
                data,
                pagination: {
                    totalCount: count,
                    totalPages: Math.ceil(count / rowsPerPageNum),
                    currentPage: pageNum,
                    rowsPerPage: rowsPerPageNum,
                    hasNextPage: pageNum < Math.ceil(count / rowsPerPageNum),
                    hasPrevPage: pageNum > 1
                }
            };
        } catch (error) {
            logger.error(`[getInterviews] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 면접 후기 상세 조회
     */
    async getInterviewDetail(interviewIdx: number) {
        try {
            const interview = await this.prisma.compInterview.findFirst({
                where: {
                    interviewIdx,
                    isDeleted: 0
                }
            });

            if (!interview) {
                return {
                    status: 404,
                    message: '면접 후기를 찾을 수 없습니다.',
                    data: null
                };
            }

            // company(include) 재현: CompInfo에서 compIdx, compName, compLocate, compIndustry 조회 후 병합
            const company = await this.prisma.compInfo.findUnique({
                where: { compIdx: Number(interview.compIdx) },
                select: { compIdx: true, compName: true, compLocate: true, compIndustry: true }
            });

            logger.info(`[getInterviewDetail] 면접 후기 상세 조회: ${interviewIdx}`);

            return {
                status: 200,
                message: '면접 후기 상세 조회가 완료되었습니다.',
                data: {
                    ...toLegacyInterviewShape(interview),
                    company: company ? {
                        compIdx: company.compIdx,
                        compName: company.compName,
                        compLocate: company.compLocate,
                        compIndustry: company.compIndustry,
                    } : null,
                }
            };
        } catch (error) {
            logger.error(`[getInterviewDetail] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 면접 후기 수정
     */
    async updateInterview(interviewIdx: number, updateData: any, writerPw: string) {
        try {
            const interview = await this.prisma.compInterview.findFirst({
                where: {
                    interviewIdx,
                    isDeleted: 0
                }
            });

            if (!interview) {
                return {
                    status: 404,
                    message: '면접 후기를 찾을 수 없습니다.',
                    data: null
                };
            }

            // 비밀번호 확인
            const hashedPassword = hashPassword(writerPw);
            if (interview.writerPw !== hashedPassword) {
                return {
                    status: 403,
                    message: '비밀번호가 일치하지 않습니다.',
                    data: null
                };
            }

            // 수정 가능한 필드만 업데이트
            const allowedFields = ['interviewTitle', 'interviewContent', 'interviewDate', 'interviewResult', 'interviewDifficulty', 'position', 'interviewRating'];
            const updateFields: Record<string, any> = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    if (field === 'interviewRating') {
                        // 원본 모델에 없는 속성 — 검증만 수행되고 저장은 무시됨 (Sequelize 동작 재현)
                        normalizeRating(updateData[field]);
                    } else if (field === 'interviewDate') {
                        updateFields[field] = updateData[field] ? new Date(updateData[field]) : null;
                    } else {
                        updateFields[field] = updateData[field];
                    }
                }
            });

            const updated = await this.prisma.compInterview.update({
                where: { interviewIdx },
                data: {
                    ...updateFields,
                    modDate: new Date()
                }
            });

            logger.info(`[updateInterview] 면접 후기 수정 완료: ${interviewIdx}`);

            return {
                status: 200,
                message: '면접 후기가 수정되었습니다.',
                data: toLegacyInterviewShape(updated)
            };
        } catch (error) {
            logger.error(`[updateInterview] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 면접 후기 삭제 (소프트 삭제)
     */
    async deleteInterview(interviewIdx: number, writerPw: string) {
        try {
            const interview = await this.prisma.compInterview.findFirst({
                where: {
                    interviewIdx,
                    isDeleted: 0
                }
            });

            if (!interview) {
                return {
                    status: 404,
                    message: '면접 후기를 찾을 수 없습니다.',
                    data: null
                };
            }

            // 비밀번호 확인
            const hashedPassword = hashPassword(writerPw);
            if (interview.writerPw !== hashedPassword) {
                return {
                    status: 403,
                    message: '비밀번호가 일치하지 않습니다.',
                    data: null
                };
            }

            // 소프트 삭제
            await this.prisma.compInterview.update({
                where: { interviewIdx },
                data: {
                    isDeleted: 1,
                    modDate: new Date()
                }
            });

            logger.info(`[deleteInterview] 면접 후기 삭제 완료: ${interviewIdx}`);

            return {
                status: 200,
                message: '면접 후기가 삭제되었습니다.',
                data: null
            };
        } catch (error) {
            logger.error(`[deleteInterview] Error: ${error.message}`);
            throw error;
        }
    }

    // ========== 연봉 후기 관련 서비스 ==========

    /**
     * 연봉 후기 생성
     */
    async createSalary(salaryData: any) {
        try {
            const { compIdx, salary, workYear, department } = salaryData;

            // 필수값 체크
            if (!compIdx || !salary || !workYear || !department) {
                throw new Error('필수값이 누락되었습니다. (compIdx, salary, workYear, department)');
            }

            // 회사 존재 확인
            const company = await this.prisma.compInfo.findUnique({
                where: { compIdx: Number(compIdx) }
            });
            if (!company) {
                return {
                    status: 404,
                    message: '회사를 찾을 수 없습니다.',
                    data: null
                };
            }

            const salaryReview = await this.prisma.compSalary.create({
                data: {
                    compIdx: Number(compIdx),
                    salary: Number(salary),
                    workYear: Number(workYear),
                    department
                }
            });

            logger.info(`[createSalary] 연봉 후기 생성 완료: ${salaryReview.salaryIdx}`);

            return {
                status: 201,
                message: '연봉 후기가 작성되었습니다.',
                data: salaryReview
            };
        } catch (error) {
            logger.error(`[createSalary] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 연봉 후기 조회 (목록)
     */
    async getSalaries(compIdx: number | null = null, pagination: any = {}) {
        try {
            const { page = 1, rowsPerPage = 20 } = pagination;
            const pageNum = parseInt(page, 10) || 1;
            const rowsPerPageNum = parseInt(rowsPerPage, 10) || 20;
            const offset = (pageNum - 1) * rowsPerPageNum;

            const whereClause: Record<string, any> = {};

            if (compIdx) {
                whereClause.compIdx = compIdx;
            }

            const count = await this.prisma.compSalary.count({ where: whereClause });
            const rows = await this.prisma.compSalary.findMany({
                where: whereClause,
                orderBy: { regDate: 'desc' },
                take: rowsPerPageNum,
                skip: offset
            });

            // company(include) 재현: CompInfo에서 compIdx, compName 조회 후 병합
            const compInfos = await this.prisma.compInfo.findMany({
                where: { compIdx: { in: rows.map(r => Number(r.compIdx)) } },
                select: { compIdx: true, compName: true }
            });
            const compMap = new Map(compInfos.map(c => [String(c.compIdx), c]));

            const data = rows.map(r => {
                const company = compMap.get(String(r.compIdx));
                return {
                    ...r,
                    company: company ? {
                        compIdx: company.compIdx,
                        compName: company.compName,
                    } : null,
                };
            });

            logger.info(`[getSalaries] 연봉 후기 조회 완료: ${data.length}개 / 총 ${count}개`);

            return {
                status: 200,
                message: '연봉 후기 조회가 완료되었습니다.',
                data,
                pagination: {
                    totalCount: count,
                    totalPages: Math.ceil(count / rowsPerPageNum),
                    currentPage: pageNum,
                    rowsPerPage: rowsPerPageNum,
                    hasNextPage: pageNum < Math.ceil(count / rowsPerPageNum),
                    hasPrevPage: pageNum > 1
                }
            };
        } catch (error) {
            logger.error(`[getSalaries] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 회사 평점 평균 조회
     */
    async getCompanyAverageRating(compIdx: number) {
        try {
            const result = await this.prisma.compBoard.aggregate({
                where: {
                    compIdx,
                    isDeleted: 0,
                    boardRating: {
                        not: null
                    }
                },
                _avg: { boardRating: true },
                _count: { boardRating: true }
            });

            const average = result._avg.boardRating ? Number(result._avg.boardRating).toFixed(1) : null;
            const count = result._count.boardRating ? parseInt(String(result._count.boardRating), 10) : 0;

            return {
                status: 200,
                message: '회사 평점 평균을 조회했습니다.',
                data: {
                    compIdx,
                    averageRating: average ? parseFloat(average) : null,
                    ratingCount: count
                }
            };
        } catch (error) {
            logger.error(`[getCompanyAverageRating] Error: ${error.message}`);
            throw error;
        }
    }
}
