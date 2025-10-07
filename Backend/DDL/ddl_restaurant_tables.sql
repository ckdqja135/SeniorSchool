-- 맛잘알 오빠 관련 테이블 DDL
-- 식당 후기를 관리하는 테이블 생성

-- 1. 식당 정보 테이블
CREATE TABLE tb_restaurant_info (
    restaurantIdx BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '식당 인덱스',
    restaurantName VARCHAR(60) NOT NULL COMMENT '식당명',
    restaurantLocation VARCHAR(45) NOT NULL COMMENT '식당 위치',
    restaurantType VARCHAR(45) NOT NULL COMMENT '음식 종류 (한식, 중식, 일식, 양식, 카페 등)',
    restaurantEstablished VARCHAR(45) NOT NULL COMMENT '개업년도',
    restaurantOwner VARCHAR(45) NOT NULL COMMENT '대표자명',
    restaurantLatX DOUBLE NOT NULL COMMENT '식당 위도',
    restaurantLatY DOUBLE NOT NULL COMMENT '식당 경도',
    restaurantURL VARCHAR(200) NOT NULL COMMENT '식당 홈페이지/SNS URL',
    restaurantLotAddr VARCHAR(20) NOT NULL COMMENT '식당 지번주소',
    restaurantAddr VARCHAR(200) NOT NULL COMMENT '식당 도로명주소',
    restaurantMapIMG VARCHAR(200) NULL COMMENT '식당 지도 이미지',
    restaurantStatus TINYINT NOT NULL DEFAULT 1 COMMENT '식당 상태 (1: 활성, 0: 비활성)',
    restaurantViewCount INT NOT NULL DEFAULT 0 COMMENT '식당 조회수'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='식당 정보 테이블';

-- 2. 식당 후기 게시판 테이블
CREATE TABLE tb_restaurant_board (
    boardIdx BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '게시글 인덱스',
    boardTitle VARCHAR(45) NOT NULL COMMENT '게시글 제목',
    boardContent TEXT NULL COMMENT '게시글 내용',
    restaurantIdx BIGINT NULL COMMENT '식당 인덱스 (외래키)',
    boardRegDate VARCHAR(45) NULL COMMENT '게시글 등록일',
    boardLike BIGINT NOT NULL DEFAULT 0 COMMENT '게시글 좋아요 수',
    boardHits BIGINT NOT NULL DEFAULT 0 COMMENT '게시글 조회수',
    boardID VARCHAR(45) NOT NULL COMMENT '작성자 ID',
    boardPW VARCHAR(100) NOT NULL COMMENT '작성자 비밀번호',
    INDEX idx_restaurant_board_restaurantIdx (restaurantIdx),
    INDEX idx_restaurant_board_regDate (boardRegDate),
    INDEX idx_restaurant_board_hits (boardHits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='식당 후기 게시판 테이블';

-- 3. 식당 후기 댓글 테이블
CREATE TABLE tb_restaurant_comment (
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
    INDEX idx_restaurant_comment_boardIdx (boardIdx),
    INDEX idx_restaurant_comment_parent (commentParent),
    INDEX idx_restaurant_comment_regDate (regDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='식당 후기 댓글 테이블';

-- 4. 식당 추가 요청 테이블
CREATE TABLE tb_restaurant_request (
    requestIdx INT AUTO_INCREMENT PRIMARY KEY COMMENT '요청 인덱스',
    restaurantName VARCHAR(60) NOT NULL COMMENT '식당 이름 (필수)',
    restaurantOwner VARCHAR(45) NULL COMMENT '식당 대표자명 (선택사항)',
    restaurantType VARCHAR(10) NULL COMMENT '음식 종류 (한식, 중식, 일식, 양식, 카페 등)',
    restaurantAddr VARCHAR(200) NULL COMMENT '식당 주소 (선택사항)',
    requestStatus ENUM('pending', 'completed') NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (미처리: pending, 처리완료: completed)',
    requestDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '요청 날짜',
    processedDate DATETIME NULL COMMENT '처리 완료 날짜',
    adminNote TEXT NULL COMMENT '관리자 메모',
    INDEX idx_restaurant_request_status (requestStatus),
    INDEX idx_restaurant_request_date (requestDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='식당 추가 요청 테이블';

-- 외래키 제약조건 추가
ALTER TABLE tb_restaurant_board 
ADD CONSTRAINT fk_restaurant_board_restaurantIdx 
FOREIGN KEY (restaurantIdx) REFERENCES tb_restaurant_info(restaurantIdx) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE tb_restaurant_comment 
ADD CONSTRAINT fk_restaurant_comment_boardIdx 
FOREIGN KEY (boardIdx) REFERENCES tb_restaurant_board(boardIdx) 
ON DELETE CASCADE ON UPDATE CASCADE;

