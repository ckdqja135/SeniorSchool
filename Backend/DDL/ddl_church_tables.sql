-- 교회 오빠 관련 테이블 DDL
-- 학교 오빠와 동일한 구조로 교회용 테이블 생성

-- 1. 교회 정보 테이블
CREATE TABLE tb_church_info (
    churchIdx BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '교회 인덱스',
    churchName VARCHAR(60) NOT NULL COMMENT '교회명',
    churchLocation VARCHAR(45) NOT NULL COMMENT '교회 위치',
    churchType VARCHAR(45) NOT NULL COMMENT '교회 종류 (감리교, 장로교, 침례교 등)',
    churchEstablished VARCHAR(45) NOT NULL COMMENT '설립년도',
    churchPastor VARCHAR(45) NOT NULL COMMENT '담임목사',
    churchLatX DOUBLE NOT NULL COMMENT '교회 위도',
    churchLatY DOUBLE NOT NULL COMMENT '교회 경도',
    churchURL VARCHAR(200) NOT NULL COMMENT '교회 홈페이지 URL',
    churchLotAddr VARCHAR(20) NOT NULL COMMENT '교회 지번주소',
    churchAddr VARCHAR(200) NOT NULL COMMENT '교회 도로명주소',
    churchMapIMG VARCHAR(200) NULL COMMENT '교회 지도 이미지',
    churchStatus TINYINT NOT NULL DEFAULT 1 COMMENT '교회 상태 (1: 활성, 0: 비활성)',
    churchViewCount INT NOT NULL DEFAULT 0 COMMENT '교회 조회수',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='교회 정보 테이블';

-- 2. 교회 게시판 테이블
CREATE TABLE tb_church_board (
    boardIdx BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '게시글 인덱스',
    boardTitle VARCHAR(45) NOT NULL COMMENT '게시글 제목',
    boardContent TEXT NULL COMMENT '게시글 내용',
    churchIdx BIGINT NULL COMMENT '교회 인덱스 (외래키)',
    boardRegDate VARCHAR(45) NULL COMMENT '게시글 등록일',
    boardLike BIGINT NOT NULL DEFAULT 0 COMMENT '게시글 좋아요 수',
    boardHits BIGINT NOT NULL DEFAULT 0 COMMENT '게시글 조회수',
    boardID VARCHAR(45) NOT NULL COMMENT '작성자 ID',
    boardPW VARCHAR(100) NOT NULL COMMENT '작성자 비밀번호',
    INDEX idx_church_board_churchIdx (churchIdx),
    INDEX idx_church_board_regDate (boardRegDate),
    INDEX idx_church_board_hits (boardHits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='교회 게시판 테이블';

-- 3. 교회 댓글 테이블
CREATE TABLE tb_church_comment (
    commentIdx BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '댓글 인덱스',
    boardIdx BIGINT NOT NULL COMMENT '게시글 인덱스 (외래키)',
    commentLike BIGINT NOT NULL DEFAULT 0 COMMENT '댓글 좋아요 수',
    commentDepth BIGINT NULL COMMENT '댓글 깊이 (대댓글용)',
    writerId VARCHAR(45) NOT NULL COMMENT '작성자 ID',
    writerPw VARCHAR(100) NOT NULL COMMENT '작성자 비밀번호',
    commentParent BIGINT NULL COMMENT '부모 댓글 인덱스',
    commentContent VARCHAR(200) NOT NULL COMMENT '댓글 내용',
    regDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    modDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    INDEX idx_church_comment_boardIdx (boardIdx),
    INDEX idx_church_comment_parent (commentParent),
    INDEX idx_church_comment_regDate (regDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='교회 댓글 테이블';

-- 4. 교회 추가 요청 테이블
CREATE TABLE tb_church_request (
    requestIdx INT AUTO_INCREMENT PRIMARY KEY COMMENT '요청 인덱스',
    churchName VARCHAR(60) NOT NULL COMMENT '교회 이름 (필수)',
    churchPastor VARCHAR(45) NULL COMMENT '교회 담임목사 (선택사항)',
    churchType VARCHAR(10) NULL COMMENT '교회 종류 (감리교, 장로교, 침례교 등)',
    churchAddr VARCHAR(200) NULL COMMENT '교회 주소 (선택사항)',
    requestStatus ENUM('pending', 'completed') NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (미처리: pending, 처리완료: completed)',
    requestDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '요청 날짜',
    processedDate DATETIME NULL COMMENT '처리 완료 날짜',
    adminNote TEXT NULL COMMENT '관리자 메모',
    INDEX idx_church_request_status (requestStatus),
    INDEX idx_church_request_date (requestDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='교회 추가 요청 테이블';

-- 외래키 제약조건 추가
ALTER TABLE tb_church_board 
ADD CONSTRAINT fk_church_board_churchIdx 
FOREIGN KEY (churchIdx) REFERENCES tb_church_info(churchIdx) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE tb_church_comment 
ADD CONSTRAINT fk_church_comment_boardIdx 
FOREIGN KEY (boardIdx) REFERENCES tb_church_board(boardIdx) 
ON DELETE CASCADE ON UPDATE CASCADE;

