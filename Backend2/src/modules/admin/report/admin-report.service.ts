// Backend/service/admin/reportService.js의 Prisma 포팅.
// reportIdx/boardIdx BIGINT → 전역 replacer 문자열화. isDeleted는 Prisma도 Boolean이라 그대로.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';

@Injectable()
export class AdminReportService {
    constructor(private readonly prisma: PrismaService) {}

    // 신고 게시판 생성
    async createReport(data: any) {
        try {
            const { boardIdx, serviceType, reportType, reportReason, reporterId } = data;

            // serviceType 또는 reportType 중 하나는 있어야 함
            const finalServiceType = serviceType || reportType;

            if (!boardIdx || !finalServiceType || !reportReason) {
                logger.warn(`[createReport] 필수값 누락됨: ${JSON.stringify(data)}`);
                throw new Error('필수값이 누락되었습니다. (boardIdx, serviceType/reportType, reportReason)');
            }

            const created = await this.prisma.reportBoard.create({
                data: {
                    boardIdx: BigInt(boardIdx),
                    serviceType: finalServiceType,
                    reportReason,
                    reporterId,
                    reportStatus: 'pending',
                    isDeleted: false,
                },
            });

            logger.info(`[createReport] 신고 등록 완료: reportIdx=${created.reportIdx}`);
            return { status: 201, message: '신고 등록 완료', data: created };
        } catch (error) {
            logger.error(`[createReport] Error: ${error.message}`);
            throw error;
        }
    }

    // 신고 리스트 조회 (페이징)
    async getReports(query: any) {
        try {
            const rowsPerPage = parseInt(query.rowsPerPage, 10) || 10;
            const page = parseInt(query.page, 10) || 1;
            const offset = (page - 1) * rowsPerPage;

            const { serviceType, reportStatus } = query;

            const where: Record<string, any> = {};
            if (serviceType) where.serviceType = serviceType;
            if (reportStatus) where.reportStatus = reportStatus;

            const count = await this.prisma.reportBoard.count({ where });
            const rows = await this.prisma.reportBoard.findMany({
                where,
                take: rowsPerPage,
                skip: offset,
                orderBy: { reportDate: 'desc' },
            });

            logger.info(`[getReports] 신고 리스트 조회: 총 ${count}건`);

            return {
                status: 200,
                data: rows,
                totalCount: count,
                currentPage: page,
                rowsPerPage,
            };
        } catch (error) {
            logger.error(`[getReports] Error: ${error.message}`);
            throw error;
        }
    }

    // 신고 상세 조회 (serviceType='univ'면 UnivBoard 첨부)
    async getReportDetail(query: any) {
        try {
            const { reportIdx } = query;
            const report = await this.prisma.reportBoard.findFirst({ where: { reportIdx: Number(reportIdx) } });
            if (!report) {
                logger.warn(`[getReportDetail] 신고 정보 없음: reportIdx=${reportIdx}`);
                return { status: 404, message: '신고 정보를 찾을 수 없습니다.' };
            }

            let board: any = null;

            switch (report.serviceType) {
                case 'univ':
                    board = await this.prisma.univBoard.findFirst({ where: { boardIdx: Number(report.boardIdx) } });
                    break;
                // case 'company': (원본 주석 처리됨)
                default:
                    logger.warn(`[getReportDetail] 알 수 없는 서비스 타입: ${report.serviceType}`);
            }

            return {
                status: 200,
                data: {
                    report,
                    board,
                },
            };
        } catch (error) {
            logger.error(`[getReportDetail] Error: ${error.message}`);
            throw error;
        }
    }

    // 신고 처리 상태 업데이트
    async updateReportStatus(data: any) {
        try {
            const { reportIdx, reportStatus, reportResult } = data;
            const report = await this.prisma.reportBoard.findFirst({ where: { reportIdx: Number(reportIdx) } });
            if (!report) {
                logger.warn(`[updateReportStatus] 신고 정보 없음: reportIdx=${reportIdx}`);
                return { status: 404, message: '신고 정보를 찾을 수 없습니다.' };
            }

            if (!reportStatus && !reportResult) {
                throw new Error('업데이트할 항목이 없습니다.');
            }

            const updateData: Record<string, any> = {};
            if (reportStatus) updateData.reportStatus = reportStatus;
            if (reportResult) updateData.reportResult = reportResult;

            await this.prisma.reportBoard.updateMany({ where: { reportIdx: Number(reportIdx) }, data: updateData });
            // 갱신된 레코드를 다시 조회해 반환 (원본은 save()된 인스턴스를 반환)
            const updated = await this.prisma.reportBoard.findFirst({ where: { reportIdx: Number(reportIdx) } });

            logger.info(`[updateReportStatus] 신고 상태 업데이트 완료: reportIdx=${reportIdx}`);
            return {
                status: 200,
                message: '신고 상태 업데이트 완료',
                data: updated,
            };
        } catch (error) {
            logger.error(`[updateReportStatus] Error: ${error.message}`);
            throw error;
        }
    }

    // 신고 게시판 삭제
    async deleteReportBoard(body: any) {
        try {
            const { reportIdx } = body;
            const report = await this.prisma.reportBoard.findFirst({ where: { reportIdx: Number(reportIdx) } });

            if (!report) {
                logger.warn(`[deleteReportBoard] 신고 정보 없음: reportIdx=${reportIdx}`);
                return { status: 404, message: '신고 정보를 찾을 수 없습니다.' };
            }

            await this.prisma.reportBoard.deleteMany({ where: { reportIdx: Number(reportIdx) } });
            logger.info(`[deleteReportBoard] 신고 게시판 삭제 완료: reportIdx=${reportIdx}`);
            return { status: 200, message: '신고 게시판 삭제 완료' };
        } catch (error) {
            logger.error(`[deleteReportBoard] Error: ${error.message}`);
            throw error;
        }
    }
}
