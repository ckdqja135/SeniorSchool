// Swagger 문서(/api-docs) 설정.
// - 개발 환경에서는 켜지고, 운영(NODE_ENV=production)에서는 SWAGGER_ENABLED=true 일 때만 켠다.
// - SWAGGER_USER / SWAGGER_PASSWORD 가 있으면 문서 화면과 JSON 에 기본 인증(브라우저 로그인 창)을 건다.
// - 경로별 설명은 docs/*.docs.ts 에 있고, 여기서 생성된 문서에 입힌다(컨트롤러는 손대지 않는다).
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { API_DOCS } from './docs';
import { ApiAuth, ApiDoc, ApiDocField } from './api-doc.types';
import { API_TAGS, tagForPath } from './tags';
import { logger } from '../logger/winston.logger';

const DOCS_PATH = 'api-docs';

// 문서 첫 화면 안내. 여러 API 에 공통인 규칙은 개별 설명에서 반복하지 않고 여기 한 번만 적는다.
const OVERVIEW = [
    '학교·교회·회사·외주·맛잘알 오빠, 자유게시판, 관리자 기능을 제공하는 오리(오빠의 리뷰) 백엔드 API입니다.',
    '',
    '### 인증',
    '- 관리자 API는 `POST /admin/user/signIn` 으로 받은 토큰을 `Authorization: Bearer <토큰>` 헤더에 넣어 호출합니다. 오른쪽 위 **Authorize** 에 토큰을 넣으면 이 화면에서 바로 호출해 볼 수 있습니다.',
    '- 토큰이 없으면 401, 권한이 모자라면 403이 돌아옵니다. 권한 그룹이 적용된 메뉴는 그룹에 해당 메뉴가 켜져 있어야 합니다.',
    '',
    '### 응답 형식',
    '- 번호·조회수·좋아요처럼 DB에서 BIGINT 인 값은 정밀도 손실을 막으려고 **문자열**로 내려갑니다. (예: `"boardIdx": "12"`)',
    '- 비밀번호 해시와 salt 는 어떤 응답에도 포함되지 않습니다.',
    '',
    '### 작성 제한',
    '- 글·댓글의 작성·수정·삭제는 IP 하나당 30초에 10번까지 가능하며, 넘기면 429가 돌아옵니다.',
    '- 제목·본문·댓글·작성자 이름 등에 욕설, 성적 표현, 스크립트(XSS)가 들어 있으면 저장하지 않고 400과 함께 문제가 된 필드(`field`)를 알려줍니다.',
    '- 그 밖의 요청도 IP당 1분에 50번까지 실패가 쌓이면 잠시 막히고, 관리자 로그인은 15분에 20번 실패하면 차단됩니다.',
].join('\n');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const AUTH_TEXT: Record<Exclude<ApiAuth, 'public'>, string> = {
    login: '로그인 필요 (Bearer 토큰)',
    admin: '어드민 계정 필요',
    'admin-menu': '어드민 계정 필요, 권한 그룹에 해당 메뉴가 켜져 있어야 함',
    master: '마스터 계정 필요',
};

export function isSwaggerEnabled(): boolean {
    return process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';
}

export function setupSwagger(app: INestApplication): void {
    if (!isSwaggerEnabled()) return;

    const user = process.env.SWAGGER_USER;
    const pass = process.env.SWAGGER_PASSWORD;
    if (user && pass) {
        app.use([`/${DOCS_PATH}`, `/${DOCS_PATH}-json`], basicAuth(user, pass));
    }

    const config = new DocumentBuilder()
        .setTitle('오리(오빠의 리뷰) API')
        .setDescription(OVERVIEW)
        .setVersion('2.0.0')
        .addBearerAuth()
        .build();

    const document = buildDocument(app, config);
    SwaggerModule.setup(DOCS_PATH, app, document, {
        customSiteTitle: '오리 API 문서',
        swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: undefined, operationsSorter: 'alpha' },
    });
    logger.info(`[Swagger] /${DOCS_PATH} 활성화${user && pass ? ' (기본 인증)' : ''}`);
}

/** 문서를 만들고 docs/*.docs.ts 의 설명·태그·권한을 입힌다. 설명이 없는 경로는 missing 으로 돌려준다 */
export function buildDocument(app: INestApplication, config: Omit<OpenAPIObject, 'paths'>): OpenAPIObject & { missing?: string[] } {
    const document = SwaggerModule.createDocument(app, config);
    const missing: string[] = [];
    const usedTags = new Set<string>();

    for (const [swaggerPath, item] of Object.entries(document.paths)) {
        const routePath = swaggerPath.replace(/\{(\w+)\}/g, ':$1');
        for (const method of METHODS) {
            const op = (item as any)[method];
            if (!op) continue;
            const tag = tagForPath(swaggerPath);
            op.tags = [tag];
            usedTags.add(tag);

            const key = `${method.toUpperCase()} ${routePath}`;
            const doc: ApiDoc | undefined = API_DOCS[key];
            if (!doc) missing.push(key);
            applyDoc(op, swaggerPath, doc);
        }
    }

    const order = new Map(API_TAGS.map(([name], i) => [name, i]));
    document.tags = [...usedTags]
        .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b))
        .map((name) => ({ name, description: API_TAGS.find(([n]) => n === name)?.[1] ?? '' }));

    if (missing.length) logger.warn(`[Swagger] 설명이 없는 API ${missing.length}개: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`);
    return Object.assign(document, { missing });
}

function applyDoc(op: any, swaggerPath: string, doc?: ApiDoc) {
    const pathNames = [...swaggerPath.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const auth = doc?.auth ?? 'public';

    op.summary = doc?.summary ?? op.summary;
    const lines: string[] = [];
    if (auth !== 'public') lines.push(`**권한:** ${AUTH_TEXT[auth]}`);
    if (doc?.description) lines.push(doc.description);
    if (lines.length) op.description = lines.join('\n\n');
    if (auth !== 'public') op.security = [{ bearer: [] }];

    // 경로 파라미터는 설명이 없어도 반드시 넣는다 (Try it out 에서 입력칸이 필요)
    const params: any[] = pathNames.map((name) => {
        const f = doc?.params?.find((p) => p.name === name);
        return { name, in: 'path', required: true, description: f?.description ?? '', schema: schemaOf(f), ...(f?.example !== undefined ? { example: f.example } : {}) };
    });
    for (const f of doc?.query ?? []) {
        params.push({ name: f.name, in: 'query', required: !!f.required, description: f.description, schema: schemaOf(f), ...(f.example !== undefined ? { example: f.example } : {}) });
    }
    op.parameters = params;

    if (doc?.body?.length) {
        const multipart = doc.bodyType === 'multipart';
        const properties: Record<string, any> = {};
        const required: string[] = [];
        for (const f of doc.body) {
            properties[f.name] = { ...schemaOf(f), description: f.description, ...(f.example !== undefined ? { example: f.example } : {}) };
            if (f.required) required.push(f.name);
        }
        op.requestBody = {
            required: required.length > 0,
            content: { [multipart ? 'multipart/form-data' : 'application/json']: { schema: { type: 'object', properties, ...(required.length ? { required } : {}) } } },
        };
    }

    if (doc?.responses) {
        op.responses = Object.fromEntries(Object.entries(doc.responses).map(([code, description]) => [code, { description }]));
    }
}

function schemaOf(f?: ApiDocField): Record<string, any> {
    const type = f?.type ?? 'string';
    if (type === 'file') return { type: 'string', format: 'binary' };
    if (type === 'array') return { type: 'array', items: f?.items === 'file' ? { type: 'string', format: 'binary' } : { type: f?.items ?? 'string' } };
    return { type };
}

function basicAuth(user: string, pass: string) {
    const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.headers.authorization === expected) return next();
        res.setHeader('WWW-Authenticate', 'Basic realm="api-docs", charset="UTF-8"');
        res.status(401).send('인증이 필요합니다.');
    };
}
