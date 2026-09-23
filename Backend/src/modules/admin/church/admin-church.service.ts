// Backend/service/admin/churchService.js의 Prisma 포팅.
// 어드민 교회 관리(/admin/church) + 교회 추가 요청 관리.
// 직렬화 규칙:
//  - churchIdx(BIGINT): 전역 json replacer가 문자열화 → 일반 모델 read는 그대로 반환.
//  - churchLatX/Y(DOUBLE→Float): 반올림 없이 그대로 방출.
//  - churchStatus는 원본이 TINYINT(BOOLEAN 아님) → Int(number) 유지 (Boolean 변환 금지).
//  - stats 집계(COUNT)는 raw SQL + serializeRows로 BIGINT→문자열 처리(구 스택 bigNumberStrings 재현).
//    (총계/활성/비활성은 원본 Sequelize .count() → number, Prisma count() → number로 일치)
//  - requestStatus(ENUM): 문자열 그대로 통과. DATETIME(requestDate 등): res.json이 ISO(UTC)로 직렬화.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { serializeRows } from '../../../common/utils/serialize-row.util';
import { logger } from '../../../logger/winston.logger';

@Injectable()
export class AdminChurchService {
    constructor(private readonly prisma: PrismaService) {}

    // 교회 생성 (단일 객체 또는 배열)
    async createChurch(churchData: any) {
        try {
            // 배열 형태의 데이터인지 확인
            if (Array.isArray(churchData)) {
                // 배열인 경우 여러 교회를 일괄 생성
                const results: any[] = [];
                for (const church of churchData) {
                    const { churchName, churchLocation, churchType, churchPastor } = church;

                    // 필수값 체크
                    if (!churchName || !churchLocation || !churchType || !churchPastor) {
                        logger.warn(`[createChurch] Missing required fields: ${JSON.stringify(church)}`);
                        throw new Error('필수값이 누락되었습니다. (churchName, churchLocation, churchType, churchPastor)');
                    }

                    // DB에 데이터 생성
                    const created = await this.prisma.churchInfo.create({
                        data: {
                            churchName: church.churchName,
                            churchLocation: church.churchLocation,
                            churchType: church.churchType,
                            churchEstablished: church.churchEstablished || '',
                            churchPastor: church.churchPastor,
                            churchLatX: Number(church.churchLatX) || 0,
                            churchLatY: Number(church.churchLatY) || 0,
                            churchURL: church.churchURL || '',
                            churchLotAddr: church.churchLotAddr || '',
                            churchAddr: church.churchAddr || '',
                            churchMapIMG: church.churchMapIMG || null,
                            churchStatus: 1,
                            churchViewCount: 0,
                        },
                    });
                    results.push(created);
                    logger.info(`[createChurch] 교회 등록 완료! : ${created.churchIdx}`);
                }
                return {
                    insert: results.length,
                    success: true,
                };
            } else {
                // 단일 객체인 경우
                const { churchName, churchLocation, churchType, churchPastor } = churchData;

                // 필수값 체크
                if (!churchName || !churchLocation || !churchType || !churchPastor) {
                    logger.warn(`[createChurch] Missing required fields: ${JSON.stringify(churchData)}`);
                    throw new Error('필수값이 누락되었습니다. (churchName, churchLocation, churchType, churchPastor)');
                }

                // DB에 데이터 생성
                const created = await this.prisma.churchInfo.create({
                    data: {
                        churchName: churchData.churchName,
                        churchLocation: churchData.churchLocation,
                        churchType: churchData.churchType,
                        churchEstablished: churchData.churchEstablished || '',
                        churchPastor: churchData.churchPastor,
                        churchLatX: Number(churchData.churchLatX) || 0,
                        churchLatY: Number(churchData.churchLatY) || 0,
                        churchURL: churchData.churchURL || '',
                        churchLotAddr: churchData.churchLotAddr || '',
                        churchAddr: churchData.churchAddr || '',
                        churchMapIMG: churchData.churchMapIMG || null,
                        churchStatus: 1,
                        churchViewCount: 0,
                    },
                });
                logger.info(`[createChurch] 교회 등록 완료! : ${created.churchIdx}`);

                return {
                    insert: 1,
                    success: true,
                };
            }
        } catch (error) {
            // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
            logger.error(`[createChurch] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 검색 서비스
    async searchChurch(searchParams: any) {
        try {
            const {
                churchName,
                churchLocation,
                churchType,
                churchPastor,
                churchStatus,
                rowsPerPage = 10,
                page = 1,
            } = searchParams;

            // 검색 조건 구성
            const whereClause: Record<string, any> = {};

            if (churchName) {
                whereClause.churchName = { contains: churchName };
            }

            if (churchLocation) {
                whereClause.churchLocation = { contains: churchLocation };
            }

            if (churchType) {
                whereClause.churchType = { contains: churchType };
            }

            if (churchPastor) {
                whereClause.churchPastor = { contains: churchPastor };
            }

            if (churchStatus !== undefined) {
                whereClause.churchStatus = Number(churchStatus);
            }

            // 페이징 계산
            const offset = (parseInt(page) - 1) * parseInt(rowsPerPage);

            // 검색 실행 (findAndCountAll = count + findMany)
            const count = await this.prisma.churchInfo.count({ where: whereClause });
            const rows = await this.prisma.churchInfo.findMany({
                where: whereClause,
                orderBy: { churchIdx: 'desc' },
                take: parseInt(rowsPerPage),
                skip: offset,
            });

            const totalPages = Math.ceil(count / rowsPerPage);

            logger.info(`[searchChurch] 검색 완료: ${count}개 중 ${rows.length}개 반환`);

            return {
                status: 200,
                data: rows,
                totalCount: count,
                currentPage: parseInt(page),
                totalPages: totalPages,
                rowsPerPage: parseInt(rowsPerPage),
            };
        } catch (error) {
            logger.error(`[searchChurch] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 상세보기 서비스
    // NOTE: 라우터가 GET /church(파라미터 없음)로 연결되어 컨트롤러의 req.params.churchIdx는 항상 undefined.
    //       원본 Sequelize findByPk(undefined)는 쿼리 없이 null 반환(v6) → 항상 404가 된다. 동일 동작 재현.
    async getChurchDetail(churchIdx: any) {
        try {
            const church = churchIdx == null
                ? null
                : await this.prisma.churchInfo.findFirst({ where: { churchIdx: Number(churchIdx) } });

            if (!church) {
                return {
                    status: 404,
                    message: '교회를 찾을 수 없습니다.',
                    data: null,
                };
            }

            logger.info(`[getChurchDetail] 교회 상세보기 완료: ${church.churchName}`);

            return {
                status: 200,
                data: church,
            };
        } catch (error) {
            logger.error(`[getChurchDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 수정 서비스
    async updateChurch(churchIdx: any, updateData: any) {
        try {
            const church = await this.prisma.churchInfo.findFirst({ where: { churchIdx: Number(churchIdx) } });

            if (!church) {
                return {
                    status: 404,
                    message: '교회를 찾을 수 없습니다.',
                    data: null,
                };
            }

            // 교회 정보 수정 (원본 Sequelize.update(updateData)는 모델 속성만 적용 → 동일하게 필드 선별/형변환)
            await this.prisma.churchInfo.updateMany({
                where: { churchIdx: Number(churchIdx) },
                data: this.buildChurchUpdateData(updateData),
            });

            // 수정된 교회 정보 조회
            const updatedChurch = await this.prisma.churchInfo.findFirst({ where: { churchIdx: Number(churchIdx) } });

            logger.info(`[updateChurch] 교회 수정 완료: ${churchIdx}`);

            return {
                status: 200,
                message: '교회 정보가 성공적으로 수정되었습니다.',
                data: updatedChurch,
            };
        } catch (error) {
            logger.error(`[updateChurch] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 삭제 서비스 (소프트 삭제)
    async deleteChurch(churchIdx: any) {
        try {
            const church = await this.prisma.churchInfo.findFirst({ where: { churchIdx: Number(churchIdx) } });

            if (!church) {
                return {
                    status: 404,
                    message: '교회를 찾을 수 없습니다.',
                    data: null,
                };
            }

            // 소프트 삭제 (churchStatus를 0으로 변경)
            await this.prisma.churchInfo.updateMany({
                where: { churchIdx: Number(churchIdx) },
                data: { churchStatus: 0 },
            });

            logger.info(`[deleteChurch] 교회 삭제 완료: ${churchIdx}`);

            return {
                status: 200,
                message: '교회가 성공적으로 삭제되었습니다.',
                data: null,
            };
        } catch (error) {
            logger.error(`[deleteChurch] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 일괄 삭제 서비스 (소프트 삭제)
    async deleteChurches(churchIdxList: any[]) {
        try {
            const ids = churchIdxList.map((idx: any) => Number(idx));

            const churches = await this.prisma.churchInfo.findMany({
                where: { churchIdx: { in: ids } },
            });

            if (churches.length === 0) {
                return {
                    status: 404,
                    message: '교회를 찾을 수 없습니다.',
                    data: null,
                };
            }

            await this.prisma.churchInfo.updateMany({
                where: { churchIdx: { in: ids } },
                data: { churchStatus: 0 },
            });

            logger.info(`[deleteChurches] 교회 일괄 삭제 완료: ${churchIdxList.join(', ')}`);

            return {
                status: 200,
                message: `${churches.length}개의 교회가 성공적으로 삭제되었습니다.`,
                data: null,
            };
        } catch (error) {
            logger.error(`[deleteChurches] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 통계 조회 서비스
    async getChurchStats() {
        try {
            // 전체 교회 수 (원본 .count() → number)
            const totalChurches = await this.prisma.churchInfo.count();

            // 활성 교회 수
            const activeChurches = await this.prisma.churchInfo.count({
                where: { churchStatus: 1 },
            });

            // 비활성 교회 수
            const inactiveChurches = await this.prisma.churchInfo.count({
                where: { churchStatus: 0 },
            });

            // 교회 종류별 통계 (COUNT → BIGINT → 문자열)
            const churchTypeStats = serializeRows(
                await this.prisma.$queryRawUnsafe<any[]>(
                    'SELECT churchType, COUNT(churchType) AS count FROM tb_church_info WHERE churchStatus = 1 GROUP BY churchType ORDER BY COUNT(churchType) DESC',
                ),
            );

            // 지역별 통계 (상위 10개)
            const locationStats = serializeRows(
                await this.prisma.$queryRawUnsafe<any[]>(
                    'SELECT churchLocation, COUNT(churchLocation) AS count FROM tb_church_info WHERE churchStatus = 1 GROUP BY churchLocation ORDER BY COUNT(churchLocation) DESC LIMIT 10',
                ),
            );

            // 조회수 상위 10개 교회 (모델 read → churchIdx BIGINT는 전역 replacer가 문자열화)
            const topViewedChurches = await this.prisma.churchInfo.findMany({
                select: {
                    churchIdx: true,
                    churchName: true,
                    churchLocation: true,
                    churchType: true,
                    churchViewCount: true,
                },
                where: { churchStatus: 1 },
                orderBy: { churchViewCount: 'desc' },
                take: 10,
            });

            logger.info(`[getChurchStats] 교회 통계 조회 완료`);

            return {
                status: 200,
                data: {
                    totalChurches,
                    activeChurches,
                    inactiveChurches,
                    churchTypeStats,
                    locationStats,
                    topViewedChurches,
                },
            };
        } catch (error) {
            logger.error(`[getChurchStats] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 추가 요청 생성 (일반 사용자도 접근 가능)
    async createChurchRequest(requestData: any) {
        try {
            const { churchName, churchPastor, churchType, churchAddr } = requestData;

            // 필수값 체크 (교회 이름만 필수)
            if (!churchName || churchName.trim() === '') {
                throw new Error('교회 이름은 필수입니다.');
            }

            // 교회 이름 중복 체크 (이미 요청된 교회인지)
            const existingRequest = await this.prisma.churchRequest.findFirst({
                where: { churchName: churchName.trim() },
            });

            if (existingRequest) {
                return {
                    success: false,
                    message: '이미 요청된 교회입니다.',
                    existingRequest,
                };
            }

            // 요청 데이터 생성
            const newRequest = await this.prisma.churchRequest.create({
                data: {
                    churchName: churchName.trim(),
                    churchPastor: churchPastor ? churchPastor.trim() : null,
                    churchType: churchType ? churchType.trim() : null,
                    churchAddr: churchAddr ? churchAddr.trim() : null,
                    requestStatus: 'pending',
                    requestDate: new Date(),
                },
            });

            logger.info(`[createChurchRequest] 교회 요청 생성 완료: ${newRequest.requestIdx} - ${newRequest.churchName}`);

            return {
                success: true,
                message: '교회 요청이 성공적으로 등록되었습니다.',
                data: newRequest,
            };
        } catch (error) {
            logger.error(`[createChurchRequest] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 추가 요청 목록 조회 서비스 (관리자용)
    async getChurchRequests(searchParams: any = {}) {
        try {
            const { status, page = 1, rowsPerPage = 10 } = searchParams;

            // 문자열로 전달된 page와 rowsPerPage를 숫자로 변환
            const pageNum = parseInt(page, 10) || 1;
            const rowsPerPageNum = parseInt(rowsPerPage, 10) || 10;
            const offset = (pageNum - 1) * rowsPerPageNum;

            // 검색 조건 구성
            const whereClause: Record<string, any> = {};
            if (status && ['pending', 'completed', 'rejected'].includes(status)) {
                whereClause.requestStatus = status;
            }

            // 요청 목록 조회 (findAndCountAll = count + findMany)
            const count = await this.prisma.churchRequest.count({ where: whereClause });
            const rows = await this.prisma.churchRequest.findMany({
                where: whereClause,
                orderBy: { requestDate: 'desc' }, // 최신 요청순
                take: rowsPerPageNum,
                skip: offset,
            });

            logger.info(`[getChurchRequests] 교회 요청 목록 조회 완료: ${rows.length}개 / 총 ${count}개`);

            return {
                status: 200,
                data: rows,
                totalCount: count,
                currentPage: pageNum,
                rowsPerPage: rowsPerPageNum,
                totalPages: Math.ceil(count / rowsPerPageNum),
            };
        } catch (error) {
            logger.error(`[getChurchRequests] Error: ${error.message}`);
            throw error;
        }
    }

    // 교회 추가 요청 상태 업데이트 서비스 (관리자용)
    async updateChurchRequestStatus(requestIdx: any, status: any, adminNote: any) {
        try {
            const request = await this.prisma.churchRequest.findFirst({ where: { requestIdx: Number(requestIdx) } });

            if (!request) {
                return {
                    status: 404,
                    message: '교회 요청을 찾을 수 없습니다.',
                    data: null,
                };
            }

            // 상태 업데이트
            const updateData: Record<string, any> = {
                requestStatus: status,
            };

            if (status === 'completed') {
                updateData.processedDate = new Date();
            }

            if (adminNote) {
                updateData.adminNote = adminNote;
            }

            await this.prisma.churchRequest.updateMany({
                where: { requestIdx: Number(requestIdx) },
                data: updateData,
            });

            // 업데이트된 요청 정보 조회
            const updatedRequest = await this.prisma.churchRequest.findFirst({ where: { requestIdx: Number(requestIdx) } });

            logger.info(`[updateChurchRequestStatus] 교회 요청 상태 업데이트 완료: ${requestIdx} -> ${status}`);

            return {
                status: 200,
                message: '교회 요청 상태가 성공적으로 업데이트되었습니다.',
                data: updatedRequest,
            };
        } catch (error) {
            logger.error(`[updateChurchRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }

    // 원본 Sequelize.update(updateData)는 전달된 값 중 모델 속성만 반영한다.
    // Prisma는 미지의 키/타입을 거부하므로, 모델 컬럼만 선별하고 숫자 컬럼은 형변환한다.
    // (churchIdx/createdAt/updatedAt은 수정 대상에서 제외)
    private buildChurchUpdateData(body: any): Record<string, any> {
        const data: Record<string, any> = {};
        const stringFields = [
            'churchName',
            'churchLocation',
            'churchType',
            'churchEstablished',
            'churchPastor',
            'churchURL',
            'churchLotAddr',
            'churchAddr',
            'churchMapIMG',
        ];
        for (const f of stringFields) {
            if (body[f] !== undefined) data[f] = body[f];
        }
        if (body.churchLatX !== undefined) data.churchLatX = Number(body.churchLatX);
        if (body.churchLatY !== undefined) data.churchLatY = Number(body.churchLatY);
        if (body.churchStatus !== undefined) data.churchStatus = Number(body.churchStatus);
        if (body.churchViewCount !== undefined) data.churchViewCount = Number(body.churchViewCount);
        return data;
    }
}
