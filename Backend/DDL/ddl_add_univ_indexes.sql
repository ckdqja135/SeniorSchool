-- 학교오빠 게시판/댓글 인덱스 추가 (성능 전용 — 데이터/조회 결과 변경 없음)
-- 다른 게시판(tb_church_board, tb_restaurant_board 등)에는 있는 인덱스가 tb_univboard / tb_univcomment 에만 없다
-- (Backend2/prisma/schema.prisma 기준). 적용 전에 운영 DB에서 반드시 먼저 확인할 것:
--   SHOW INDEX FROM tb_univboard;
--   SHOW INDEX FROM tb_univcomment;
--   SELECT COUNT(*) FROM tb_univboard; SELECT COUNT(*) FROM tb_univcomment;
-- 이미 같은 컬럼 인덱스가 있으면 해당 문장은 건너뛴다. (MySQL 8 은 CREATE INDEX IF NOT EXISTS 미지원)
-- InnoDB 온라인 DDL(ALGORITHM=INPLACE, LOCK=NONE)로 읽기/쓰기를 막지 않는다.

-- GET 학교 후기 목록: WHERE univIdx = ? ORDER BY boardRegDate DESC
CREATE INDEX idx_univ_board_univIdx_regDate ON tb_univboard (univIdx, boardRegDate) ALGORITHM=INPLACE LOCK=NONE;
-- 최근 후기 20개: ORDER BY boardRegDate DESC LIMIT 20
CREATE INDEX idx_univ_board_regDate ON tb_univboard (boardRegDate) ALGORITHM=INPLACE LOCK=NONE;
-- 인기 후기 TOP10: ORDER BY boardHits DESC, boardRegDate DESC LIMIT 10
CREATE INDEX idx_univ_board_hits_regDate ON tb_univboard (boardHits, boardRegDate) ALGORITHM=INPLACE LOCK=NONE;
-- 게시글 댓글 조회: WHERE boardIdx = ?
CREATE INDEX idx_univ_comment_boardIdx ON tb_univcomment (boardIdx) ALGORITHM=INPLACE LOCK=NONE;

-- 롤백
-- DROP INDEX idx_univ_board_univIdx_regDate ON tb_univboard;
-- DROP INDEX idx_univ_board_regDate ON tb_univboard;
-- DROP INDEX idx_univ_board_hits_regDate ON tb_univboard;
-- DROP INDEX idx_univ_comment_boardIdx ON tb_univcomment;
