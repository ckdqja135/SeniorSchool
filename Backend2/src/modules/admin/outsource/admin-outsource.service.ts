// Backend/service/admin/outsourceService.js 의 Prisma 포팅.
// 외주업체(OutsourceInfo) 관리 + 외주업체 추가요청(OutsourceRequest) 관리.
// 파리티 원칙:
//  - BIGINT(outsourceIdx)는 전역 json replacer가 문자열화 → 일반 조회는 그대로 반환.
//  - outsourceStatus는 원본 Sequelize TINYINT(=Prisma Int)이므로 Boolean 변환하지 않는다(숫자 유지).
//  - 날짜(created_at/updated_at/requestDate/processedDate)는 Date → JSON 직렬화 시 ISO(UTC).
//  - requestData 컬럼은 실DB(ReviewSiteDB)에서 longtext → Sequelize JSON 타입이라도 read 시 "문자열"로 반환.
//    (목록은 문자열 그대로, 상세는 원본이 명시적으로 JSON.parse 하므로 동일 재현.)
//  - create 응답의 키 순서는 Sequelize 인스턴스(build+insert) 순서를 그대로 재현(실측 검증):
//      createOutsource:        createdAt, updatedAt, outsourceIdx, <설정필드...>
//      createOutsourceRequest: requestDate, requestIdx, outsourceName, outsourceCEO, outsourceType, outsourceAddr, requestStatus
//    (미설정·무기본값 컬럼 processedDate/adminNote/requestData 는 인스턴스 JSON에서 제외됨.)
//  - stats/overview 의 GROUP BY 집계는 $queryRawUnsafe + serializeRows, count는 원본이 parseInt 하므로 number 로 출력.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';
import { serializeRows } from '../../../common/utils/serialize-row.util';

@Injectable()
export class AdminOutsourceService {
    constructor(private readonly prisma: PrismaService) {}

    // Sequelize create 인스턴스 toJSON 키 순서 재현: createdAt, updatedAt, outsourceIdx, <설정필드...>
    private serializeCreatedOutsource(c: any): any {
        return {
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            outsourceIdx: c.outsourceIdx,
            outsourceName: c.outsourceName,
            outsourceLocation: c.outsourceLocation,
            outsourceType: c.outsourceType,
            outsourceEstablished: c.outsourceEstablished,
            outsourceCEO: c.outsourceCEO,
            outsourceLatX: c.outsourceLatX,
            outsourceLatY: c.outsourceLatY,
            outsourceURL: c.outsourceURL,
            outsourceLotAddr: c.outsourceLotAddr,
            outsourceAddr: c.outsourceAddr,
            outsourceMapIMG: c.outsourceMapIMG,
            outsourceStatus: c.outsourceStatus,
            outsourceViewCount: c.outsourceViewCount,
        };
    }

    async createOutsource(outsourceData: any) {
        try {
            // 배열 형태의 데이터인지 확인
            if (Array.isArray(outsourceData)) {
                // 배열인 경우 여러 외주업체를 일괄 생성
                const results: any[] = [];
                for (const outsource of outsourceData) {
                    const { outsourceName, outsourceLocation, outsourceType, outsourceCEO } = outsource;

                    // 필수값 체크
                    if (!outsourceName || !outsourceLocation || !outsourceType || !outsourceCEO) {
                        logger.warn(`[createOutsource] Missing required fields: ${JSON.stringify(outsource)}`);
                        throw new Error('필수값이 누락되었습니다. (outsourceName, outsourceLocation, outsourceType, outsourceCEO)');
                    }

                    // DB에 데이터 생성
                    const created = await this.prisma.outsourceInfo.create({
                        data: {
                            outsourceName: outsource.outsourceName,
                            outsourceLocation: outsource.outsourceLocation,
                            outsourceType: outsource.outsourceType,
                            outsourceEstablished: outsource.outsourceEstablished || '',
                            outsourceCEO: outsource.outsourceCEO,
                            outsourceLatX: outsource.outsourceLatX || 0,
                            outsourceLatY: outsource.outsourceLatY || 0,
                            outsourceURL: outsource.outsourceURL || '',
                            outsourceLotAddr: outsource.outsourceLotAddr || '',
                            outsourceAddr: outsource.outsourceAddr || '',
                            outsourceMapIMG: outsource.outsourceMapIMG || null,
                            outsourceStatus: 1,
                            outsourceViewCount: 0,
                        },
                    });
                    results.push(created);
                    logger.info(`[createOutsource] 외주업체 등록 완료! : ${created.outsourceIdx}`);
                }
                return {
                    insert: results.length,
                    success: true,
                };
            } else {
                // 단일 객체인 경우
                const { outsourceName, outsourceLocation, outsourceType, outsourceCEO } = outsourceData;

                // 필수값 체크
                if (!outsourceName || !outsourceLocation || !outsourceType || !outsourceCEO) {
                    logger.warn(`[createOutsource] Missing required fields: ${JSON.stringify(outsourceData)}`);
                    throw new Error('필수값이 누락되었습니다. (outsourceName, outsourceLocation, outsourceType, outsourceCEO)');
                }

                const created = await this.prisma.outsourceInfo.create({
                    data: {
                        outsourceName: outsourceData.outsourceName,
                        outsourceLocation: outsourceData.outsourceLocation,
                        outsourceType: outsourceData.outsourceType,
                        outsourceEstablished: outsourceData.outsourceEstablished || '',
                        outsourceCEO: outsourceData.outsourceCEO,
                        outsourceLatX: outsourceData.outsourceLatX || 0,
                        outsourceLatY: outsourceData.outsourceLatY || 0,
                        outsourceURL: outsourceData.outsourceURL || '',
                        outsourceLotAddr: outsourceData.outsourceLotAddr || '',
                        outsourceAddr: outsourceData.outsourceAddr || '',
                        outsourceMapIMG: outsourceData.outsourceMapIMG || null,
                        outsourceStatus: 1,
                        outsourceViewCount: 0,
                    },
                });

                logger.info(`[createOutsource] 외주업체 등록 완료! : ${created.outsourceIdx}`);
                return {
                    insert: 1,
                    success: true,
                    data: this.serializeCreatedOutsource(created),
                };
            }
        } catch (error) {
            logger.error(`[createOutsource] Error: ${error.message}`);
            throw error;
        }
    }

    async searchOutsource(searchParams: any) {
        try {
            const { name, type, location, page = 1, limit = 10 } = searchParams;

            const whereClause: Record<string, any> = { outsourceStatus: 1 }; // 활성 상태만

            // 검색 조건 추가
            if (name && name.trim() !== '') {
                whereClause.outsourceName = { contains: name.trim() };
            }

            if (type && type.trim() !== '') {
                whereClause.outsourceType = type.trim();
            }

            if (location && location.trim() !== '') {
                whereClause.outsourceLocation = { contains: location.trim() };
            }

            // 페이징 처리
            const offset = (page - 1) * limit;

            const count = await this.prisma.outsourceInfo.count({ where: whereClause });
            const rows = await this.prisma.outsourceInfo.findMany({
                where: whereClause,
                orderBy: { outsourceName: 'asc' },
                take: parseInt(limit as any),
                skip: parseInt(offset as any),
            });

            logger.info(`[searchOutsource] Found ${count} outsources`);

            return {
                status: 200,
                totalCount: count,
                totalPages: Math.ceil(count / (limit as any)),
                currentPage: parseInt(page as any),
                outsources: rows,
            };
        } catch (error) {
            logger.error(`[searchOutsource] Error: ${error.message}`);
            throw error;
        }
    }

    async getOutsourceDetail(outsourceIdx: any) {
        try {
            // 원본은 findByPk(outsourceIdx). 라우터 '/outsource'에는 :outsourceIdx 파라미터가 없어
            // req.params.outsourceIdx === undefined → findByPk(undefined)는 null 반환 → 항상 404(레거시 동작 재현).
            const outsource = (outsourceIdx === null || outsourceIdx === undefined)
                ? null
                : await this.prisma.outsourceInfo.findFirst({ where: { outsourceIdx: Number(outsourceIdx) } });

            if (!outsource) {
                return {
                    status: 404,
                    message: '외주업체를 찾을 수 없습니다.',
                };
            }

            logger.info(`[getOutsourceDetail] Outsource detail retrieved: ${outsourceIdx}`);

            return {
                status: 200,
                outsource: outsource,
            };
        } catch (error) {
            logger.error(`[getOutsourceDetail] Error: ${error.message}`);
            throw error;
        }
    }

    async updateOutsource(outsourceIdx: any, updateData: any) {
        try {
            const outsource = await this.prisma.outsourceInfo.findFirst({
                where: { outsourceIdx: Number(outsourceIdx) },
            });

            if (!outsource) {
                return {
                    status: 404,
                    message: '외주업체를 찾을 수 없습니다.',
                };
            }

            // 원본 Sequelize update(updateData)는 모델 속성만 걸러 갱신 — Prisma는 미지의 키에서 에러가 나므로
            // 모델 속성 화이트리스트로 필터링해 동일 동작을 유지한다.
            const data: Record<string, any> = {};
            const stringFields = ['outsourceName', 'outsourceLocation', 'outsourceType', 'outsourceEstablished', 'outsourceCEO', 'outsourceURL', 'outsourceLotAddr', 'outsourceAddr', 'outsourceMapIMG'];
            const numberFields = ['outsourceLatX', 'outsourceLatY', 'outsourceStatus', 'outsourceViewCount'];
            const dateFields = ['createdAt', 'updatedAt'];
            for (const field of stringFields) {
                if (updateData[field] !== undefined) data[field] = updateData[field];
            }
            for (const field of numberFields) {
                if (updateData[field] !== undefined) data[field] = Number(updateData[field]);
            }
            for (const field of dateFields) {
                if (updateData[field] !== undefined) data[field] = new Date(updateData[field]);
            }

            if (Object.keys(data).length > 0) {
                await this.prisma.outsourceInfo.updateMany({
                    where: { outsourceIdx: Number(outsourceIdx) },
                    data,
                });
            }

            logger.info(`[updateOutsource] Outsource updated: ${outsourceIdx}`);

            return {
                status: 200,
                message: '외주업체 정보가 성공적으로 수정되었습니다.',
            };
        } catch (error) {
            logger.error(`[updateOutsource] Error: ${error.message}`);
            throw error;
        }
    }

    async deleteOutsource(outsourceIdx: any) {
        try {
            const result = await this.prisma.outsourceInfo.updateMany({
                where: { outsourceIdx: Number(outsourceIdx) },
                data: { outsourceStatus: 0 },
            });

            if (result.count === 0) {
                return {
                    status: 404,
                    message: '외주업체를 찾을 수 없습니다.',
                };
            }

            logger.info(`[deleteOutsource] Outsource deleted: ${outsourceIdx}`);

            return {
                status: 200,
                message: '외주업체가 성공적으로 삭제되었습니다.',
            };
        } catch (error) {
            logger.error(`[deleteOutsource] Error: ${error.message}`);
            throw error;
        }
    }

    async getOutsourceStats() {
        try {
            // 전체 외주업체 수
            const totalOutsources = await this.prisma.outsourceInfo.count({
                where: { outsourceStatus: 1 },
            });

            // 외주 타입별 통계 (COUNT DESC) — 원본 Sequelize fn('COUNT','*') + group 재현
            const typeRows = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(
                'SELECT `outsourceType` AS `outsourceType`, COUNT(*) AS `count` FROM `tb_outsource_info` WHERE `outsourceStatus` = 1 GROUP BY `outsourceType` ORDER BY COUNT(*) DESC'
            ));

            // 지역별 통계 (COUNT DESC)
            const locationRows = serializeRows(await this.prisma.$queryRawUnsafe<any[]>(
                'SELECT `outsourceLocation` AS `outsourceLocation`, COUNT(*) AS `count` FROM `tb_outsource_info` WHERE `outsourceStatus` = 1 GROUP BY `outsourceLocation` ORDER BY COUNT(*) DESC'
            ));

            // 최근 등록된 외주업체 (최근 5개) — 원본 attributes 순서(outsourceIdx, outsourceName, outsourceType, outsourceLocation) 재현
            const recentRows = await this.prisma.outsourceInfo.findMany({
                where: { outsourceStatus: 1 },
                orderBy: { outsourceIdx: 'desc' },
                take: 5,
                select: { outsourceIdx: true, outsourceName: true, outsourceType: true, outsourceLocation: true },
            });

            logger.info(`[getOutsourceStats] Stats retrieved - Total: ${totalOutsources}`);

            return {
                status: 200,
                stats: {
                    totalOutsources,
                    typeStats: typeRows.map((item: any) => ({
                        type: item.outsourceType,
                        count: parseInt(item.count),
                    })),
                    locationStats: locationRows.map((item: any) => ({
                        location: item.outsourceLocation,
                        count: parseInt(item.count),
                    })),
                    recentOutsources: recentRows.map((item: any) => ({
                        outsourceIdx: item.outsourceIdx,
                        outsourceName: item.outsourceName,
                        outsourceType: item.outsourceType,
                        outsourceLocation: item.outsourceLocation,
                    })),
                },
            };
        } catch (error) {
            logger.error(`[getOutsourceStats] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 추가 요청 관리

    async createOutsourceRequest(requestData: any) {
        try {
            const { outsourceName, outsourceCEO, outsourceType, outsourceAddr } = requestData;

            if (!outsourceName || outsourceName.trim() === '') {
                return {
                    status: 400,
                    message: '외주업체명은 필수입니다.',
                };
            }

            // 중복 요청 체크
            const existingRequest = await this.prisma.outsourceRequest.findFirst({
                where: {
                    outsourceName: outsourceName.trim(),
                    requestStatus: 'pending',
                },
            });

            if (existingRequest) {
                return {
                    status: 409,
                    message: '이미 동일한 외주업체에 대한 요청이 처리 대기중입니다.',
                };
            }

            const newRequest = await this.prisma.outsourceRequest.create({
                data: {
                    outsourceName: outsourceName.trim(),
                    outsourceCEO: outsourceCEO ? outsourceCEO.trim() : null,
                    outsourceType: outsourceType ? outsourceType.trim() : null,
                    outsourceAddr: outsourceAddr ? outsourceAddr.trim() : null,
                    requestStatus: 'pending',
                },
            });

            logger.info(`[createOutsourceRequest] New request created: ${newRequest.requestIdx}`);

            // 원본 Sequelize create 인스턴스 JSON 키 순서 재현:
            // requestDate, requestIdx, outsourceName, outsourceCEO, outsourceType, outsourceAddr, requestStatus
            // (미설정 컬럼 processedDate/adminNote/requestData 는 제외)
            // requestIdx: Prisma Int → number 유지(스키마 타입 규칙). BIGINT가 아니므로 전역 replacer 대상 아님.
            return {
                status: 201,
                message: '외주업체 추가 요청이 성공적으로 등록되었습니다.',
                data: {
                    requestDate: newRequest.requestDate,
                    requestIdx: newRequest.requestIdx,
                    outsourceName: newRequest.outsourceName,
                    outsourceCEO: newRequest.outsourceCEO,
                    outsourceType: newRequest.outsourceType,
                    outsourceAddr: newRequest.outsourceAddr,
                    requestStatus: newRequest.requestStatus,
                },
            };
        } catch (error) {
            logger.error(`[createOutsourceRequest] Error: ${error.message}`);
            throw error;
        }
    }

    async getOutsourceRequests(searchParams: any) {
        try {
            const { status, page = 1, limit = 10 } = searchParams;

            const whereClause: Record<string, any> = {};

            if (status && ['pending', 'completed', 'rejected'].includes(status)) {
                whereClause.requestStatus = status;
            }

            const offset = (page - 1) * limit;

            const count = await this.prisma.outsourceRequest.count({ where: whereClause });
            const rows = await this.prisma.outsourceRequest.findMany({
                where: whereClause,
                orderBy: { requestDate: 'desc' },
                take: parseInt(limit as any),
                skip: parseInt(offset as any),
            });

            logger.info(`[getOutsourceRequests] Found ${count} requests`);

            return {
                status: 200,
                totalCount: count,
                totalPages: Math.ceil(count / (limit as any)),
                currentPage: parseInt(page as any),
                requests: rows,
            };
        } catch (error) {
            logger.error(`[getOutsourceRequests] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 추가 요청 단일 조회
    async getOutsourceRequest(requestIdx: any) {
        try {
            const request = await this.prisma.outsourceRequest.findFirst({
                where: { requestIdx: Number(requestIdx) },
            });

            if (!request) {
                return {
                    status: 404,
                    message: '요청을 찾을 수 없습니다.',
                };
            }

            logger.info(`[getOutsourceRequest] Request retrieved: ${requestIdx}`);

            // requestData가 있으면 파싱해서 모든 정보를 포함
            let requestData: any = null;
            if (request.requestData) {
                // JSON 필드가 이미 파싱되어 있거나 문자열일 수 있음
                if (typeof request.requestData === 'string') {
                    try {
                        requestData = JSON.parse(request.requestData);
                    } catch (e) {
                        logger.warn(`[getOutsourceRequest] Failed to parse requestData: ${e.message}`);
                        requestData = request.requestData;
                    }
                } else {
                    requestData = request.requestData;
                }
            }

            // 기존 필드와 requestData를 합쳐서 반환
            const responseData = {
                requestIdx: request.requestIdx,
                outsourceName: request.outsourceName,
                outsourceCEO: request.outsourceCEO,
                outsourceType: request.outsourceType,
                outsourceAddr: request.outsourceAddr,
                requestStatus: request.requestStatus,
                requestDate: request.requestDate,
                processedDate: request.processedDate,
                adminNote: request.adminNote,
                // requestData의 모든 정보를 포함
                ...(requestData || {}),
            };

            return {
                status: 200,
                data: responseData,
            };
        } catch (error) {
            logger.error(`[getOutsourceRequest] Error: ${error.message}`);
            throw error;
        }
    }

    async updateOutsourceRequestStatus(requestIdx: any, statusData: any) {
        try {
            const { requestStatus, adminNote } = statusData;

            if (!['pending', 'completed', 'rejected'].includes(requestStatus)) {
                return {
                    status: 400,
                    message: '유효하지 않은 상태값입니다. (pending, completed, rejected)',
                };
            }

            const request = await this.prisma.outsourceRequest.findFirst({
                where: { requestIdx: Number(requestIdx) },
            });

            if (!request) {
                return {
                    status: 404,
                    message: '요청을 찾을 수 없습니다.',
                };
            }

            // 승인 시 외주업체 자동 생성
            if (requestStatus === 'completed' && request.requestStatus === 'pending') {
                try {
                    // requestData 파싱
                    let requestData: any = null;
                    if (request.requestData) {
                        if (typeof request.requestData === 'string') {
                            try {
                                requestData = JSON.parse(request.requestData);
                            } catch (e) {
                                logger.warn(`[updateOutsourceRequestStatus] Failed to parse requestData: ${e.message}`);
                                requestData = null; // 파싱 실패 시 null로 설정
                            }
                        } else {
                            requestData = request.requestData;
                        }
                    }

                    // 외주업체명 결정
                    const outsourceName = (requestData && requestData.name) ? requestData.name.trim() : request.outsourceName;

                    if (!outsourceName || outsourceName.trim() === '') {
                        logger.error(`[updateOutsourceRequestStatus] Outsource name is missing for requestIdx: ${requestIdx}`);
                        throw new Error('외주업체명이 없어 외주업체를 생성할 수 없습니다.');
                    }

                    // 이미 동일한 이름의 외주업체가 있는지 확인
                    const existingOutsource = await this.prisma.outsourceInfo.findFirst({
                        where: {
                            outsourceName: outsourceName,
                        },
                    });

                    if (existingOutsource) {
                        logger.warn(`[updateOutsourceRequestStatus] Outsource already exists: ${outsourceName}`);
                        return {
                            status: 409,
                            message: '이미 동일한 이름의 외주업체가 존재합니다.',
                        };
                    }

                    // requestData가 있으면 외주업체 생성
                    if (requestData && typeof requestData === 'object' && Object.keys(requestData).length > 0) {
                        // 지역 추출 (안전하게 처리)
                        let outsourceLocation = '미정';
                        if (requestData.region && typeof requestData.region === 'string') {
                            const regionParts = requestData.region.trim().split(' ');
                            if (regionParts.length > 0 && regionParts[0]) {
                                outsourceLocation = regionParts[0];
                            }
                        } else if (request.outsourceAddr) {
                            const addrParts = request.outsourceAddr.trim().split(' ');
                            if (addrParts.length > 0 && addrParts[0]) {
                                outsourceLocation = addrParts[0];
                            }
                        }

                        // 대표자 정보 처리 (우선순위: outsourceCEO > devInfo.avgDevExperienceYears > request.outsourceCEO)
                        let outsourceCEO = '미정';
                        if (requestData.outsourceCEO && requestData.outsourceCEO.trim() !== '' && requestData.outsourceCEO !== '-') {
                            outsourceCEO = requestData.outsourceCEO.trim();
                        } else if (requestData.devInfo && requestData.devInfo.avgDevExperienceYears) {
                            outsourceCEO = `평균 ${requestData.devInfo.avgDevExperienceYears}년 경력`;
                        } else if (request.outsourceCEO && request.outsourceCEO.trim() !== '' && request.outsourceCEO !== '-') {
                            outsourceCEO = request.outsourceCEO.trim();
                        }

                        // URL 처리
                        const outsourceURL = (requestData.websiteUrl || requestData.mainPortfolioUrl || '').trim();

                        // requestData를 OutsourceInfo 구조로 매핑
                        const outsourceInfoData = {
                            outsourceName: outsourceName,
                            outsourceLocation: outsourceLocation,
                            outsourceType: (requestData.category || request.outsourceType || '기타').trim(),
                            outsourceEstablished: '미정',
                            outsourceCEO: outsourceCEO,
                            outsourceLatX: 0.0,
                            outsourceLatY: 0.0,
                            outsourceURL: outsourceURL,
                            outsourceLotAddr: '',
                            outsourceAddr: (requestData.region || request.outsourceAddr || '').trim(),
                            outsourceMapIMG: null,
                            outsourceStatus: 1,
                            outsourceViewCount: 0,
                        };

                        logger.info(`[updateOutsourceRequestStatus] Creating outsource with data: ${JSON.stringify(outsourceInfoData)}`);

                        // 외주업체 생성
                        const createdOutsource = await this.prisma.outsourceInfo.create({ data: outsourceInfoData });
                        logger.info(`[updateOutsourceRequestStatus] Outsource created successfully: ${createdOutsource.outsourceIdx} - ${outsourceInfoData.outsourceName}`);
                    } else {
                        // requestData가 없으면 기존 필드로 외주업체 생성
                        // 지역 추출 (안전하게 처리)
                        let outsourceLocation = '미정';
                        if (request.outsourceAddr) {
                            const addrParts = request.outsourceAddr.trim().split(' ');
                            if (addrParts.length > 0 && addrParts[0]) {
                                outsourceLocation = addrParts[0];
                            }
                        }

                        // 대표자 정보 처리
                        const outsourceCEO = (request.outsourceCEO && request.outsourceCEO.trim() !== '' && request.outsourceCEO !== '-')
                            ? request.outsourceCEO.trim()
                            : '미정';

                        const outsourceInfoData = {
                            outsourceName: outsourceName,
                            outsourceLocation: outsourceLocation,
                            outsourceType: (request.outsourceType || '기타').trim(),
                            outsourceEstablished: '미정',
                            outsourceCEO: outsourceCEO,
                            outsourceLatX: 0.0,
                            outsourceLatY: 0.0,
                            outsourceURL: '',
                            outsourceLotAddr: '',
                            outsourceAddr: (request.outsourceAddr || '').trim(),
                            outsourceMapIMG: null,
                            outsourceStatus: 1,
                            outsourceViewCount: 0,
                        };

                        logger.info(`[updateOutsourceRequestStatus] Creating outsource (legacy) with data: ${JSON.stringify(outsourceInfoData)}`);

                        const createdOutsource = await this.prisma.outsourceInfo.create({ data: outsourceInfoData });
                        logger.info(`[updateOutsourceRequestStatus] Outsource created (legacy) successfully: ${createdOutsource.outsourceIdx} - ${outsourceInfoData.outsourceName}`);
                    }
                } catch (error) {
                    logger.error(`[updateOutsourceRequestStatus] Failed to create outsource for requestIdx ${requestIdx}: ${error.message}`);
                    logger.error(`[updateOutsourceRequestStatus] Error stack: ${error.stack}`);
                    // 외주업체 생성 실패해도 요청 상태는 업데이트 (관리자가 수동으로 처리할 수 있도록)
                    // 하지만 에러를 다시 throw하여 클라이언트에 알림
                    throw new Error(`외주업체 생성 중 오류가 발생했습니다: ${error.message}`);
                }
            }

            const updateData: Record<string, any> = {
                requestStatus,
                adminNote: adminNote || null,
            };

            if (requestStatus === 'completed') {
                updateData.processedDate = new Date();
            }

            await this.prisma.outsourceRequest.updateMany({
                where: { requestIdx: Number(requestIdx) },
                data: updateData,
            });

            logger.info(`[updateOutsourceRequestStatus] Request status updated: ${requestIdx} -> ${requestStatus}`);

            return {
                status: 200,
                message: '요청 상태가 성공적으로 업데이트되었습니다.',
            };
        } catch (error) {
            logger.error(`[updateOutsourceRequestStatus] Error: ${error.message}`);
            throw error;
        }
    }
}
