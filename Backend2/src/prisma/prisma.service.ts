// 런타임 DB 연결: 구 스택과 동일하게 RDB_* 환경변수를 소스로 사용한다.
// (.env의 DATABASE_URL은 Prisma CLI 전용)
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/winston.logger';

// 슬로우 쿼리 임계값(ms). 0 이면 비활성화. 측정 전용 — 쿼리/응답에는 영향 없음
const SLOW_QUERY_MS = parseInt(process.env.PRISMA_SLOW_QUERY_MS || '500', 10);

function buildDatabaseUrl(): string {
    // 'localhost' 는 IPv6(::1) 우선 해석으로 새 커넥션 연결이 수십 초 지연될 수 있어 항상 IPv4 루프백으로 고정한다.
    // (구 스택은 Sequelize 에 host 를 넘기지 않아 사실상 localhost/IPv4 로 붙었다)
    const rawHost = process.env.RDB_HOST || '127.0.0.1';
    const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
    const port = process.env.RDB_PORT || '3306';
    const user = process.env.RDB_USERNAME || '';
    const pass = encodeURIComponent(process.env.RDB_PASSWORD || '');
    const db = process.env.RDB_DATABASE || '';
    // 커넥션 풀 크기: 기본(CPU*2+1)이 1~2 vCPU 서버에서는 3~5개라 동시 요청이 대기한다. RDB_POOL_MAX 로 조정(기본 10)
    const poolMax = parseInt(process.env.RDB_POOL_MAX || '10', 10);
    const poolTimeout = parseInt(process.env.RDB_POOL_TIMEOUT || '30', 10);
    return `mysql://${user}:${pass}@${host}:${port}/${db}?connection_limit=${poolMax}&pool_timeout=${poolTimeout}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            datasources: { db: { url: buildDatabaseUrl() } },
            ...(SLOW_QUERY_MS > 0 ? { log: [{ emit: 'event' as const, level: 'query' as const }] } : {}),
        });

        // 임계값을 넘은 쿼리만 SQL(파라미터 제외)과 소요시간을 남긴다
        if (SLOW_QUERY_MS > 0) {
            (this as any).$on('query', (e: any) => {
                if (e.duration >= SLOW_QUERY_MS) {
                    logger.warn(`[SlowQuery] ${e.duration}ms ${String(e.query).replace(/\s+/g, ' ').slice(0, 1000)}`);
                }
            });
        }
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
