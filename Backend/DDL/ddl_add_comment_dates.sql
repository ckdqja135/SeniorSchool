-- 댓글 테이블에 작성일, 수정일 컬럼 추가
ALTER TABLE `tb_univcomment` 
ADD COLUMN `regDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '댓글 작성일',
ADD COLUMN `modDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '댓글 수정일';

-- 기존 데이터에 기본값 설정 (현재 시간으로)
UPDATE `tb_univcomment` 
SET `regDate` = CURRENT_TIMESTAMP, `modDate` = CURRENT_TIMESTAMP 
WHERE `regDate` IS NULL OR `modDate` IS NULL;
