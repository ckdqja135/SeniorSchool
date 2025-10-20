-- 자유게시판 API를 위한 테이블 DDL
-- 기존 게시판 구조를 참고하여 자유게시판 테이블들을 생성

-- 1. 자유게시판 게시글 테이블
CREATE TABLE `tb_freeboard` (
  `boardIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '게시글 인덱스',
  `boardTitle` varchar(200) NOT NULL COMMENT '게시글 제목',
  `boardContent` text NOT NULL COMMENT '게시글 내용',
  `boardRegDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '게시글 등록일',
  `boardModDate` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '게시글 수정일',
  `boardLike` bigint NOT NULL DEFAULT '0' COMMENT '좋아요 수',
  `boardHits` bigint NOT NULL DEFAULT '0' COMMENT '조회수',
  `boardID` varchar(45) NOT NULL COMMENT '작성자 ID',
  `boardPW` varchar(100) NOT NULL COMMENT '작성자 비밀번호',
  `category` varchar(50) NOT NULL COMMENT '카테고리',
  `tags` json DEFAULT NULL COMMENT '태그 (JSON 배열)',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '삭제 여부 (0: 활성, 1: 삭제)',
  PRIMARY KEY (`boardIdx`),
  KEY `idx_freeboard_category` (`category`),
  KEY `idx_freeboard_deleted` (`isDeleted`),
  KEY `idx_freeboard_regdate` (`boardRegDate`),
  KEY `idx_freeboard_like` (`boardLike`),
  KEY `idx_freeboard_hits` (`boardHits`),
  KEY `idx_freeboard_boardid` (`boardID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='자유게시판 게시글 테이블';

-- 2. 자유게시판 댓글 테이블
CREATE TABLE `tb_freeboard_comment` (
  `commentIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '댓글 인덱스',
  `boardIdx` bigint NOT NULL COMMENT '게시글 인덱스 (외래키)',
  `commentLike` bigint NOT NULL DEFAULT '0' COMMENT '댓글 좋아요 수',
  `commentDepth` bigint NOT NULL DEFAULT '0' COMMENT '댓글 깊이 (0: 댓글, 1: 대댓글)',
  `writerId` varchar(45) NOT NULL COMMENT '작성자 ID',
  `writerPw` varchar(100) NOT NULL COMMENT '작성자 비밀번호',
  `commentParent` bigint DEFAULT NULL COMMENT '부모 댓글 인덱스 (대댓글인 경우)',
  `commentContent` text NOT NULL COMMENT '댓글 내용',
  `commentRegDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '댓글 등록일',
  `commentModDate` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '댓글 수정일',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '삭제 여부 (0: 활성, 1: 삭제)',
  PRIMARY KEY (`commentIdx`),
  KEY `idx_freeboard_comment_board` (`boardIdx`),
  KEY `idx_freeboard_comment_parent` (`commentParent`),
  KEY `idx_freeboard_comment_deleted` (`isDeleted`),
  KEY `idx_freeboard_comment_regdate` (`commentRegDate`),
  KEY `idx_freeboard_comment_like` (`commentLike`),
  CONSTRAINT `fk_freeboard_comment_board` FOREIGN KEY (`boardIdx`) REFERENCES `tb_freeboard` (`boardIdx`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='자유게시판 댓글 테이블';


-- 3. 자유게시판 통계 테이블 (인기 카테고리/태그 조회용)
CREATE TABLE `tb_freeboard_stats` (
  `statIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '통계 인덱스',
  `category` varchar(50) NOT NULL COMMENT '카테고리',
  `tag` varchar(50) DEFAULT NULL COMMENT '태그',
  `count` bigint NOT NULL DEFAULT '1' COMMENT '카운트',
  `lastUpdated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 업데이트',
  PRIMARY KEY (`statIdx`),
  UNIQUE KEY `unique_category_tag` (`category`, `tag`),
  KEY `idx_freeboard_stats_category` (`category`),
  KEY `idx_freeboard_stats_tag` (`tag`),
  KEY `idx_freeboard_stats_count` (`count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='자유게시판 통계 테이블';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX `idx_freeboard_composite` ON `tb_freeboard` (`isDeleted`, `category`, `boardRegDate` DESC);
CREATE INDEX `idx_freeboard_search` ON `tb_freeboard` (`isDeleted`, `boardTitle`, `boardContent`(100));
CREATE INDEX `idx_freeboard_comment_composite` ON `tb_freeboard_comment` (`boardIdx`, `isDeleted`, `commentRegDate`);

-- 뷰 생성 (인기 게시글 조회용)
CREATE VIEW `vw_popular_freeboard` AS
SELECT 
    f.boardIdx,
    f.boardTitle,
    f.boardContent,
    f.boardRegDate,
    f.boardLike,
    f.boardHits,
    f.boardID,
    f.category,
    f.tags,
    (f.boardLike * 2 + f.boardHits) AS popularity_score
FROM tb_freeboard f
WHERE f.isDeleted = 0
ORDER BY popularity_score DESC, f.boardRegDate DESC;
