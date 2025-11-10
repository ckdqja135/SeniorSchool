-- tb_comp_info 테이블에 재무/직원 정보 컬럼 추가
-- OpenDart API 데이터를 저장하기 위한 컬럼들

USE your_database_name; -- 실제 DB 이름으로 변경하세요

-- 1. 직원 정보 컬럼
ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compAvgSalary BIGINT COMMENT '평균 연봉 (원)' AFTER resignations;

ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compAvgTenure DECIMAL(4,1) COMMENT '평균 근속 연수 (년)' AFTER compAvgSalary;

-- 2. 재무 정보 컬럼
ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compOperatingProfit BIGINT COMMENT '영업이익 (원)' AFTER compAvgTenure;

ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compNetIncome BIGINT COMMENT '당기순이익 (원)' AFTER compOperatingProfit;

ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compTotalAssets BIGINT COMMENT '자산총계 (원)' AFTER compNetIncome;

ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compTotalLiabilities BIGINT COMMENT '부채총계 (원)' AFTER compTotalAssets;

ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compTotalEquity BIGINT COMMENT '자본총계 (원)' AFTER compTotalLiabilities;

-- 3. 메타 정보 컬럼
ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compCorpCode VARCHAR(8) COMMENT 'OpenDart 고유번호' AFTER compTotalEquity;

ALTER TABLE tb_comp_info 
ADD COLUMN IF NOT EXISTS compDataUpdatedAt DATETIME COMMENT 'OpenDart 데이터 업데이트 일시' AFTER compCorpCode;

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_comp_corp_code ON tb_comp_info(compCorpCode);
CREATE INDEX IF NOT EXISTS idx_comp_data_updated ON tb_comp_info(compDataUpdatedAt);

-- 5. 기존 컬럼 타입 확인/수정 (필요시)
-- compSales는 매출액이므로 BIGINT로 충분히 큰지 확인
-- ALTER TABLE tb_comp_info MODIFY COLUMN compSales BIGINT COMMENT '매출액 (원)';
-- ALTER TABLE tb_comp_info MODIFY COLUMN compCapital BIGINT COMMENT '자본금 (원)';

-- 완료 메시지
SELECT '✅ tb_comp_info 테이블 컬럼 추가 완료' AS message;

-- 추가된 컬럼 확인
SHOW COLUMNS FROM tb_comp_info LIKE 'comp%';

