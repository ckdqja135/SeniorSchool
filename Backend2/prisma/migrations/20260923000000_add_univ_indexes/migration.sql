-- 학교오빠 게시판/댓글 인덱스 (성능 전용 — 데이터/조회 결과 변경 없음)
-- 다른 게시판에는 있는 인덱스가 tb_univboard / tb_univcomment 에만 없었다.
-- InnoDB 보조 인덱스 추가는 기본이 온라인 DDL(INPLACE, 읽기/쓰기 허용)이다.
-- 롤백: DROP INDEX <name> ON <table>; 후 이 마이그레이션 행을 _prisma_migrations 에서 제거하거나 migrate resolve --rolled-back

-- 목록: WHERE univIdx = ? ORDER BY boardRegDate DESC
CREATE INDEX `idx_univ_board_univIdx_regDate` ON `tb_univboard`(`univIdx`, `boardRegDate`);

-- 최근 20개: ORDER BY boardRegDate DESC LIMIT 20
CREATE INDEX `idx_univ_board_regDate` ON `tb_univboard`(`boardRegDate`);

-- 인기 TOP10: ORDER BY boardHits DESC, boardRegDate DESC LIMIT 10
CREATE INDEX `idx_univ_board_hits_regDate` ON `tb_univboard`(`boardHits`, `boardRegDate`);

-- 댓글: WHERE boardIdx = ?
CREATE INDEX `idx_univ_comment_boardIdx` ON `tb_univcomment`(`boardIdx`);
