// $queryRaw 결과를 구 스택(mariadb 드라이버 + bigNumberStrings)과 동일한 JSON 형태로 맞추는 헬퍼.
// 구 스택: BIGINT/DECIMAL → 문자열. Prisma raw: BIGINT → BigInt, DECIMAL → Prisma.Decimal → 변환 필요.
import { Prisma } from '@prisma/client';

export function serializeValue(value: any): any {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (value instanceof Prisma.Decimal) {
        return value.toString();
    }
    if (value instanceof Date) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(serializeValue);
    }
    if (value && typeof value === 'object') {
        return serializeRow(value);
    }
    return value;
}

export function serializeRow<T = any>(row: Record<string, any>): T {
    const out: Record<string, any> = {};
    for (const key of Object.keys(row)) {
        out[key] = serializeValue(row[key]);
    }
    return out as T;
}

export function serializeRows<T = any>(rows: Record<string, any>[]): T[] {
    return rows.map(r => serializeRow<T>(r));
}
