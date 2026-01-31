-- 2026-01-31: 'rejected' 상태 추가 마이그레이션
-- 모든 request 테이블에 'rejected' 상태 추가

-- 교회 요청 테이블
ALTER TABLE tb_church_request
MODIFY COLUMN requestStatus ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending'
COMMENT '처리 상태 (미처리: pending, 처리완료: completed, 거절: rejected)';

-- 회사 요청 테이블
ALTER TABLE tb_comp_request
MODIFY COLUMN requestStatus ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending'
COMMENT '처리 상태 (미처리: pending, 처리완료: completed, 거절: rejected)';

-- 식당 요청 테이블
ALTER TABLE tb_restaurant_request
MODIFY COLUMN requestStatus ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending'
COMMENT '처리 상태 (미처리: pending, 처리완료: completed, 거절: rejected)';

-- 외주업체 요청 테이블
ALTER TABLE tb_outsource_request
MODIFY COLUMN requestStatus ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending'
COMMENT '처리 상태 (미처리: pending, 처리완료: completed, 거절: rejected)';

-- 대학교 요청 테이블
ALTER TABLE tb_univrequest
MODIFY COLUMN requestStatus ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending'
COMMENT '처리 상태 (미처리: pending, 처리완료: completed, 거절: rejected)';
