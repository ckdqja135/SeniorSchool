-- 동적 서비스 설정 테이블 DDL
-- 어드민에서 새 "OO오빠" 서비스를 생성/관리하기 위한 메타 테이블

-- 1. 서비스 설정 테이블
CREATE TABLE `service_configs` (
  `service_id` bigint NOT NULL AUTO_INCREMENT COMMENT '서비스 ID',
  `slug` varchar(30) NOT NULL COMMENT '서비스 슬러그 (URL 경로, 테이블 접두사)',
  `name` varchar(60) NOT NULL COMMENT '서비스명 (예: 학원 오빠)',
  `display_name` varchar(60) DEFAULT NULL COMMENT '표시명 (프론트용)',
  `emoji` varchar(10) DEFAULT NULL COMMENT '서비스 이모지',
  `color` varchar(20) DEFAULT NULL COMMENT '서비스 대표 색상',
  `template_type` enum('basic','company','restaurant') NOT NULL DEFAULT 'basic' COMMENT '템플릿 유형',
  `status` enum('active','inactive','deleted') NOT NULL DEFAULT 'active' COMMENT '서비스 상태',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '정렬 순서',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  PRIMARY KEY (`service_id`),
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='동적 서비스 설정 테이블';

-- 2. 서비스 필드 설정 테이블
CREATE TABLE `service_field_configs` (
  `field_id` bigint NOT NULL AUTO_INCREMENT COMMENT '필드 ID',
  `service_id` bigint NOT NULL COMMENT '서비스 ID (FK)',
  `field_key` varchar(60) NOT NULL COMMENT '필드 키 (DB 컬럼명)',
  `field_label` varchar(60) NOT NULL COMMENT '필드 라벨 (표시명)',
  `field_type` enum('text','number','date','url','image','rating','textarea') NOT NULL DEFAULT 'text' COMMENT '필드 데이터 타입',
  `field_length` int DEFAULT NULL COMMENT '필드 길이 (string 타입 시)',
  `is_required` tinyint NOT NULL DEFAULT '0' COMMENT '필수 여부',
  `is_searchable` tinyint NOT NULL DEFAULT '0' COMMENT '검색 대상 여부',
  `show_in_list` tinyint NOT NULL DEFAULT '1' COMMENT '목록에 표시 여부',
  `show_in_detail` tinyint NOT NULL DEFAULT '1' COMMENT '상세에 표시 여부',
  `show_in_admin` tinyint NOT NULL DEFAULT '1' COMMENT '어드민에 표시 여부',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '정렬 순서',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  PRIMARY KEY (`field_id`),
  UNIQUE KEY `uk_service_field` (`service_id`, `field_key`),
  KEY `idx_service_id` (`service_id`),
  CONSTRAINT `fk_field_service` FOREIGN KEY (`service_id`) REFERENCES `service_configs` (`service_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='서비스 필드 설정 테이블';
