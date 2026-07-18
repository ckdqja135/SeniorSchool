// Backend/service/admin/boardServiceFactory.js + {univ,church,comp,outsource,restaurant}BoardService.js 포팅.
// 5개 어드민 게시판(후기) CRUD가 동일 패턴이라 config 기반 베이스 서비스로 미러링한다.
// - 목록: findAndCountAll → count + findMany + 연관 엔티티 수동 조인(스키마에 관계 없음)
// - DECIMAL(boardRating)은 comp/restaurant board에서 "4.0" 형태로 .toFixed(1)
// - BIGINT는 전역 json replacer가 문자열화. isDeleted(tinyint)는 Int(0/1)로 처리.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { logger } from '../../../logger/winston.logger';

export interface AdminBoardConfig {
    delegate: string;          // prisma 델리게이트명 (예: 'univBoard')
    modelName: string;         // 로그 태그 (예: 'univboard')
    entityDelegate: string;    // 연관 엔티티 델리게이트 (예: 'universityInfo')
    fkField: string;           // 게시판 FK = 엔티티 PK (동일명, 예: 'univIdx')
    entityNameField: string;   // 엔티티 이름 컬럼 (예: 'univName')
    entityAlias: string;       // 응답 내 연관 객체 키 (예: 'university')
    entityIdxIsBigInt: boolean;// 엔티티 PK가 BigInt인지 (univ만 Int)
    requiredFields: string[];
    creatableFields: string[];
    updatableFields: string[];
    hasIsDeleted: boolean;
    decimalFields: string[];   // .toFixed(1) 대상 (예: ['boardRating'])
    booleanFields: string[];   // Int(0/1) → Boolean 변환 대상 (원본 Sequelize BOOLEAN 컬럼, 예: ['isDeleted'])
}

@Injectable()
export class AdminBoardBaseService {
    // 서브클래스가 super(prisma)로 호출하고 config를 세팅
    protected config!: AdminBoardConfig;

    constructor(protected readonly prisma: PrismaService) {}

    private get model(): any {
        return (this.prisma as any)[this.config.delegate];
    }

    private pickFields(source: any, fields: string[]): Record<string, any> {
        const result: Record<string, any> = {};
        for (const key of fields) {
            if (source[key] !== undefined) result[key] = source[key];
        }
        return result;
    }

    private buildCreateData(item: any): Record<string, any> {
        const data = this.pickFields(item, this.config.creatableFields);
        if (data.boardRegDate === undefined) {
            data.boardRegDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        if (data.boardLike === undefined) data.boardLike = 0;
        if (data.boardHits === undefined) data.boardHits = 0;
        if (this.config.hasIsDeleted && data.isDeleted === undefined) data.isDeleted = 0;
        return data;
    }

    // 원본 Sequelize 모델의 JSON 형태로 변환 (키 순서 보존):
    //  - DECIMAL 컬럼 → "4.0" 형태 문자열
    //  - BOOLEAN 컬럼(원본 Sequelize BOOLEAN, Prisma Int) → true/false
    private serializeRow(row: any): any {
        const out = { ...row };
        for (const df of this.config.decimalFields) {
            if (out[df] != null) out[df] = out[df].toFixed(1);
        }
        for (const bf of this.config.booleanFields) {
            if (out[bf] != null) out[bf] = Boolean(out[bf]);
        }
        return out;
    }

    async listPosts(query: any) {
        try {
            const page = parseInt(query.page ?? 1);
            const limit = parseInt(query.limit ?? 10);
            const where: Record<string, any> = {};

            if (this.config.hasIsDeleted) {
                const includeDeleted = query.includeDeleted === '1' || query.includeDeleted === 1;
                if (!includeDeleted) where.isDeleted = 0;
            }

            const offset = (page - 1) * limit;

            const count = await this.model.count({ where });
            const rows = await this.model.findMany({
                where,
                orderBy: [{ boardRegDate: 'desc' }, { boardIdx: 'desc' }],
                take: limit,
                skip: offset,
            });

            // 연관 엔티티 수동 조인 ({fkField, nameField})
            const { fkField, entityDelegate, entityNameField, entityAlias, entityIdxIsBigInt } = this.config;
            const fkVals = rows
                .filter((r: any) => r[fkField] != null)
                .map((r: any) => (entityIdxIsBigInt ? BigInt(r[fkField]) : Number(r[fkField])));
            let emap = new Map<string, any>();
            if (fkVals.length > 0) {
                const entities = await (this.prisma as any)[entityDelegate].findMany({
                    where: { [fkField]: { in: fkVals } },
                    select: { [fkField]: true, [entityNameField]: true },
                });
                emap = new Map(entities.map((e: any) => [String(e[fkField]), e]));
            }

            const posts = rows.map((r: any) => {
                const out = this.serializeRow(r);
                out[entityAlias] = r[fkField] != null ? (emap.get(String(r[fkField])) ?? null) : null;
                return out;
            });

            return {
                status: 200,
                totalCount: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                posts,
            };
        } catch (error) {
            logger.error(`[admin.${this.config.modelName}.list] Error: ${error.message}`);
            throw error;
        }
    }

    async createPost(postData: any) {
        try {
            const validate = (item: any): string | null => {
                for (const key of this.config.requiredFields) {
                    if (!item[key] || (typeof item[key] === 'string' && item[key].trim() === '')) {
                        return key;
                    }
                }
                return null;
            };

            if (Array.isArray(postData)) {
                const results: any[] = [];
                for (const item of postData) {
                    const missing = validate(item);
                    if (missing) return { status: 400, message: `필수값 누락: ${missing}` };
                    const created = await this.model.create({ data: this.buildCreateData(item) });
                    results.push(this.serializeRow(created));
                }
                logger.info(`[admin.${this.config.modelName}.create] bulk count=${results.length}`);
                return { status: 201, data: results };
            }

            const missing = validate(postData);
            if (missing) return { status: 400, message: `필수값 누락: ${missing}` };

            const created = await this.model.create({ data: this.buildCreateData(postData) });
            logger.info(`[admin.${this.config.modelName}.create] boardIdx=${created.boardIdx}`);
            return { status: 201, data: this.serializeRow(created) };
        } catch (error) {
            logger.error(`[admin.${this.config.modelName}.create] Error: ${error.message}`);
            throw error;
        }
    }

    async updatePost(boardIdx: any, updateData: any) {
        try {
            const post = await this.model.findUnique({ where: { boardIdx: Number(boardIdx) } });
            if (!post || (this.config.hasIsDeleted && post.isDeleted)) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            const payload = this.pickFields(updateData, this.config.updatableFields);
            await this.model.updateMany({ where: { boardIdx: Number(boardIdx) }, data: payload });
            logger.info(`[admin.${this.config.modelName}.update] boardIdx=${boardIdx}`);
            return { status: 200, message: '게시글이 수정되었습니다.' };
        } catch (error) {
            logger.error(`[admin.${this.config.modelName}.update] Error: ${error.message}`);
            throw error;
        }
    }

    async deletePost(boardIdx: any) {
        try {
            const post = await this.model.findUnique({ where: { boardIdx: Number(boardIdx) } });
            if (!post || (this.config.hasIsDeleted && post.isDeleted)) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            if (this.config.hasIsDeleted) {
                await this.model.updateMany({ where: { boardIdx: Number(boardIdx) }, data: { isDeleted: 1 } });
            } else {
                await this.model.deleteMany({ where: { boardIdx: Number(boardIdx) } });
            }

            logger.info(`[admin.${this.config.modelName}.delete] boardIdx=${boardIdx}`);
            return { status: 200, message: '게시글이 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[admin.${this.config.modelName}.delete] Error: ${error.message}`);
            throw error;
        }
    }
}

// ── 5개 도메인별 서비스 (config 주입) ──

@Injectable()
export class AdminUnivBoardService extends AdminBoardBaseService {
    constructor(prisma: PrismaService) {
        super(prisma);
        this.config = {
            delegate: 'univBoard', modelName: 'univboard',
            entityDelegate: 'universityInfo', fkField: 'univIdx', entityNameField: 'univName',
            entityAlias: 'university', entityIdxIsBigInt: false,
            requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
            creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'univIdx', 'boardRegDate', 'boardLike', 'boardHits'],
            updatableFields: ['boardTitle', 'boardContent'],
            hasIsDeleted: false, decimalFields: [], booleanFields: [],
        };
    }
}

@Injectable()
export class AdminChurchBoardService extends AdminBoardBaseService {
    constructor(prisma: PrismaService) {
        super(prisma);
        this.config = {
            delegate: 'churchBoard', modelName: 'churchboard',
            entityDelegate: 'churchInfo', fkField: 'churchIdx', entityNameField: 'churchName',
            entityAlias: 'church', entityIdxIsBigInt: true,
            requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
            creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'churchIdx', 'boardRegDate', 'boardLike', 'boardHits'],
            updatableFields: ['boardTitle', 'boardContent'],
            hasIsDeleted: false, decimalFields: [], booleanFields: [],
        };
    }
}

@Injectable()
export class AdminCompBoardService extends AdminBoardBaseService {
    constructor(prisma: PrismaService) {
        super(prisma);
        this.config = {
            delegate: 'compBoard', modelName: 'compboard',
            entityDelegate: 'compInfo', fkField: 'compIdx', entityNameField: 'compName',
            entityAlias: 'company', entityIdxIsBigInt: true,
            requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
            creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'compIdx', 'boardRegDate', 'boardLike', 'boardHits', 'boardCategory', 'boardRating', 'isDeleted'],
            updatableFields: ['boardTitle', 'boardContent', 'boardCategory', 'boardRating'],
            hasIsDeleted: true, decimalFields: ['boardRating'], booleanFields: ['isDeleted'],
        };
    }
}

@Injectable()
export class AdminOutsourceBoardService extends AdminBoardBaseService {
    constructor(prisma: PrismaService) {
        super(prisma);
        this.config = {
            delegate: 'outsourceBoard', modelName: 'outsourceboard',
            entityDelegate: 'outsourceInfo', fkField: 'outsourceIdx', entityNameField: 'outsourceName',
            entityAlias: 'outsource', entityIdxIsBigInt: true,
            requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
            creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'outsourceIdx', 'boardRegDate', 'boardLike', 'boardHits'],
            updatableFields: ['boardTitle', 'boardContent'],
            hasIsDeleted: false, decimalFields: [], booleanFields: [],
        };
    }
}

@Injectable()
export class AdminRestaurantBoardService extends AdminBoardBaseService {
    constructor(prisma: PrismaService) {
        super(prisma);
        this.config = {
            delegate: 'restaurantBoard', modelName: 'restaurantboard',
            entityDelegate: 'restaurantInfo', fkField: 'restaurantIdx', entityNameField: 'restaurantName',
            entityAlias: 'restaurant', entityIdxIsBigInt: true,
            requiredFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW'],
            creatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardPW', 'restaurantIdx', 'boardRegDate', 'boardLike', 'boardHits', 'boardRating'],
            updatableFields: ['boardTitle', 'boardContent', 'boardID', 'boardRating'],
            hasIsDeleted: false, decimalFields: ['boardRating'], booleanFields: [],
        };
    }

    // 원본 restaurantBoardService: 삭제 시 관련 댓글도 함께 삭제
    async deletePost(boardIdx: any) {
        try {
            const post = await (this.prisma as any).restaurantBoard.findUnique({ where: { boardIdx: Number(boardIdx) } });
            if (!post) {
                return { status: 404, message: '게시글을 찾을 수 없습니다.' };
            }

            await this.prisma.restaurantComment.deleteMany({ where: { boardIdx: Number(boardIdx) } });
            await this.prisma.restaurantBoard.deleteMany({ where: { boardIdx: Number(boardIdx) } });

            logger.info(`[admin.restaurantboard.delete] boardIdx=${boardIdx}`);
            return { status: 200, message: '게시글이 삭제되었습니다.' };
        } catch (error) {
            logger.error(`[admin.restaurantboard.delete] Error: ${error.message}`);
            throw error;
        }
    }
}
