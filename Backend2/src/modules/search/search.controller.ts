// Backend/routes/search.router.js + controller/searchController.js의 포팅.
// 응답 상태코드/바디를 원본과 동일하게 유지하기 위해 @Res()로 직접 응답한다.
// 원본이 compService/churchService/outsourceService로 위임하던 로직은 SearchService에 통합했다.
import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SearchService } from './search.service';
import { logger } from '../../logger/winston.logger';

@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    // 자동 완성 검색 (학교)
    @Get('auto')
    async autoComplete(@Req() req: Request, @Res() res: Response) {
        try {
            const { keyword } = req.query as Record<string, string>;

            if (!keyword) {
                logger.warn('[autoComplete] Missing keyword in request');
                return res.status(400).json({ error: 'Keyword is required' });
            }

            const decodedKeyword = decodeURIComponent(keyword);
            const schools = await this.searchService.autoComplete(decodedKeyword);

            return res.status(200).json(schools);
        } catch (error) {
            logger.error(`[autoComplete] ${error.message}`);
            return res.status(500).json({ error: error });
        }
    }

    // 학교 정보 검색
    @Get('school')
    async getSchoolInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const { univName } = req.query as Record<string, string>;

            if (!univName) {
                logger.warn('[getSchoolInfo] Missing univName in request');
                return res.status(400).json({ error: 'univName is required' });
            }

            const decodedUnivName = decodeURIComponent(univName);
            const schoolInfo = await this.searchService.getSchoolInfo(decodedUnivName);

            if (!schoolInfo) {
                return res.status(404).json({ error: 'University not found' });
            }

            return res.status(200).json(schoolInfo);
        } catch (error) {
            logger.error(`[getSchoolInfo] ${error.message}`);
            return res.status(500).json({ error: error });
        }
    }

    // univViewCount 높은 순으로 상위 10개 대학교 조회
    @Get('top-viewed')
    async getTopViewedUniversities(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.searchService.getTopViewedUniversities();

            logger.info(`[getTopViewedUniversities] 상위 10개 대학교 조회 성공: ${result.totalCount}개`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getTopViewedUniversities] Error: ${error.message}`);
            return res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message,
            });
        }
    }

    // 회사 검색 (일반 사용자용)
    @Get('comp')
    async searchCompany(@Req() req: Request, @Res() res: Response) {
        try {
            const { compName } = req.query as Record<string, string>;

            if (!compName) {
                logger.warn('[searchCompany] Missing compName in request');
                return res.status(400).json({ error: 'compName is required' });
            }

            const decodedCompName = decodeURIComponent(compName);
            const result = await this.searchService.searchCompany(decodedCompName);

            return res.status(200).json(result);
        } catch (error) {
            logger.error(`[searchCompany] ${error.message}`);
            return res.status(500).json({
                error: '서버 오류가 발생했습니다.',
                message: error.message,
            });
        }
    }

    // 회사 상세보기 (일반 유저용) - compIdx 기반
    @Get('comp/:compIdx')
    async getCompanyDetail(@Req() req: Request, @Res() res: Response, @Param('compIdx') compIdx: string) {
        try {
            if (!compIdx) {
                logger.warn('[getCompanyDetail] Missing compIdx in request');
                return res.status(400).json({ error: 'compIdx is required' });
            }

            const result = await this.searchService.getCompDetail(compIdx);

            if (result.status === 404) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            logger.error(`[getCompanyDetail] ${error.message}`);
            return res.status(500).json({
                error: '서버 오류가 발생했습니다.',
                message: error.message,
            });
        }
    }

    // 교회 자동 검색
    @Get('church/auto')
    async autoCompleteChurch(@Req() req: Request, @Res() res: Response) {
        try {
            const { keyword } = req.query as Record<string, string>;

            if (!keyword) {
                logger.warn('[autoCompleteChurch] Missing keyword in request');
                return res.status(400).json({ error: 'Keyword is required' });
            }

            const decodedKeyword = decodeURIComponent(keyword);
            const churches = await this.searchService.autoCompleteChurch(decodedKeyword);

            return res.status(200).json(churches);
        } catch (error) {
            logger.error(`[autoCompleteChurch] ${error.message}`);
            return res.status(500).json({ error: error });
        }
    }

    // 교회 정보 조회
    @Get('church/info')
    async getChurchInfo(@Req() req: Request, @Res() res: Response) {
        try {
            const { churchName } = req.query as Record<string, string>;

            if (!churchName) {
                logger.warn('[getChurchInfo] Missing churchName in request');
                return res.status(400).json({ error: 'churchName is required' });
            }

            const decodedChurchName = decodeURIComponent(churchName);
            const churchInfo = await this.searchService.getChurchInfoByName(decodedChurchName);

            if (!churchInfo) {
                return res.status(404).json({ error: 'Church not found' });
            }

            return res.status(200).json(churchInfo);
        } catch (error) {
            logger.error(`[getChurchInfo] ${error.message}`);
            return res.status(500).json({ error: error });
        }
    }

    // 외주업체 자동 완성 검색
    @Get('outsource/auto')
    async autoCompleteOutsource(@Req() req: Request, @Res() res: Response) {
        try {
            const { keyword } = req.query as Record<string, string>;

            if (!keyword) {
                logger.warn('[autoCompleteOutsource] Missing keyword in request');
                return res.status(400).json({ error: 'Keyword is required' });
            }

            const decodedKeyword = decodeURIComponent(keyword);
            const outsources = await this.searchService.autoCompleteOutsource(decodedKeyword);

            return res.status(200).json(outsources);
        } catch (error) {
            logger.error(`[autoCompleteOutsource] ${error.message}`);
            return res.status(500).json({ error: error });
        }
    }

    // 교회 조회수 높은 순으로 상위 10개 교회 조회
    @Get('church/top-viewed')
    async getTopViewedChurches(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.searchService.getTopViewedChurches();

            logger.info(`[getTopViewedChurches] 상위 10개 교회 조회 성공: ${result.totalCount}개`);

            return res.status(result.status).json(result);
        } catch (error) {
            logger.error(`[getTopViewedChurches] Error: ${error.message}`);
            return res.status(500).json({
                status: 500,
                error: '서버 오류가 발생했습니다.',
                message: error.message,
            });
        }
    }
}
