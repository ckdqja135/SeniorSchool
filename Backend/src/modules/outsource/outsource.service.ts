// Backend/service/outsourceService.js의 Prisma 포팅.
// 라우터(routes/outsource.router.js)에서 실제 사용되는 함수만 포팅한다:
// getOutsources / getOutsourceDetail / getTopViewedOutsources / updateOutsource / deleteOutsource / createOutsourceRequest
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../logger/winston.logger';

@Injectable()
export class OutsourceService {
    constructor(private readonly prisma: PrismaService) {}

    // 외주업체 목록 조회
    async getOutsources(searchParams: { name?: string; type?: string; location?: string; limit?: string } = {}) {
        try {
            const whereClause: Record<string, any> = { outsourceStatus: 1 }; // 활성화된 외주업체만

            const { name, type, location, limit } = searchParams;

            if (name && name.trim() !== '') {
                whereClause.outsourceName = { contains: name.trim() };
                logger.info(`[getOutsources] Name search applied: "${name.trim()}"`);
            }

            if (type && type.trim() !== '') {
                whereClause.outsourceType = type.trim();
                logger.info(`[getOutsources] Type search applied: "${type.trim()}"`);
            }

            if (location && location.trim() !== '') {
                whereClause.outsourceLocation = { contains: location.trim() };
                logger.info(`[getOutsources] Location search applied: "${location.trim()}"`);
            }

            // limit 파라미터 처리
            const queryOptions: Record<string, any> = {
                where: whereClause,
                orderBy: { outsourceName: 'asc' } // 외주업체명 순 정렬
            };

            if (limit && !isNaN(parseInt(limit))) {
                queryOptions.take = parseInt(limit);
                logger.info(`[getOutsources] Limit applied: ${limit}`);
            }

            const outsources = await this.prisma.outsourceInfo.findMany(queryOptions as any);

            logger.info(`[getOutsources] Found ${outsources.length} outsources`);
            return outsources;
        } catch (error) {
            logger.error(`[getOutsources] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 상세 조회
    async getOutsourceDetail(outsourceIdx: any, outsourceName?: string, outsourceAddr?: string) {
        try {
            const whereClause: Record<string, any> = { outsourceStatus: 1 };

            // 검색 조건 구성
            if (outsourceIdx) {
                whereClause.outsourceIdx = Number(outsourceIdx);
            } else if (outsourceName) {
                whereClause.outsourceName = outsourceName;
            } else if (outsourceAddr) {
                whereClause.outsourceAddr = outsourceAddr;
            }

            const outsource = await this.prisma.outsourceInfo.findFirst({
                where: whereClause
            });

            if (!outsource) {
                throw new Error('Outsource not found');
            }

            // 조회수 증가 — 원본은 updatedAt: literal('updated_at')으로 updated_at을 건드리지 않는다 (실측 확인)
            await this.prisma.$executeRawUnsafe(
                'UPDATE `tb_outsource_info` SET `outsourceViewCount` = outsourceViewCount + 1, `updated_at` = updated_at WHERE `outsourceIdx` = ?',
                outsource.outsourceIdx
            );

            logger.info(`[getOutsourceDetail] Outsource detail retrieved. OutsourceIdx: ${outsource.outsourceIdx}, OutsourceName: ${outsource.outsourceName}`);
            return outsource; // 조회수 증가 전 값을 반환 (원본과 동일)
        } catch (error) {
            logger.error(`[getOutsourceDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 수정
    // 원본은 Sequelize update(outsourceData)로 모델 속성만 걸러 갱신 — Prisma는 미지의 키에서 에러가 나므로
    // 모델 속성 화이트리스트로 필터링해 동일 동작을 유지한다.
    async updateOutsource(outsourceIdx: any, outsourceData: any) {
        try {
            const outsource = await this.prisma.outsourceInfo.findFirst({
                where: { outsourceIdx: Number(outsourceIdx) }
            });

            if (!outsource) {
                throw new Error('Outsource not found');
            }

            const updateData: Record<string, any> = {};
            const stringFields = ['outsourceName', 'outsourceLocation', 'outsourceType', 'outsourceEstablished', 'outsourceCEO', 'outsourceURL', 'outsourceLotAddr', 'outsourceAddr', 'outsourceMapIMG'];
            const numberFields = ['outsourceLatX', 'outsourceLatY', 'outsourceStatus', 'outsourceViewCount'];
            const dateFields = ['createdAt', 'updatedAt'];
            for (const field of stringFields) {
                if (outsourceData[field] !== undefined) updateData[field] = outsourceData[field];
            }
            for (const field of numberFields) {
                if (outsourceData[field] !== undefined) updateData[field] = Number(outsourceData[field]);
            }
            for (const field of dateFields) {
                if (outsourceData[field] !== undefined) updateData[field] = new Date(outsourceData[field]);
            }

            if (Object.keys(updateData).length > 0) {
                await this.prisma.outsourceInfo.updateMany({
                    where: { outsourceIdx: Number(outsourceIdx) },
                    data: updateData
                });
            }

            logger.info(`[updateOutsource] Outsource updated. OutsourceIdx: ${outsourceIdx}`);
            return { success: true, message: '외주업체가 수정되었습니다.' };
        } catch (error) {
            logger.error(`[updateOutsource] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 삭제 (상태 변경)
    async deleteOutsource(outsourceIdx: any) {
        try {
            const result = await this.prisma.outsourceInfo.updateMany({
                where: { outsourceIdx: Number(outsourceIdx) },
                data: { outsourceStatus: 0 }
            });

            if (result.count === 0) {
                throw new Error('Outsource not found');
            }

            logger.info(`[deleteOutsource] Outsource deleted. OutsourceIdx: ${outsourceIdx}`);
            return { success: true, message: '외주업체가 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[deleteOutsource] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 추가 요청 생성
    async createOutsourceRequest(requestData: any) {
        try {
            const {
                name,
                outsourceCEO, // 대표자명 (공통 필드)
                tagline,
                category,
                contactEmail,
                isPublic,
                region,
                // 개발 분야 전용 필드
                devInfo,
                govSupport,
                // 기타 분야 필드
                customCategory
            } = requestData;

            // 공통 필수 필드 검증
            if (!name || name.trim() === '') {
                throw new Error('업체명(name)은 필수입니다.');
            }

            if (!tagline || tagline.trim() === '') {
                throw new Error('한 줄 소개(tagline)는 필수입니다.');
            }

            if (!category || category.trim() === '') {
                throw new Error('분야(category)는 필수입니다.');
            }

            if (!contactEmail || contactEmail.trim() === '') {
                throw new Error('연락 이메일(contactEmail)은 필수입니다.');
            }

            if (typeof isPublic !== 'boolean') {
                throw new Error('공개 여부(isPublic)는 필수이며 boolean 값이어야 합니다.');
            }

            // 카테고리별 필수 필드 검증
            if (category === 'DEVELOPMENT') {
                // 개발 분야 필수 필드
                if (!devInfo) {
                    throw new Error('개발 분야는 devInfo가 필수입니다.');
                }

                if (!devInfo.techStackSummary || !Array.isArray(devInfo.techStackSummary) || devInfo.techStackSummary.length === 0) {
                    throw new Error('devInfo.techStackSummary는 1개 이상 필수입니다.');
                }

                // 정부지원사업 정보 검증
                if (govSupport && govSupport.hasGovSupportExperience === true) {
                    if (!govSupport.govSupportPrograms || !Array.isArray(govSupport.govSupportPrograms) || govSupport.govSupportPrograms.length === 0) {
                        throw new Error('정부지원사업 경험이 있으면 govSupportPrograms는 필수입니다.');
                    }
                }
            } else {
                // 개발 분야가 아닐 때
                const validCategories = ['DESIGN', 'MARKETING', 'VIDEO', 'CONSULTING', 'OTHER'];
                if (!validCategories.includes(category)) {
                    throw new Error(`유효하지 않은 카테고리입니다. 허용된 값: ${validCategories.join(', ')}`);
                }

                // OTHER 카테고리일 때 customCategory 필수
                if (category === 'OTHER') {
                    if (!customCategory || customCategory.trim() === '') {
                        throw new Error('기타 분야를 선택한 경우 customCategory는 필수입니다.');
                    }
                }
            }

            // 중복 요청 체크 (pending 상태인 동일 업체명)
            const existingRequest = await this.prisma.outsourceRequest.findFirst({
                where: {
                    outsourceName: name.trim(),
                    requestStatus: 'pending'
                }
            });

            if (existingRequest) {
                return {
                    success: false,
                    message: '이미 동일한 외주업체에 대한 요청이 처리 대기중입니다.'
                };
            }

            // 기존 필드 호환성을 위해 매핑 (하위 호환성 유지)
            const outsourceName = name.trim();
            const outsourceCEOValue = outsourceCEO ? outsourceCEO.trim() : null;
            const outsourceType = category; // 카테고리를 타입으로 사용
            const outsourceAddr = region ? region.trim() : null;

            // 새 요청 생성 (모든 데이터를 JSON으로 저장)
            // 원본 Sequelize JSON 타입 → Prisma LONGTEXT String이므로 수동 stringify/parse
            const newRequest = await this.prisma.outsourceRequest.create({
                data: {
                    outsourceName: outsourceName,
                    outsourceCEO: outsourceCEOValue,
                    outsourceType: outsourceType,
                    outsourceAddr: outsourceAddr,
                    requestStatus: 'pending',
                    requestData: JSON.stringify(requestData) // 전체 요청 데이터를 JSON으로 저장
                }
            });

            logger.info(`[createOutsourceRequest] New outsource request created. RequestIdx: ${newRequest.requestIdx}, Name: ${name}, Category: ${category}`);

            // 원본 Sequelize 인스턴스 JSON에는 미설정 컬럼(processedDate/adminNote)이 빠지고
            // requestData가 객체로 노출된다 — 동일 형태로 구성.
            const { processedDate, adminNote, ...createdFields } = newRequest;
            return {
                success: true,
                message: '외주업체 추가 요청이 성공적으로 등록되었습니다.',
                data: { ...createdFields, requestData: requestData }
            };
        } catch (error) {
            logger.error(`[createOutsourceRequest] Error: ${error.message}`);
            throw error;
        }
    }

    // 외주업체 조회수 기준 TOP 조회
    async getTopViewedOutsources() {
        try {
            const outsources = await this.prisma.outsourceInfo.findMany({
                where: {
                    outsourceStatus: 1 // 활성화된 외주업체만
                },
                orderBy: { outsourceViewCount: 'desc' },
                take: 10 // 10개 고정
            });

            logger.info(`[getTopViewedOutsources] Found ${outsources.length} top viewed outsources`);
            return outsources;
        } catch (error) {
            logger.error(`[getTopViewedOutsources] Error: ${error.message}`);
            throw error;
        }
    }
}
