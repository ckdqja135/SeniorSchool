-- 통합 신고 게시판 테이블
-- 모든 서비스(univ, company, church)의 신고를 통합 관리
CREATE TABLE `tb_report_board` (
  `reportIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '신고 인덱스',
  `boardIdx` bigint NOT NULL COMMENT '신고된 게시글 인덱스',
  `serviceType` varchar(20) NOT NULL COMMENT '서비스 구분: univ, company, church',
  `reportReason` varchar(255) DEFAULT NULL COMMENT '신고 사유',
  `reportDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '신고 날짜',
  `reportStatus` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '신고 처리 상태: pending, reviewed, rejected',
  `reportResult` text COMMENT '신고 처리 결과',
  `reporterId` varchar(45) DEFAULT NULL COMMENT '신고자 ID',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '삭제 여부',
  PRIMARY KEY (`reportIdx`),
  KEY `idx_report_board` (`boardIdx`),
  KEY `idx_report_service_type` (`serviceType`),
  KEY `idx_report_status` (`reportStatus`),
  KEY `idx_report_deleted` (`isDeleted`),
  KEY `idx_report_date` (`reportDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='통합 신고 게시판 테이블';
