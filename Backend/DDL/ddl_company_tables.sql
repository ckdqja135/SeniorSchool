-- 회사 오빠 API를 위한 테이블 DDL
-- 기존 학교 오빠 API의 테이블 구조를 참고하여 회사 정보를 저장하는 테이블들을 생성

-- 1. 회사 기본 정보 테이블
CREATE TABLE `tb_comp_info` (
  `compIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '회사 인덱스',
  `compName` varchar(60) NOT NULL COMMENT '회사명',
  `compLocate` varchar(45) NOT NULL COMMENT '회사 위치 (시/도)',
  `compType` varchar(45) NOT NULL COMMENT '회사 유형 (대기업, 중견기업, 중소기업, 스타트업 등)',
  `compEstablish` varchar(45) NOT NULL COMMENT '회사 설립일',
  `compCEO` varchar(45) NOT NULL COMMENT '대표이사',
  `compIndustry` varchar(45) NOT NULL COMMENT '업종',
  `compLateX` double NOT NULL COMMENT '위도',
  `compLateY` double NOT NULL COMMENT '경도',
  `compURL` varchar(200) DEFAULT NULL COMMENT '회사 홈페이지 URL',
  `compLotAddr` varchar(20) NOT NULL COMMENT '지번 주소',
  `compAddr` varchar(200) NOT NULL COMMENT '도로명 주소',
  `compMapIMG` varchar(200) DEFAULT NULL COMMENT '회사 지도 이미지 URL',
  `compStatus` tinyint NOT NULL DEFAULT '1' COMMENT '회사 상태 (1: 활성, 0: 비활성)',
  `compViewCount` int NOT NULL DEFAULT '0' COMMENT '조회수',
  `compEmployeeCount` int DEFAULT NULL COMMENT '직원 수',
  `compCapital` bigint DEFAULT NULL COMMENT '자본금',
  `compSales` bigint DEFAULT NULL COMMENT '매출액',
  `totalEmployees` int DEFAULT NULL COMMENT '총 직원 수',
  `newHires` int DEFAULT NULL COMMENT '신규 입사자 수',
  `resignations` int DEFAULT NULL COMMENT '퇴사자 수',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  PRIMARY KEY (`compIdx`),
  KEY `idx_comp_name` (`compName`),
  KEY `idx_comp_locate` (`compLocate`),
  KEY `idx_comp_type` (`compType`),
  KEY `idx_comp_industry` (`compIndustry`),
  KEY `idx_comp_status` (`compStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='회사 기본 정보 테이블';


-- 회사 통계 정보 테이블
CREATE TABLE `tb_comp_statistics` (
  `statIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '통계 인덱스',
  `compIdx` bigint NOT NULL COMMENT '회사 인덱스 (외래키)',
  `year` int NOT NULL COMMENT '통계 연도',
  `quarter` tinyint DEFAULT NULL COMMENT '분기 (1, 2, 3, 4) - NULL이면 연간 데이터',
  `totalEmployees` int DEFAULT NULL COMMENT '총 직원 수',
  `newHires` int DEFAULT NULL COMMENT '신규 입사자 수',
  `resignations` int DEFAULT NULL COMMENT '퇴사자 수',
  `hireRate` decimal(5,2) DEFAULT NULL COMMENT '입사율 (%)',
  `turnoverRate` decimal(5,2) DEFAULT NULL COMMENT '퇴사율 (%)',
  `netGrowth` int DEFAULT NULL COMMENT '순증가 인원 (입사자 - 퇴사자)',
  `avgSalary` bigint DEFAULT NULL COMMENT '평균 연봉',
  `minSalary` bigint DEFAULT NULL COMMENT '최저 연봉',
  `maxSalary` bigint DEFAULT NULL COMMENT '최고 연봉',
  `medianSalary` bigint DEFAULT NULL COMMENT '중간값 연봉',
  `avgBonus` bigint DEFAULT NULL COMMENT '평균 보너스',
  `avgBenefits` bigint DEFAULT NULL COMMENT '평균 복리후생비',
  `dataSource` varchar(100) DEFAULT NULL COMMENT '데이터 출처 (API명)',
  `apiResponseData` json DEFAULT NULL COMMENT '원본 API 응답 데이터 (JSON)',
  `lastUpdated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마지막 업데이트 일시',
  `isActive` tinyint NOT NULL DEFAULT '1' COMMENT '데이터 활성 상태 (1: 활성, 0: 비활성)',
  `regDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
  `modDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  PRIMARY KEY (`statIdx`),
  UNIQUE KEY `unique_comp_year_quarter` (`compIdx`, `year`, `quarter`),
  KEY `idx_comp_statistics_comp` (`compIdx`),
  KEY `idx_comp_statistics_year` (`year`),
  KEY `idx_comp_statistics_quarter` (`quarter`),
  KEY `idx_comp_statistics_active` (`isActive`),
  KEY `idx_comp_statistics_updated` (`lastUpdated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='회사 통계 정보 테이블 (외부 API 연동)';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX `idx_comp_statistics_composite` ON `tb_comp_statistics` (`compIdx`, `year`, `isActive`);
CREATE INDEX `idx_comp_statistics_latest` ON `tb_comp_statistics` (`compIdx`, `lastUpdated` DESC);



-- 2. 회사 게시판 테이블
CREATE TABLE `tb_comp_board` (
  `boardIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '게시글 인덱스',
  `boardTitle` varchar(45) NOT NULL COMMENT '게시글 제목',
  `boardContent` text COMMENT '게시글 내용',
  `compIdx` bigint DEFAULT NULL COMMENT '회사 인덱스 (외래키)',
  `boardRegDate` varchar(45) DEFAULT NULL COMMENT '게시글 등록일',
  `boardLike` bigint NOT NULL DEFAULT '0' COMMENT '좋아요 수',
  `boardHits` bigint NOT NULL DEFAULT '0' COMMENT '조회수',
  `boardID` varchar(45) NOT NULL COMMENT '작성자 ID',
  `boardPW` varchar(100) NOT NULL COMMENT '작성자 비밀번호',
  `boardCategory` varchar(20) DEFAULT NULL COMMENT '게시글 카테고리 (후기, 질문, 정보공유 등)',
  `boardRating` decimal(2,1) DEFAULT NULL COMMENT '후기 평점 (0.5 ~ 5.0)',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '삭제 여부',
  PRIMARY KEY (`boardIdx`),
  KEY `idx_comp_board_comp` (`compIdx`),
  KEY `idx_comp_board_category` (`boardCategory`),
  KEY `idx_comp_board_deleted` (`isDeleted`),
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='회사 게시판 테이블';

-- 3. 회사 댓글 테이블
CREATE TABLE `tb_comp_comment` (
  `commentIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '댓글 인덱스',
  `boardIdx` bigint NOT NULL COMMENT '게시글 인덱스 (외래키)',
  `commentLike` bigint NOT NULL DEFAULT '0' COMMENT '댓글 좋아요 수',
  `commentDepth` bigint DEFAULT NULL COMMENT '댓글 깊이 (대댓글 구분)',
  `writerId` varchar(45) NOT NULL COMMENT '작성자 ID',
  `writerPw` varchar(100) NOT NULL COMMENT '작성자 비밀번호',
  `commentParent` bigint DEFAULT NULL COMMENT '부모 댓글 인덱스',
  `commentContent` varchar(200) NOT NULL COMMENT '댓글 내용',
  `regDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
  `modDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '삭제 여부',
  PRIMARY KEY (`commentIdx`),
  KEY `idx_comp_comment_board` (`boardIdx`),
  KEY `idx_comp_comment_parent` (`commentParent`),
  KEY `idx_comp_comment_deleted` (`isDeleted`),
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='회사 댓글 테이블';

-- 4. 회사 요청 테이블
CREATE TABLE `tb_comp_request` (
  `requestIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '요청 인덱스',
  `compName` varchar(60) NOT NULL COMMENT '회사명 (필수)',
  `compCEO` varchar(45) DEFAULT NULL COMMENT '대표이사 (선택사항)',
  `compType` varchar(20) DEFAULT NULL COMMENT '회사 유형 (대기업, 중견기업, 중소기업, 스타트업)',
  `compIndustry` varchar(45) DEFAULT NULL COMMENT '업종',
  `compAddr` varchar(200) DEFAULT NULL COMMENT '회사 주소 (선택사항)',
  `requestStatus` enum('pending','completed') NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (미처리: pending, 처리완료: completed)',
  `requestDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '요청 날짜',
  `processedDate` datetime DEFAULT NULL COMMENT '처리 완료 날짜',
  `adminNote` text COMMENT '관리자 메모',
  `requesterId` varchar(45) DEFAULT NULL COMMENT '요청자 ID',
  PRIMARY KEY (`requestIdx`),
  KEY `idx_comp_request_status` (`requestStatus`),
  KEY `idx_comp_request_date` (`requestDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='회사 요청 테이블';

-- 5. 회사 면접 후기 테이블
CREATE TABLE `tb_comp_interview` (
  `interviewIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '면접 후기 인덱스',
  `compIdx` bigint NOT NULL COMMENT '회사 인덱스 (외래키)',
  `writerId` varchar(45) NOT NULL COMMENT '작성자 ID',
  `writerPw` varchar(100) NOT NULL COMMENT '작성자 비밀번호',
  `interviewTitle` varchar(100) NOT NULL COMMENT '면접 후기 제목',
  `interviewContent` text COMMENT '면접 후기 내용',
  `interviewDate` datetime DEFAULT NULL COMMENT '면접 날짜',
  `interviewResult` varchar(20) DEFAULT NULL COMMENT '면접 결과 (합격, 불합격, 대기중)',
  `interviewDifficulty` int DEFAULT NULL COMMENT '면접 난이도 (1-5)',
  `position` varchar(50) DEFAULT NULL COMMENT '지원 직책',
  `regDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
  `modDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '삭제 여부',
  PRIMARY KEY (`interviewIdx`),
  KEY `idx_comp_interview_comp` (`compIdx`),
  KEY `idx_comp_interview_deleted` (`isDeleted`),
  KEY `idx_comp_interview_regDate` (`regDate`),
  CONSTRAINT `fk_comp_interview_comp` FOREIGN KEY (`compIdx`) REFERENCES `tb_comp_info` (`compIdx`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='회사 면접 후기 테이블';

-- 6. 회사 연봉 후기 테이블
CREATE TABLE `tb_comp_salary` (
  `salaryIdx` bigint NOT NULL AUTO_INCREMENT COMMENT '연봉 후기 인덱스',
  `compIdx` bigint NOT NULL COMMENT '회사 인덱스 (외래키)',
  `salary` bigint NOT NULL COMMENT '연봉 (만원 단위)',
  `workYear` int NOT NULL COMMENT '근무 연차',
  `department` varchar(50) NOT NULL COMMENT '직군',
  `regDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
  `modDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  PRIMARY KEY (`salaryIdx`),
  KEY `idx_comp_salary_comp` (`compIdx`),
  KEY `idx_comp_salary_regDate` (`regDate`),
  KEY `idx_comp_salary_salary` (`salary`),
  CONSTRAINT `fk_comp_salary_comp` FOREIGN KEY (`compIdx`) REFERENCES `tb_comp_info` (`compIdx`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='회사 연봉 후기 테이블';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX `idx_comp_info_composite` ON `tb_comp_info` (`compStatus`, `compType`, `compIndustry`);
CREATE INDEX `idx_comp_board_composite` ON `tb_comp_board` (`compIdx`, `isDeleted`, `boardRegDate`);
CREATE INDEX `idx_comp_comment_composite` ON `tb_comp_comment` (`boardIdx`, `isDeleted`, `regDate`);
CREATE INDEX `idx_comp_interview_composite` ON `tb_comp_interview` (`compIdx`, `isDeleted`, `regDate`);
CREATE INDEX `idx_comp_salary_composite` ON `tb_comp_salary` (`compIdx`, `regDate`);