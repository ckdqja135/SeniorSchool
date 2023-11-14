 CREATE TABLE IF NOT EXISTS churchoppa.`ChurchInfo` (
   `ChurchNo` INT NOT NULL,
   `ChurchName` VARCHAR(45) NULL,
   `ChurchLocate` VARCHAR(45) NULL,
   `ChurchReli` VARCHAR(45) NULL,
   `ChurchScales` VARCHAR(45) NULL,
   `ChurchPastor` VARCHAR(45) NULL,
   `ChurchTel` VARCHAR(45) NULL,
   `ChurchLateX` DOUBLE NULL,
   `ChurchLateY` DOUBLE NULL,
   `ChurchHome` VARCHAR(200) NULL,
   `ChurchSerIMG` VARCHAR(200) NULL,
 	 `ChurchJibun` VARCHAR(200) NULL,
   `ChurchAddr` VARCHAR(200) NULL,
   `ChurchMapIMG` VARCHAR(200) NULL,
   PRIMARY KEY (`ChurchNo`))
 ENGINE = InnoDB;

-- 게시판 list 테이블
--  CREATE TABLE `churchoppa`.`board` (
--   `BoardNo` BIGINT(20) NOT NULL,
--   `BoardTitle VARCHAR(45) NULL,
--   `Church_No` BIGINT(20) NULL,
--   `BoardRegDate` VARCHAR(45) NULL,
--   `BoardLike` BIGINT(20) NULL,
--   `BoardHits` BIGINT(20) NULL,
--   `BoardID` VARCHAR(45) NULL,
--   `BoardPW` VARCHAR(45) NULL);

-- 게시판 디테일 테이블
-- CREATE TABLE `churchoppa`.`board_detail` (
--   `boardID` BIGINT(20) NOT NULL,
--   `boardContent` VARCHAR(400) NULL,
--   `boardTitle` VARCHAR(60) NULL,
--   `boardLike` BIGINT(20) NULL,
--   `boardHits` BIGINT(20) NULL,
--   `writerId` VARCHAR(45) NULL,
--   `writerPw` mediumblob NULL,

--   PRIMARY KEY (`boardID`));

-- CREATE TABLE `churchoppa`.`board_comment` (
-- `CommentId` BIGINT(20) NULL,
--  `BoardID` BIGINT(20) NULL,
-- `CommentLike` BIGINT(20) NULL, 
--  `CommentDepth` VARCHAR(45) NULL,
--  `WriterId` VARCHAR(45) NULL,
-- `WriterPw` VARCHAR(45) NULL,
--  `Commnetperent` VARCHAR(45) NULL,
--  `CommentContent` VARCHAR(200) NULL,
--  PRIMARY KEY (`CommentId`));


-- 교회 데이터 insert
INSERT INTO `churchoppa`.`churchinfo` 
(`ChurchNo`, `ChurchName`, `ChurchLocate`, `ChurchReli`, `ChurchScales`, `ChurchPastor`, `ChurchTel`, `ChurchLateX`, `ChurchLateY`, `ChurchHome`, `ChurchSerIMG`, `ChurchJibun`, `ChurchAddr`, `ChurchMapIMG`) VALUES 
('1', '낙원교회', '서울시 송파구', '장로회(합동)', '중', '오승일', '02-423-6994', '37.5008784', '127.1044591', 'http://www.nagweon.org/', 'https://user-images.githubusercontent.com/33046341/165232296-83913b29-d259-45f5-9873-2e886db625c2.png', '(우) 05318 서울특별시 송파구 가락로11길 7', '서울특별시 송파구 석촌동 257-2', 'https://github.com/ckdqja135/ChurchOppa/assets/33046341/fdde0cba-6dd4-4509-82ab-28c102ee0e2e');

-- select * from churchinfo
-- 칼럼 값 수정 시 사용.
-- ALTER TABLE ChurchInfo MODIFY ChurchLateX DOUBLE
-- ALTER TABLE ChurchInfo MODIFY ChurchLateY DOUBLE

--  칼럼 추가
-- ALTER TABLE ChurchInfo ADD ChurchMapIMG VARCHAR(200) NULL
-- 칼럼명 변경
-- ALTER TABLE ChurchInfo CHANGE ChurchLPost ChurchAddr VARCHAR(200) NULL--churchinfochurchinfo