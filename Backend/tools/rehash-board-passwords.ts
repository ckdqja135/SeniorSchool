/**
 * 게시글·댓글 비밀번호 일괄 변환: sha256 → bcrypt(sha256)  (한 번만 돌리면 되는 스크립트)
 *
 * 저장된 sha256 값을 bcrypt 로 한 번 더 감싼다 (src/common/utils/hash-password.util.ts 참고).
 * 원래 비밀번호를 몰라도 바꿀 수 있고, 이용자는 쓰던 비밀번호를 그대로 쓴다.
 *
 *  - 이미 bcrypt 인 행, sha256 모양이 아닌 행(빈 값 등)은 건드리지 않는다 → 여러 번 돌려도 안전
 *  - 행마다 "값이 그대로일 때만" 바꾼다 — 도는 사이 이용자가 글을 고쳐 새 값이 들어갔으면 건너뛴다
 *  - 서버를 먼저 배포한 뒤 돌린다. 새 서버는 sha256·bcrypt 둘 다 확인하므로 도중에 멈춰도 로그인(수정·삭제)이 깨지지 않는다
 *  - 대상: 정적 게시판 13개 테이블 + 동적 서비스(service_configs)의 게시글·댓글 테이블
 *
 * 실행 (Backend 디렉터리, 운영 DB 접속 정보 RDB_* 가 .env 에 있는 곳에서):
 *   npx ts-node -T tools/rehash-board-passwords.ts --dry-run   # 바꿀 행 수만 센다
 *   npx ts-node -T tools/rehash-board-passwords.ts             # 실제 변환
 *
 * bcrypt 는 일부러 느리다(한 건에 수십 ms). 수만 건이면 수십 분 걸릴 수 있다.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

// .env 를 읽은 뒤에 불러와야 PrismaService 가 RDB_* 로 접속 주소를 만든다
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaService } = require('../src/prisma/prisma.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isLegacyBoardHash, wrapLegacyBoardHash } = require('../src/common/utils/hash-password.util');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDynamicTableNames } = require('../src/common/utils/slug-validator.util');

interface Target {
    /** 백틱 포함 테이블 이름 */
    table: string;
    pk: string;
    pw: string;
}

const STATIC_TARGETS: Target[] = [
    ['tb_church_board', 'boardIdx', 'boardPW'],
    ['tb_church_comment', 'commentIdx', 'writerPw'],
    ['tb_outsource_board', 'boardIdx', 'boardPW'],
    ['tb_outsource_comment', 'commentIdx', 'writerPw'],
    ['tb_univboard', 'boardIdx', 'boardPW'],
    ['tb_univcomment', 'commentIdx', 'writerPw'],
    ['tb_comp_board', 'boardIdx', 'boardPW'],
    ['tb_comp_comment', 'commentIdx', 'writerPw'],
    ['tb_comp_interview', 'interviewIdx', 'writerPw'],
    ['tb_freeboard', 'boardIdx', 'boardPW'],
    ['tb_freeboard_comment', 'commentIdx', 'writerPw'],
    ['tb_restaurant_board', 'boardIdx', 'boardPW'],
    ['tb_restaurant_comment', 'commentIdx', 'writerPw'],
].map(([t, pk, pw]) => ({ table: `\`${t}\``, pk, pw }));

const BATCH = 500;

async function tableExists(prisma: any, table: string): Promise<boolean> {
    const name = table.replace(/`/g, '');
    // SHOW TABLES LIKE 는 자리표시자를 받지 않아 information_schema 로 본다
    const rows = await prisma.$queryRawUnsafe(
        'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
        name,
    );
    return rows.length > 0;
}

async function dynamicTargets(prisma: any): Promise<Target[]> {
    const services = await prisma.serviceConfig.findMany({ select: { slug: true } });
    const out: Target[] = [];
    for (const { slug } of services) {
        const t = getDynamicTableNames(slug);
        out.push({ table: t.boards, pk: 'board_idx', pw: 'board_pw' });
        out.push({ table: t.comments, pk: 'comment_idx', pw: 'writer_pw' });
    }
    return out;
}

async function processTable(prisma: any, t: Target, dryRun: boolean) {
    const q = (c: string) => `\`${c}\``;
    let after: bigint | number = 0;
    let legacy = 0;
    let changed = 0;
    let skipped = 0;
    const startedAt = Date.now();
    for (;;) {
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT ${q(t.pk)} AS pk, ${q(t.pw)} AS pw FROM ${t.table} WHERE ${q(t.pk)} > ? ORDER BY ${q(t.pk)} LIMIT ?`,
            after,
            BATCH,
        );
        if (rows.length === 0) break;
        after = rows[rows.length - 1].pk;
        const changedBefore = changed;
        for (const r of rows) {
            if (!isLegacyBoardHash(r.pw)) continue;
            legacy += 1;
            if (dryRun) continue;
            const wrapped = await wrapLegacyBoardHash(r.pw);
            // 읽은 값이 그대로일 때만 바꾼다 (그 사이 이용자가 비밀번호를 새로 저장했으면 건너뜀)
            const n = await prisma.$executeRawUnsafe(
                `UPDATE ${t.table} SET ${q(t.pw)} = ? WHERE ${q(t.pk)} = ? AND ${q(t.pw)} = ?`,
                wrapped,
                r.pk,
                r.pw,
            );
            if (n > 0) changed += 1;
            else skipped += 1;
        }
        if (changed > changedBefore) {
            console.log(`  ${t.table} … ${changed}건 변환 (${Math.round((Date.now() - startedAt) / 1000)}초)`);
        }
    }
    return { legacy, changed, skipped };
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const prisma = new PrismaService();
    try {
        const targets = [...STATIC_TARGETS, ...(await dynamicTargets(prisma))];
        console.log(`${dryRun ? '[미리 보기] ' : ''}대상 테이블 ${targets.length}개`);
        let total = { legacy: 0, changed: 0, skipped: 0 };
        for (const t of targets) {
            if (!(await tableExists(prisma, t.table))) {
                console.log(`- ${t.table}: 테이블 없음, 건너뜀`);
                continue;
            }
            const r = await processTable(prisma, t, dryRun);
            total = { legacy: total.legacy + r.legacy, changed: total.changed + r.changed, skipped: total.skipped + r.skipped };
            console.log(
                dryRun
                    ? `- ${t.table}: 바꿀 행 ${r.legacy}건`
                    : `- ${t.table}: ${r.changed}건 변환${r.skipped ? ` · 도중에 바뀐 ${r.skipped}건 건너뜀` : ''}`,
            );
        }
        console.log(
            dryRun
                ? `\n바꿀 행 총 ${total.legacy}건 (실제로 바꾸려면 --dry-run 없이 실행)`
                : `\n완료 — 총 ${total.changed}건 변환${total.skipped ? `, ${total.skipped}건 건너뜀` : ''}`,
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
