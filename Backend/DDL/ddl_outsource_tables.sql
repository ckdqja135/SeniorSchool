-- 외주 오빠 관련 테이블 DDL
-- 교회 오빠와 동일한 구조로 외주용 테이블 생성

-- 1. 외주 정보 테이블
CREATE TABLE tb_outsource_info (
    outsourceIdx BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '외주 인덱스',
    outsourceName VARCHAR(60) NOT NULL COMMENT '외주업체명',
    outsourceLocation VARCHAR(45) NOT NULL COMMENT '외주업체 위치',
    outsourceType VARCHAR(45) NOT NULL COMMENT '외주 종류 (웹개발, 앱개발, 디자인, 마케팅 등)',
    outsourceEstablished VARCHAR(45) NOT NULL COMMENT '설립년도',
    outsourceCEO VARCHAR(45) NOT NULL COMMENT '대표자명',
    outsourceLatX DOUBLE NOT NULL COMMENT '외주업체 위도',
    outsourceLatY DOUBLE NOT NULL COMMENT '외주업체 경도',
    outsourceURL VARCHAR(200) NOT NULL COMMENT '외주업체 홈페이지 URL',
    outsourceLotAddr VARCHAR(20) NOT NULL COMMENT '외주업체 지번주소',
    outsourceAddr VARCHAR(200) NOT NULL COMMENT '외주업체 도로명주소',
    outsourceMapIMG VARCHAR(200) NULL COMMENT '외주업체 지도 이미지',
    outsourceStatus TINYINT NOT NULL DEFAULT 1 COMMENT '외주업체 상태 (1: 활성, 0: 비활성)',
    outsourceViewCount INT NOT NULL DEFAULT 0 COMMENT '외주업체 조회수'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='외주업체 정보 테이블';

-- 2. 외주 게시판 테이블
CREATE TABLE tb_outsource_board (
    boardIdx BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '게시글 인덱스',
    boardTitle VARCHAR(45) NOT NULL COMMENT '게시글 제목',
    boardContent TEXT NULL COMMENT '게시글 내용',
    outsourceIdx BIGINT NULL COMMENT '외주업체 인덱스 (외래키)',
    boardRegDate VARCHAR(45) NULL COMMENT '게시글 등록일',
    boardLike BIGINT NOT NULL DEFAULT 0 COMMENT '게시글 좋아요 수',
    boardHits BIGINT NOT NULL DEFAULT 0 COMMENT '게시글 조회수',
    boardID VARCHAR(45) NOT NULL COMMENT '작성자 ID',
    boardPW VARCHAR(100) NOT NULL COMMENT '작성자 비밀번호',
    INDEX idx_outsource_board_outsourceIdx (outsourceIdx),
    INDEX idx_outsource_board_regDate (boardRegDate),
    INDEX idx_outsource_board_hits (boardHits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='외주 게시판 테이블';

-- 3. 외주 댓글 테이블
CREATE TABLE tb_outsource_comment (
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
    INDEX idx_outsource_comment_boardIdx (boardIdx),
    INDEX idx_outsource_comment_parent (commentParent),
    INDEX idx_outsource_comment_regDate (regDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='외주 댓글 테이블';

-- 4. 외주업체 추가 요청 테이블
CREATE TABLE tb_outsource_request (
    requestIdx INT AUTO_INCREMENT PRIMARY KEY COMMENT '요청 인덱스',
    outsourceName VARCHAR(60) NOT NULL COMMENT '외주업체 이름 (필수)',
    outsourceCEO VARCHAR(45) NULL COMMENT '외주업체 대표자명 (선택사항)',
    outsourceType VARCHAR(10) NULL COMMENT '외주 종류 (웹개발, 앱개발, 디자인, 마케팅 등)',
    outsourceAddr VARCHAR(200) NULL COMMENT '외주업체 주소 (선택사항)',
    requestStatus ENUM('pending', 'completed') NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (미처리: pending, 처리완료: completed)',
    requestDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '요청 날짜',
    processedDate DATETIME NULL COMMENT '처리 완료 날짜',
    adminNote TEXT NULL COMMENT '관리자 메모',
    INDEX idx_outsource_request_status (requestStatus),
    INDEX idx_outsource_request_date (requestDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='외주업체 추가 요청 테이블';

-- 외래키 제약조건 추가
ALTER TABLE tb_outsource_board 
ADD CONSTRAINT fk_outsource_board_outsourceIdx 
FOREIGN KEY (outsourceIdx) REFERENCES tb_outsource_info(outsourceIdx) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE tb_outsource_comment 
ADD CONSTRAINT fk_outsource_comment_boardIdx 
FOREIGN KEY (boardIdx) REFERENCES tb_outsource_board(boardIdx) 
ON DELETE CASCADE ON UPDATE CASCADE;

