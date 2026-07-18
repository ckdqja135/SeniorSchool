// 런타임 DB 연결: 구 스택과 동일하게 RDB_* 환경변수를 소스로 사용한다.
// (.env의 DATABASE_URL은 Prisma CLI 전용)
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function buildDatabaseUrl(): string {
    const host = process.env.RDB_HOST || '127.0.0.1';
    const port = process.env.RDB_PORT || '3306';
    const user = process.env.RDB_USERNAME || '';
    const pass = encodeURIComponent(process.env.RDB_PASSWORD || '');
    const db = process.env.RDB_DATABASE || '';
    return `mysql://${user}:${pass}@${host}:${port}/${db}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            datasources: { db: { url: buildDatabaseUrl() } },
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
