// 모듈별 API 설명 모음. 새 설명 파일을 만들면 여기에 추가한다.
import { ApiDocMap } from '../api-doc.types';
import { commonDocs } from './common.docs';
import { univCompDocs } from './univ-comp.docs';
import { churchOutsourceDocs } from './church-outsource.docs';
import { dynamicFreeboardDocs } from './dynamic-freeboard.docs';
import { adminContentDocs } from './admin-content.docs';
import { adminSystemDocs } from './admin-system.docs';
import { schedulerDocs } from './scheduler.docs';

const SOURCES: ReadonlyArray<readonly [string, ApiDocMap]> = [
    ['common', commonDocs],
    ['univ-comp', univCompDocs],
    ['church-outsource', churchOutsourceDocs],
    ['dynamic-freeboard', dynamicFreeboardDocs],
    ['admin-content', adminContentDocs],
    ['admin-system', adminSystemDocs],
    ['scheduler', schedulerDocs],
];

// 같은 키가 두 파일에 있으면 뒤의 설명이 앞을 덮어써서 조용히 틀어지므로, 만들 때 바로 알린다
export const API_DOCS: ApiDocMap = {};
for (const [source, docs] of SOURCES) {
    for (const [key, doc] of Object.entries(docs)) {
        if (API_DOCS[key]) throw new Error(`[Swagger] API 설명 키 중복: ${key} (${source})`);
        API_DOCS[key] = doc;
    }
}
