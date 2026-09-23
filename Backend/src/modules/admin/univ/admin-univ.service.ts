// Backend/service/admin/univService.js 포팅.
// /admin/univ 서브라우터의 서비스 계층 — 학교(UniversityInfo) CRUD + 대학교 요청(UnivRequest) 관리.
//
// 패리티 핵심 (레거시 실서버 응답 프로빙으로 확정):
//  - UniversityInfo.univStatus: 레거시 Sequelize 모델이 TINYINT → JSON에서 숫자 1/0.
//    Prisma 스키마는 Boolean이라 true/false를 돌려주므로 반드시 숫자로 되돌린다.
//  - created_at/updated_at: 레거시 Sequelize 모델 속성명이 createdAt/updatedAt (field 매핑).
//    Prisma는 필드명 그대로 created_at/updated_at을 내보내므로 키 이름을 되돌리고 순서를 보존한다.
//  - UnivRequest: BigInt/DECIMAL/BOOLEAN 컬럼이 없어 별도 변환 불필요(requestIdx=Int→number, enum→string, DateTime→ISO).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';

@Injectable()
export class AdminUnivService {
    constructor(private readonly prisma: PrismaService) {}

    // UniversityInfo 행을 레거시 Sequelize JSON 형태로 변환 (키 순서 보존):
    //  - univStatus(Prisma Boolean) → 1/0 숫자
    //  - created_at/updated_at → createdAt/updatedAt (키 이름만 변경, 값/위치 유지)
    private serializeUniv(row: any): any {
        const out: any = {};
        for (const key of Object.keys(row)) {
            if (key === 'univStatus') {
                out.univStatus = row.univStatus == null ? row.univStatus : (row.univStatus ? 1 : 0);
            } else if (key === 'created_at') {
                out.createdAt = row.created_at;
            } else if (key === 'updated_at') {
                out.updatedAt = row.updated_at;
            } else {
                out[key] = row[key];
            }
        }
        return out;
    }

    // 입력에서 UniversityInfo 컬럼만 골라 create/update 데이터 구성 (Sequelize의 미지정 필드 무시 동작 재현).
    private pickUnivFields(source: any): Record<string, any> {
        const fields = [
            'univName', 'univLocate', 'univType', 'univEstablish', 'univPresident',
            'univCampos', 'univLateX', 'univLateY', 'univURL', 'univLotAddr',
            'univAddr', 'univMapIMG', 'univStatus', 'univViewCount',
        ];
        const data: Record<string, any> = {};
        for (const f of fields) {
            if (source[f] !== undefined) data[f] = source[f];
        }
        // Prisma univStatus는 Boolean 컬럼 → 숫자/불리언 입력을 불리언으로 정규화.
        if (data.univStatus !== undefined && data.univStatus !== null) {
            data.univStatus = Boolean(data.univStatus);
        }
        return data;
    }

    // 학교 생성 (배열 일괄 생성 또는 단일 생성). 컨트롤러가 결과의 배열 여부로 insert 개수를 계산한다.
    async createUniv(univData: any) {
        try {
            if (Array.isArray(univData)) {
                const results: any[] = [];
                for (const univ of univData) {
                    const { univName, univLocate, univLateX, univLateY } = univ;
                    if (!univName || !univLocate || !univLateX || !univLateY) {
                        logger.warn(`[createUniv] Missing required fields: ${JSON.stringify(univ)}`);
                        throw new Error('필수값이 누락되었습니다. (univName, univLocate, univLateX, univLateY)');
                    }
                    const created = await this.prisma.universityInfo.create({ data: this.pickUnivFields(univ) as any });
                    results.push(created);
                    logger.info(`[createUniv] 대학교 등록 완료! : ${created.univIdx}`);
                }
                return results;
            } else {
                const { univName, univLocate, univLateX, univLateY } = univData;
                if (!univName || !univLocate || !univLateX || !univLateY) {
                    logger.warn(`[createUniv] Missing required fields: ${JSON.stringify(univData)}`);
                    throw new Error('필수값이 누락되었습니다. (univName, univLocate, univLateX, univLateY)');
                }
                const created = await this.prisma.universityInfo.create({ data: this.pickUnivFields(univData) as any });
                logger.info(`[createUniv] 대학교 등록 완료! : ${created.univIdx}`);
                return created;
            }
        } catch (error) {
            logger.error(`[createUniv] Error: ${error.message}`);
            throw error;
        }
    }

    // 학교 검색 (univStatus=1만, keyword가 숫자면 univIdx, 문자열이면 univName LIKE).
    async searchUniv(data: any) {
        const rowsPerPage = parseInt(data.rowsPerPage, 10) || 10;
        const page = parseInt(data.page || data.currentPage, 10) || 1;
        const keyword = data.keyword || '';
        const offset = (page - 1) * rowsPerPage;

        const where: any = { univStatus: true };
        if (keyword) {
            if (!isNaN(Number(keyword))) {
                where.univIdx = parseInt(keyword, 10);
            } else {
                where.OR = [{ univName: { contains: keyword } }];
            }
        }

        try {
            if (rowsPerPage <= 0 || page <= 0) {
                throw new Error('rowsPerPage와 page는 1 이상의 양수여야 합니다.');
            }

            logger.info(`[searchUniv] Query params - rowsPerPage: ${rowsPerPage}, page: ${page}, offset: ${offset}`);

            const count = await this.prisma.universityInfo.count({ where });
            const rows = await this.prisma.universityInfo.findMany({
                where,
                take: rowsPerPage,
                skip: offset,
                orderBy: { univIdx: 'asc' },
            });

            logger.info(`[searchUniv] Query executed successfully - found ${count} total records`);

            return {
                status: 200,
                data: rows.map((r) => this.serializeUniv(r)),
                totalCount: count,
                currentPage: page,
                rowsPerPage,
            };
        } catch (error) {
            logger.error(`[searchUniv] Database query error: ${error.message}`);
            logger.error(`[searchUniv] Query params - rowsPerPage: ${rowsPerPage}, page: ${page}, offset: ${offset}`);
            throw error;
        }
    }

    // 학교 상세보기.
    async getUnivDetail(univIdx: any) {
        try {
            const university = await this.prisma.universityInfo.findFirst({
                where: { univIdx: Number(univIdx) },
            });

            if (!university) {
                return { status: 404, message: '학교를 찾을 수 없습니다.' };
            }

            return { status: 200, data: this.serializeUniv(university) };
        } catch (error) {
            throw error;
        }
    }

    // 학교 데이터 삭제 (univIdx 단일 숫자 또는 배열).
    async deleteUniv(deleteParams: any) {
        if (!deleteParams || (!Array.isArray(deleteParams.univIdx) && typeof deleteParams.univIdx !== 'number')) {
            throw new Error('삭제할 학교의 univIdx가 입력되지 않았음.');
        }

        const univIdxArray = Array.isArray(deleteParams.univIdx)
            ? deleteParams.univIdx
            : [deleteParams.univIdx];

        if (univIdxArray.length === 0) {
            throw new Error('삭제할 학교의 univIdx 배열이 비어 있음.');
        }

        const result = await this.prisma.universityInfo.deleteMany({
            where: { univIdx: { in: univIdxArray.map((v: any) => Number(v)) } },
        });
        const deletedCount = result.count;

        if (deletedCount === 0) {
            return {
                success: false,
                message: '삭제할 학교 데이터를 찾을 수 없습니다.',
                deletedCount,
            };
        }

        return {
            success: true,
            message: '학교 데이터 삭제완료.',
            deletedCount,
        };
    }

    // 학교 데이터 수정.
    async putUnivData(updateParams: any) {
        const { univIdx } = updateParams;

        if (!univIdx) {
            throw new Error('수정할 학교의 univIdx가 입력되지 않았음.');
        }

        const existingUniv = await this.prisma.universityInfo.findFirst({ where: { univIdx: Number(univIdx) } });
        if (!existingUniv) {
            throw new Error(`univIdx ${univIdx}에 해당하는 학교 데이터를 찾을 수 없습니다.`);
        }

        const result = await this.prisma.universityInfo.updateMany({
            where: { univIdx: Number(univIdx) },
            data: this.pickUnivFields(updateParams) as any,
        });
        const affectedCount = result.count;

        if (affectedCount === 0) {
            return {
                success: false,
                message: '업데이트할 데이터가 없습니다.',
                affectedCount,
            };
        }

        return {
            success: true,
            message: '학교 데이터 수정완료.',
            affectedCount,
        };
    }

    // 대학교 요청 생성 (일반 사용자 접근 가능 — 컨트롤러가 무가드).
    // 주의(레거시 동작 보존): 레거시는 body에서 univYears를 구조분해해 create에 넘기지만
    //   UnivRequest 모델에는 univYears 속성이 없어 Sequelize가 조용히 무시 → univType은 항상 null.
    //   따라서 여기서도 univType을 설정하지 않는다(항상 null).
    async createUnivRequest(requestData: any) {
        try {
            const { univName, univPresident, univAddr } = requestData;

            if (!univName || univName.trim() === '') {
                throw new Error('대학교 이름은 필수입니다.');
            }

            const existingRequest = await this.prisma.univRequest.findFirst({
                where: { univName: univName.trim() },
            });

            if (existingRequest) {
                return {
                    success: false,
                    message: '이미 요청된 대학교입니다.',
                    existingRequest,
                };
            }

            const newRequest = await this.prisma.univRequest.create({
                data: {
                    univName: univName.trim(),
                    univPresident: univPresident ? univPresident.trim() : null,
                    univAddr: univAddr ? univAddr.trim() : null,
                    requestStatus: 'pending',
                    requestDate: new Date(),
                } as any,
            });

            logger.info(`[createUnivRequest] 대학교 요청 생성 완료: ${newRequest.requestIdx} - ${newRequest.univName}`);

            return {
                success: true,
                message: '대학교 요청이 성공적으로 등록되었습니다.',
                data: newRequest,
            };
        } catch (error) {
            logger.error(`[createUnivRequest] Error: ${error.message}`);
            throw error;
        }
    }

    // 대학교 요청 목록 조회 (관리자용).
    // 주의(의도 스펙 구현): 레거시는 query의 rowsPerPage(문자열)를 Sequelize limit에 그대로 넘겨
    //   LIMIT '10' 형태의 SQL 문법오류(500)가 났다. 항상 500이 아니라 rowsPerPage 파라미터가 있을 때만
    //   깨지는 조건부 크래시이므로, 의도된 정상 페이징을 구현하고 Number()로 강제 변환한다.
    //   응답의 currentPage/rowsPerPage는 레거시처럼 원본 쿼리값(문자열/숫자)을 그대로 에코한다.
    async getUnivRequests(searchParams: any = {}) {
        try {
            const { status } = searchParams;
            const page = searchParams.page !== undefined ? searchParams.page : 1;
            const rowsPerPage = searchParams.rowsPerPage !== undefined ? searchParams.rowsPerPage : 10;
            const offset = (page - 1) * rowsPerPage;

            const where: any = {};
            if (status && ['pending', 'completed', 'rejected'].includes(status)) {
                where.requestStatus = status;
            }

            const count = await this.prisma.univRequest.count({ where });
            const rows = await this.prisma.univRequest.findMany({
                where,
                orderBy: { requestDate: 'desc' },
                take: Number(rowsPerPage),
                skip: Number(offset),
            });

            logger.info(`[getUnivRequests] 대학교 요청 목록 조회 완료: ${rows.length}개 / 총 ${count}개`);

            return {
                status: 200,
                data: rows,
                totalCount: count,
                currentPage: page,
                rowsPerPage,
                totalPages: Math.ceil(count / rowsPerPage),
            };
        } catch (error) {
            logger.error(`[getUnivRequests] Error: ${error.message}`);
            throw error;
        }
    }

    // 대학교 요청 상태 업데이트 (관리자용).
    async updateUnivRequestStatus(requestIdx: any, status: any, adminNote: any = null) {
        try {
            const request = await this.prisma.univRequest.findFirst({
                where: { requestIdx: Number(requestIdx) },
            });

            if (!request) {
                throw new Error('존재하지 않는 요청입니다.');
            }

            const updateData: any = {
                requestStatus: status,
                adminNote: adminNote || null,
            };

            if (status === 'completed') {
                updateData.processedDate = new Date();
            }

            const result = await this.prisma.univRequest.updateMany({
                where: { requestIdx: Number(requestIdx) },
                data: updateData,
            });

            if (result.count === 0) {
                throw new Error('요청 상태 업데이트에 실패했습니다.');
            }

            logger.info(`[updateUnivRequestStatus] 대학교 요청 상태 업데이트 완료: ${requestIdx} -> ${status}`);

            return {
                success: true,
                message: '요청 상태가 성공적으로 업데이트되었습니다.',
                requestIdx,
                newStatus: status,
            };
        } catch (error) {
            logger.error(`[updateUnivRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }
}
