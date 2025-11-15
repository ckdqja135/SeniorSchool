-- tb_comp_board 테이블에 후기 평점 컬럼 추가
ALTER TABLE `tb_comp_board`
    ADD COLUMN `boardRating` DECIMAL(2,1) DEFAULT NULL COMMENT '후기 평점 (0.5 ~ 5.0)'
    AFTER `boardCategory`;


