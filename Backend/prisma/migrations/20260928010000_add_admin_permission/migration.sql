-- 어드민 권한 관리 (신규 테이블 2개 + tb_user 컬럼 1개).
-- 지금까지 어드민 권한은 tb_user.userRole 문자열 두 개(admin/master)가 전부였고,
-- 사이드바 메뉴는 프론트 코드에 배열로 박혀 있어 계정마다 다른 메뉴를 줄 방법이 없었다.
--
-- tb_admin_group   : 권한 그룹. groupCode 가 tb_admin_menu.rolePermissions 의 키가 된다
-- tb_admin_menu    : 메뉴 트리 + 그룹별 노출 여부(JSON 한 컬럼)
-- tb_user.groupIdx : 계정이 속한 권한 그룹. 그룹이 삭제되면 SET NULL 로 자동 해제된다
--
-- userRole(admin/master)은 API 접근 판정용으로 그대로 두고, 그룹은 '메뉴 노출'만 정한다.
-- master 는 그룹과 무관하게 항상 전체 메뉴를 본다(애플리케이션에서 단락 처리).
--
-- 아래 시드는 현재 프론트 하드코딩 메뉴(adminMenu.ts STATIC_MENU + BOTTOM_MENU)를 그대로 옮긴 것이고,
-- 붙박이 'admin' 그룹에 전 메뉴를 켜 둔 뒤 기존 계정을 전부 그 그룹에 넣는다.
-- → 적용 직후 모든 기존 계정이 지금 보던 메뉴를 그대로 본다 (회귀 없음).
--
-- 롤백:
--   ALTER TABLE `tb_user` DROP FOREIGN KEY `fk_user_admin_group`;
--   ALTER TABLE `tb_user` DROP COLUMN `groupIdx`;
--   DROP TABLE `tb_admin_menu`;
--   DROP TABLE `tb_admin_group`;

-- ─────────────────────────────────────────────────────────────
-- 1) 권한 그룹
-- ─────────────────────────────────────────────────────────────
CREATE TABLE `tb_admin_group` (
  `groupIdx`  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- 기계용 코드. tb_admin_menu.rolePermissions 의 키로 쓰인다
  `groupCode` VARCHAR(50)  NOT NULL,
  -- 화면 표시용 이름
  `groupName` VARCHAR(100) NOT NULL,
  -- 1 이면 붙박이(이름 변경·삭제 금지). master/admin 두 개가 여기 해당
  `isBuiltIn` TINYINT      NOT NULL DEFAULT 0,
  `sortOrder` INT          NOT NULL DEFAULT 0,
  `createdAt` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`groupIdx`),
  UNIQUE KEY `uq_admin_group_code` (`groupCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────────────────────────────────────────────────────────
-- 2) 메뉴 + 그룹별 노출
-- ─────────────────────────────────────────────────────────────
CREATE TABLE `tb_admin_menu` (
  `menuIdx`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- 상위 메뉴. 상위가 지워지면 하위도 같이 지운다
  `parentIdx`       INT UNSIGNED NULL,
  `menuName`        VARCHAR(100) NOT NULL,
  -- NULL 이면 클릭 이동이 없는 묶음 메뉴 (예: 시스템 관리)
  `menuPath`        VARCHAR(200) NULL,
  -- 사이드바 아이콘 (이모지). 최상위 메뉴만 쓴다
  `menuIcon`        VARCHAR(20)  NULL,
  -- 같은 상위 안에서의 정렬 순서
  `sortOrder`       INT          NOT NULL DEFAULT 0,
  -- {"<groupCode>": true} — 키가 없으면 노출 안 함으로 본다
  `rolePermissions` JSON         NOT NULL,
  `createdAt`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`       DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`menuIdx`),
  INDEX `idx_admin_menu_parent` (`parentIdx`, `sortOrder`),
  CONSTRAINT `fk_admin_menu_parent` FOREIGN KEY (`parentIdx`)
    REFERENCES `tb_admin_menu` (`menuIdx`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────────────────────────────────────────────────────────
-- 3) 계정 → 권한 그룹
-- ─────────────────────────────────────────────────────────────
ALTER TABLE `tb_user`
  ADD COLUMN `groupIdx` INT UNSIGNED NULL AFTER `userRole`,
  ADD CONSTRAINT `fk_user_admin_group` FOREIGN KEY (`groupIdx`)
    REFERENCES `tb_admin_group` (`groupIdx`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 4) 붙박이 권한 그룹
-- ─────────────────────────────────────────────────────────────
INSERT INTO `tb_admin_group` (`groupIdx`, `groupCode`, `groupName`, `isBuiltIn`, `sortOrder`) VALUES
  (1, 'master', '최고 관리자', 1, 0),
  (2, 'admin',  '기본 관리자', 1, 1);

-- ─────────────────────────────────────────────────────────────
-- 5) 현재 하드코딩 메뉴 시드.
--    menuIdx 를 명시해서 넣는다 (자식이 상위 id 를 알아야 하므로).
--    최상위 100·200·…, 하위는 상위+1, +2 …
-- ─────────────────────────────────────────────────────────────
INSERT INTO `tb_admin_menu` (`menuIdx`, `parentIdx`, `menuName`, `menuPath`, `menuIcon`, `sortOrder`, `rolePermissions`) VALUES
  -- 대시보드
  ( 100, NULL, 'Dashboard',             '/myoriadmin',                     '📊',  0, '{"admin": true}'),
  -- 자유게시판
  ( 200, NULL, '자유게시판',            '/myoriadmin/freeboard',           '🗂️',  1, '{"admin": true}'),
  ( 201,  200, '자유게시판 관리',       '/myoriadmin/freeboard',           NULL,  0, '{"admin": true}'),
  -- 학교 오빠
  ( 300, NULL, '학교 오빠',             '/myoriadmin/school',              '🎓',  2, '{"admin": true}'),
  ( 301,  300, '학교 관리',             '/myoriadmin/school/management',   NULL,  0, '{"admin": true}'),
  ( 302,  300, '대학교 추가 요청 관리', '/myoriadmin/school/requests',     NULL,  1, '{"admin": true}'),
  ( 303,  300, '후기 관리',             '/myoriadmin/school/board',        NULL,  2, '{"admin": true}'),
  -- 교회 오빠
  ( 400, NULL, '교회 오빠',             '/myoriadmin/church',              '⛪',  3, '{"admin": true}'),
  ( 401,  400, '교회 관리',             '/myoriadmin/church',              NULL,  0, '{"admin": true}'),
  ( 402,  400, '교회 추가 요청 관리',   '/myoriadmin/church/requests',     NULL,  1, '{"admin": true}'),
  ( 403,  400, '후기 관리',             '/myoriadmin/church/board',        NULL,  2, '{"admin": true}'),
  -- 회사 오빠
  ( 500, NULL, '회사 오빠',             '/myoriadmin/company',             '✍️',  4, '{"admin": true}'),
  ( 501,  500, '회사 관리',             '/myoriadmin/company',             NULL,  0, '{"admin": true}'),
  ( 502,  500, '회사 추가 요청 관리',   '/myoriadmin/company/requests',    NULL,  1, '{"admin": true}'),
  ( 503,  500, '후기 관리',             '/myoriadmin/company/board',       NULL,  2, '{"admin": true}'),
  ( 504,  500, '크롤러 관리',           '/myoriadmin/company/crawler',     NULL,  3, '{"admin": true}'),
  -- 외주 오빠
  ( 600, NULL, '외주 오빠',             '/myoriadmin/outsource',           '💼',  5, '{"admin": true}'),
  ( 601,  600, '외주업체 관리',         '/myoriadmin/outsource',           NULL,  0, '{"admin": true}'),
  ( 602,  600, '외주업체 추가 요청 관리','/myoriadmin/outsource/requests',  NULL,  1, '{"admin": true}'),
  ( 603,  600, '후기 관리',             '/myoriadmin/outsource/board',     NULL,  2, '{"admin": true}'),
  -- 맛잘알 오빠
  ( 700, NULL, '맛잘알 오빠',           '/myoriadmin/restaurant',          '🍽️',  6, '{"admin": true}'),
  ( 701,  700, '식당 관리',             '/myoriadmin/restaurant',          NULL,  0, '{"admin": true}'),
  ( 702,  700, '식당 추가 요청 관리',   '/myoriadmin/restaurant/requests', NULL,  1, '{"admin": true}'),
  ( 703,  700, '후기 관리',             '/myoriadmin/restaurant/board',    NULL,  2, '{"admin": true}'),
  ( 704,  700, '크롤러 관리',           '/myoriadmin/restaurant/crawler',  NULL,  3, '{"admin": true}'),
  -- 서비스 관리 (동적 서비스 메뉴는 이 메뉴의 노출 권한을 따라간다)
  ( 800, NULL, '서비스 관리',           '/myoriadmin/services',            '🛠️',  7, '{"admin": true}'),
  ( 801,  800, '서비스 목록',           '/myoriadmin/services',            NULL,  0, '{"admin": true}'),
  ( 802,  800, '서비스 추가',           '/myoriadmin/services/create',     NULL,  1, '{"admin": true}'),
  -- 접속 분석
  ( 900, NULL, '접속 분석',             '/myoriadmin/analytics',           '📈',  8, '{"admin": true}'),
  -- 게시글 관리
  (1000, NULL, '게시글 관리',           '/myoriadmin/posts',               '📝',  9, '{"admin": true}'),
  (1001, 1000, '신고 게시글',           '/myoriadmin/posts/reported',      NULL,  0, '{"admin": true}'),
  -- 시스템 관리 (신설: 묶음 메뉴라 경로가 없다)
  (1100, NULL, '시스템 관리',           NULL,                              '🧰', 10, '{"admin": true}'),
  (1101, 1100, '스케줄러 실행',         '/myoriadmin/scheduler',           NULL,  0, '{"admin": true}'),
  (1102, 1100, '권한 관리',             '/myoriadmin/admin',               NULL,  1, '{"admin": true}');

-- 신규 메뉴가 시드 id 와 겹치지 않게
ALTER TABLE `tb_admin_menu` AUTO_INCREMENT = 10000;

-- ─────────────────────────────────────────────────────────────
-- 6) 기존 계정을 붙박이 그룹에 배치
-- ─────────────────────────────────────────────────────────────
UPDATE `tb_user` SET `groupIdx` = 1 WHERE `userRole` = 'master';
UPDATE `tb_user` SET `groupIdx` = 2 WHERE `userRole` <> 'master';
