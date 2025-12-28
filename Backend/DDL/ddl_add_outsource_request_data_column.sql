-- 외주업체 추가 요청 테이블에 requestData JSON 컬럼 추가
-- 요청 데이터를 JSON 형식으로 저장하기 위한 컬럼

ALTER TABLE tb_outsource_request 
ADD COLUMN requestData JSON NULL 
COMMENT '요청 데이터 (JSON 형식으로 모든 요청 정보 저장)' 
AFTER adminNote;

-- 인덱스는 JSON 컬럼에는 일반적으로 생성하지 않지만, 
-- 필요시 JSON 경로 기반 가상 컬럼을 만들어 인덱스를 생성할 수 있습니다.
-- 예: category 필드로 검색이 필요한 경우
-- ALTER TABLE tb_outsource_request 
-- ADD COLUMN requestData_category VARCHAR(20) AS (JSON_UNQUOTE(JSON_EXTRACT(requestData, '$.category'))) VIRTUAL,
-- ADD INDEX idx_requestData_category (requestData_category);

