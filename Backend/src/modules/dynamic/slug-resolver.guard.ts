// Backend/middlewares/slugResolver.js의 Nest 가드 포팅.
// 원본은 미들웨어지만, 어드민 라우트에서 authenticateToken→isAdmin→slugResolver 순서를
// 보존하려면 가드여야 한다(Nest 미들웨어는 가드보다 먼저 실행됨). 퍼블릭 라우트에도 동일 가드 사용.
// :slug 검증 → service_configs(active) 조회 → req에 serviceConfig/fieldConfigs/dynamicTables 주입.
// 5분 메모리 캐시(모듈 레벨 — 원본과 동일). 사가가 설정 변경 시 invalidateCache()로 무효화.
//
// 응답 형태 보존: 원본은 res.status(400/404/500).json(...)로 직접 응답. 가드에서는 동일 바디의
// HttpException을 throw → AllExceptionsFilter가 그대로 방출(상태코드+바디 동일).
import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { validateSlug, getDynamicTableNames } from '../../common/utils/slug-validator.util';
import { logger } from '../../logger/winston.logger';

interface CacheEntry {
    config: any;
    fields: any[];
    tables: ReturnType<typeof getDynamicTableNames>;
    cachedAt: number;
}

// 5분 캐시 (slug -> { config, fields, tables, cachedAt }) — 모듈 레벨(원본과 동일)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

function clearExpired() {
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (now - entry.cachedAt > CACHE_TTL) {
            cache.delete(key);
        }
    }
}

// 주기적 캐시 정리 (10분마다) — unref로 프로세스 종료를 막지 않음
setInterval(clearExpired, 10 * 60 * 1000).unref();

// 캐시 무효화 (서비스 설정 변경 시 호출) — 원본 export와 동일
export function invalidateCache(slug?: string): void {
    if (slug) {
        cache.delete(slug);
    } else {
        cache.clear();
    }
}

@Injectable()
export class SlugResolverGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const slug = req.params.slug;

        // 1. slug 형식 검증
        const validation = validateSlug(slug);
        if (!validation.valid) {
            throw new HttpException({ status: 400, message: validation.error }, 400);
        }

        try {
            // 2. 캐시 확인
            const now = Date.now();
            const cached = cache.get(slug);
            if (cached && (now - cached.cachedAt < CACHE_TTL)) {
                req.serviceConfig = cached.config;
                req.fieldConfigs = cached.fields;
                req.dynamicTables = cached.tables;
                return true;
            }

            // 3. DB 조회
            const config = await this.prisma.serviceConfig.findFirst({
                where: { slug, status: 'active' },
            });

            if (!config) {
                throw new HttpException({ status: 404, message: `서비스 '${slug}'를 찾을 수 없습니다.` }, 404);
            }

            const fields = await this.prisma.serviceFieldConfig.findMany({
                where: { serviceId: config.serviceId },
                orderBy: { sortOrder: 'asc' },
            });

            const tables = getDynamicTableNames(slug);

            // 4. 캐시 저장
            cache.set(slug, { config, fields, tables, cachedAt: now });

            // 5. req 주입
            req.serviceConfig = config;
            req.fieldConfigs = fields;
            req.dynamicTables = tables;

            return true;
        } catch (error) {
            // 이미 만든 HttpException(400/404)은 그대로 전파
            if (error instanceof HttpException) throw error;
            logger.error(`[slugResolver] Error for slug '${slug}': ${error.message}`);
            throw new HttpException({ status: 500, message: '서버 오류가 발생했습니다.' }, 500);
        }
    }
}
