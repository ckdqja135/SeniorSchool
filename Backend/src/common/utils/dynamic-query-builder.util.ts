// Backend/utils/dynamicQueryBuilder.js의 verbatim 포팅.
// 동적 서비스용 파라미터화 SQL 빌더 — 모든 VALUE는 ? 바인딩, 테이블/컬럼명은 백틱 이스케이프.
// 컬럼명은 서비스 설정(화이트리스트)에서만 오므로 임의 문자열 보간이 아니다.

export const FIELD_TYPE_MAP: Record<string, (len?: number) => string> = {
    text: (len) => `VARCHAR(${len || 200})`,
    number: () => 'BIGINT',
    date: () => 'DATETIME',
    url: (len) => `VARCHAR(${len || 500})`,
    image: (len) => `VARCHAR(${len || 500})`,
    rating: () => 'DECIMAL(2,1)',
    textarea: () => 'TEXT',
};

// 엔티티 테이블 CREATE TABLE SQL 생성
export function buildCreateEntitiesSQL(tableName: string, templateType: string, customFields: any[] = []): string {
    const columns = [
        '`entity_idx` BIGINT NOT NULL AUTO_INCREMENT',
        '`name` VARCHAR(60) NOT NULL COMMENT \'이름\'',
        '`location` VARCHAR(45) DEFAULT NULL COMMENT \'위치 (시/도)\'',
        '`type` VARCHAR(45) DEFAULT NULL COMMENT \'유형\'',
        '`established` VARCHAR(45) DEFAULT NULL COMMENT \'설립일\'',
        '`leader` VARCHAR(45) DEFAULT NULL COMMENT \'대표자\'',
        '`lat_x` DOUBLE DEFAULT NULL COMMENT \'위도\'',
        '`lat_y` DOUBLE DEFAULT NULL COMMENT \'경도\'',
        '`url` VARCHAR(200) DEFAULT NULL COMMENT \'홈페이지 URL\'',
        '`lot_addr` VARCHAR(20) DEFAULT NULL COMMENT \'지번 주소\'',
        '`addr` VARCHAR(200) DEFAULT NULL COMMENT \'도로명 주소\'',
        '`map_img` VARCHAR(200) DEFAULT NULL COMMENT \'지도 이미지 URL\'',
        '`status` TINYINT NOT NULL DEFAULT 1 COMMENT \'상태 (1: 활성, 0: 비활성)\'',
        '`view_count` INT NOT NULL DEFAULT 0 COMMENT \'조회수\'',
    ];

    // 템플릿별 추가 컬럼
    if (templateType === 'company') {
        columns.push(
            '`ceo` VARCHAR(45) DEFAULT NULL COMMENT \'대표이사\'',
            '`industry` VARCHAR(45) DEFAULT NULL COMMENT \'업종\'',
            '`employee_count` INT DEFAULT NULL COMMENT \'직원 수\'',
            '`avg_salary` BIGINT DEFAULT NULL COMMENT \'평균 연봉\'',
            '`capital` BIGINT DEFAULT NULL COMMENT \'자본금\'',
            '`sales` BIGINT DEFAULT NULL COMMENT \'매출액\'',
            '`operating_profit` BIGINT DEFAULT NULL COMMENT \'영업이익\'',
            '`net_income` BIGINT DEFAULT NULL COMMENT \'당기순이익\'',
            '`total_assets` BIGINT DEFAULT NULL COMMENT \'자산총계\'',
            '`total_liabilities` BIGINT DEFAULT NULL COMMENT \'부채총계\'',
            '`total_equity` BIGINT DEFAULT NULL COMMENT \'자본총계\'',
        );
    } else if (templateType === 'restaurant') {
        columns.push(
            '`owner` VARCHAR(45) DEFAULT NULL COMMENT \'대표자\'',
            '`image` VARCHAR(200) DEFAULT NULL COMMENT \'이미지 URL\'',
            '`average_rating` DECIMAL(2,1) DEFAULT NULL COMMENT \'평균 평점\'',
            '`rating_count` INT DEFAULT 0 COMMENT \'평점 수\'',
            '`food_type` VARCHAR(45) DEFAULT NULL COMMENT \'음식 종류\'',
        );
    }

    // 이미 정의된 컬럼명 수집 (중복 방지)
    const BUILTIN_COLUMNS = new Set([
        'entity_idx', 'name', 'location', 'type', 'established', 'leader',
        'lat_x', 'lat_y', 'url', 'lot_addr', 'addr', 'map_img', 'status', 'view_count',
        'created_at', 'updated_at',
        // company
        'ceo', 'industry', 'employee_count', 'avg_salary', 'capital',
        'sales', 'operating_profit', 'net_income', 'total_assets', 'total_liabilities', 'total_equity',
        // restaurant
        'owner', 'image', 'average_rating', 'rating_count', 'food_type',
    ]);

    // 커스텀 필드 추가 (기본 컬럼과 중복되지 않는 것만)
    for (const field of customFields) {
        const key = field.fieldKey || field.field_key;
        if (BUILTIN_COLUMNS.has(key)) continue;
        const typeBuilder = FIELD_TYPE_MAP[field.fieldType || field.field_type];
        if (!typeBuilder) continue;
        const colType = typeBuilder(field.fieldLength || field.field_length);
        const required = (field.isRequired || field.is_required) ? 'NOT NULL' : 'DEFAULT NULL';
        const label = field.fieldLabel || field.field_label;
        columns.push(`\`${key}\` ${colType} ${required} COMMENT '${label}'`);
    }

    columns.push(
        '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT \'등록일\'',
        '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT \'수정일\'',
        `PRIMARY KEY (\`entity_idx\`)`,
        'KEY `idx_name` (`name`)',
        'KEY `idx_status` (`status`)',
        'KEY `idx_location` (`location`)',
    );

    return `CREATE TABLE ${tableName} (\n  ${columns.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
}

// 게시판 테이블 CREATE TABLE SQL 생성
export function buildCreateBoardsSQL(tableName: string): string {
    return `CREATE TABLE ${tableName} (
  \`board_idx\` BIGINT NOT NULL AUTO_INCREMENT,
  \`board_title\` VARCHAR(100) NOT NULL COMMENT '게시글 제목',
  \`board_content\` TEXT COMMENT '게시글 내용',
  \`entity_idx\` BIGINT DEFAULT NULL COMMENT '엔티티 인덱스 (FK)',
  \`board_reg_date\` VARCHAR(45) DEFAULT NULL COMMENT '게시글 등록일',
  \`board_like\` BIGINT NOT NULL DEFAULT 0 COMMENT '좋아요 수',
  \`board_hits\` BIGINT NOT NULL DEFAULT 0 COMMENT '조회수',
  \`board_id\` VARCHAR(45) NOT NULL COMMENT '작성자 ID',
  \`board_pw\` VARCHAR(100) NOT NULL COMMENT '작성자 비밀번호',
  \`board_category\` VARCHAR(20) DEFAULT NULL COMMENT '게시글 카테고리',
  \`board_rating\` DECIMAL(2,1) DEFAULT NULL COMMENT '후기 평점 (0.5 ~ 5.0)',
  \`is_deleted\` TINYINT NOT NULL DEFAULT 0 COMMENT '삭제 여부',
  PRIMARY KEY (\`board_idx\`),
  KEY \`idx_entity\` (\`entity_idx\`),
  KEY \`idx_category\` (\`board_category\`),
  KEY \`idx_deleted\` (\`is_deleted\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
}

// 댓글 테이블 CREATE TABLE SQL 생성
export function buildCreateCommentsSQL(tableName: string): string {
    return `CREATE TABLE ${tableName} (
  \`comment_idx\` BIGINT NOT NULL AUTO_INCREMENT,
  \`board_idx\` BIGINT NOT NULL COMMENT '게시글 인덱스 (FK)',
  \`comment_like\` BIGINT NOT NULL DEFAULT 0 COMMENT '댓글 좋아요 수',
  \`comment_depth\` BIGINT DEFAULT NULL COMMENT '댓글 깊이',
  \`writer_id\` VARCHAR(45) NOT NULL COMMENT '작성자 ID',
  \`writer_pw\` VARCHAR(100) NOT NULL COMMENT '작성자 비밀번호',
  \`comment_parent\` BIGINT DEFAULT NULL COMMENT '부모 댓글 인덱스',
  \`comment_content\` VARCHAR(200) NOT NULL COMMENT '댓글 내용',
  \`reg_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
  \`mod_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  \`is_deleted\` TINYINT NOT NULL DEFAULT 0 COMMENT '삭제 여부',
  PRIMARY KEY (\`comment_idx\`),
  KEY \`idx_board\` (\`board_idx\`),
  KEY \`idx_parent\` (\`comment_parent\`),
  KEY \`idx_deleted\` (\`is_deleted\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
}

// 요청 테이블 CREATE TABLE SQL 생성
export function buildCreateRequestsSQL(tableName: string): string {
    return `CREATE TABLE ${tableName} (
  \`request_idx\` BIGINT NOT NULL AUTO_INCREMENT,
  \`request_name\` VARCHAR(60) NOT NULL COMMENT '요청 이름 (필수)',
  \`request_data\` JSON DEFAULT NULL COMMENT '추가 요청 데이터',
  \`request_status\` ENUM('pending','completed','rejected') NOT NULL DEFAULT 'pending' COMMENT '처리 상태',
  \`request_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '요청 날짜',
  \`processed_date\` DATETIME DEFAULT NULL COMMENT '처리 완료 날짜',
  \`admin_note\` TEXT COMMENT '관리자 메모',
  \`requester_id\` VARCHAR(45) DEFAULT NULL COMMENT '요청자 ID',
  PRIMARY KEY (\`request_idx\`),
  KEY \`idx_status\` (\`request_status\`),
  KEY \`idx_date\` (\`request_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
}

export interface BuiltQuery {
    sql: string;
    params: any[];
}

// SELECT 쿼리 빌더 (엔티티 목록)
export function buildSelectSQL(tableName: string, options: any = {}): BuiltQuery {
    const { page = 1, limit = 10, where = {}, orderBy = 'entity_idx DESC', columns = ['*'] } = options;
    const offset = (page - 1) * limit;

    const colStr = columns.map((c: string) => (c === '*' ? '*' : `\`${c}\``)).join(', ');
    let sql = `SELECT ${colStr} FROM ${tableName}`;

    const params: any[] = [];
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(where)) {
        conditions.push(`\`${key}\` = ?`);
        params.push(value);
    }

    if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return { sql, params };
}

// COUNT 쿼리 빌더
export function buildCountSQL(tableName: string, where: Record<string, any> = {}): BuiltQuery {
    let sql = `SELECT COUNT(*) AS total FROM ${tableName}`;
    const params: any[] = [];
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(where)) {
        conditions.push(`\`${key}\` = ?`);
        params.push(value);
    }

    if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    return { sql, params };
}

// INSERT 쿼리 빌더 (allowedColumns 화이트리스트)
export function buildInsertSQL(tableName: string, data: Record<string, any>, allowedColumns: string[]): BuiltQuery {
    const cols: string[] = [];
    const placeholders: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(data)) {
        if (!allowedColumns.includes(key)) continue;
        cols.push(`\`${key}\``);
        placeholders.push('?');
        params.push(value);
    }

    if (cols.length === 0) {
        throw new Error('삽입할 유효한 컬럼이 없습니다.');
    }

    const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    return { sql, params };
}

// UPDATE 쿼리 빌더 (allowedColumns 화이트리스트)
export function buildUpdateSQL(tableName: string, data: Record<string, any>, idColumn: string, idValue: any, allowedColumns: string[]): BuiltQuery {
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(data)) {
        if (!allowedColumns.includes(key)) continue;
        setClauses.push(`\`${key}\` = ?`);
        params.push(value);
    }

    if (setClauses.length === 0) {
        throw new Error('수정할 유효한 컬럼이 없습니다.');
    }

    const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE \`${idColumn}\` = ?`;
    params.push(idValue);
    return { sql, params };
}

// DELETE 쿼리 빌더 (soft delete)
export function buildSoftDeleteSQL(tableName: string, idColumn: string, idValue: any): BuiltQuery {
    return {
        sql: `UPDATE ${tableName} SET \`status\` = 0 WHERE \`${idColumn}\` = ?`,
        params: [idValue],
    };
}
