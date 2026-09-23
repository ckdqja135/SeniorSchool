-- CreateTable
CREATE TABLE `tb_church_board` (
    `boardIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardTitle` VARCHAR(45) NOT NULL,
    `boardContent` TEXT NULL,
    `churchIdx` BIGINT NULL,
    `boardRegDate` VARCHAR(45) NULL,
    `boardLike` BIGINT NOT NULL DEFAULT 0,
    `boardHits` BIGINT NOT NULL DEFAULT 0,
    `boardID` VARCHAR(45) NOT NULL,
    `boardPW` VARCHAR(100) NOT NULL,

    INDEX `idx_church_board_churchIdx`(`churchIdx`),
    INDEX `idx_church_board_hits`(`boardHits`),
    INDEX `idx_church_board_regDate`(`boardRegDate`),
    PRIMARY KEY (`boardIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_church_comment` (
    `commentIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardIdx` BIGINT NOT NULL,
    `commentLike` BIGINT NOT NULL DEFAULT 0,
    `commentDepth` BIGINT NULL,
    `writerId` VARCHAR(45) NOT NULL,
    `writerPw` VARCHAR(100) NOT NULL,
    `commentParent` BIGINT NULL,
    `commentContent` VARCHAR(200) NOT NULL,
    `regDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `modDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_church_comment_boardIdx`(`boardIdx`),
    INDEX `idx_church_comment_parent`(`commentParent`),
    INDEX `idx_church_comment_regDate`(`regDate`),
    PRIMARY KEY (`commentIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_church_info` (
    `churchIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `churchName` VARCHAR(60) NOT NULL,
    `churchLocation` VARCHAR(45) NOT NULL,
    `churchType` VARCHAR(45) NOT NULL,
    `churchEstablished` VARCHAR(45) NOT NULL,
    `churchPastor` VARCHAR(45) NOT NULL,
    `churchLatX` DOUBLE NOT NULL,
    `churchLatY` DOUBLE NOT NULL,
    `churchURL` VARCHAR(200) NOT NULL,
    `churchLotAddr` VARCHAR(20) NOT NULL,
    `churchAddr` VARCHAR(200) NOT NULL,
    `churchMapIMG` VARCHAR(200) NULL,
    `churchStatus` TINYINT NOT NULL DEFAULT 1,
    `churchViewCount` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`churchIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_church_request` (
    `requestIdx` INTEGER NOT NULL AUTO_INCREMENT,
    `churchName` VARCHAR(60) NOT NULL,
    `churchPastor` VARCHAR(45) NULL,
    `churchType` VARCHAR(10) NULL,
    `churchAddr` VARCHAR(200) NULL,
    `requestStatus` ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
    `requestDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `processedDate` DATETIME(0) NULL,
    `adminNote` TEXT NULL,

    INDEX `idx_church_request_date`(`requestDate`),
    INDEX `idx_church_request_status`(`requestStatus`),
    PRIMARY KEY (`requestIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_outsource_board` (
    `boardIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardTitle` VARCHAR(45) NOT NULL,
    `boardContent` TEXT NULL,
    `outsourceIdx` BIGINT NULL,
    `boardRegDate` VARCHAR(45) NULL,
    `boardLike` BIGINT NOT NULL DEFAULT 0,
    `boardHits` BIGINT NOT NULL DEFAULT 0,
    `boardID` VARCHAR(45) NOT NULL,
    `boardPW` VARCHAR(100) NOT NULL,

    INDEX `idx_outsource_board_hits`(`boardHits`),
    INDEX `idx_outsource_board_outsourceIdx`(`outsourceIdx`),
    INDEX `idx_outsource_board_regDate`(`boardRegDate`),
    PRIMARY KEY (`boardIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_outsource_comment` (
    `commentIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardIdx` BIGINT NOT NULL,
    `commentLike` BIGINT NOT NULL DEFAULT 0,
    `commentDepth` BIGINT NULL,
    `writerId` VARCHAR(45) NOT NULL,
    `writerPw` VARCHAR(100) NOT NULL,
    `commentParent` BIGINT NULL,
    `commentContent` VARCHAR(200) NOT NULL,
    `regDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `modDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_outsource_comment_boardIdx`(`boardIdx`),
    INDEX `idx_outsource_comment_parent`(`commentParent`),
    INDEX `idx_outsource_comment_regDate`(`regDate`),
    PRIMARY KEY (`commentIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_outsource_info` (
    `outsourceIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `outsourceName` VARCHAR(60) NOT NULL,
    `outsourceLocation` VARCHAR(45) NOT NULL,
    `outsourceType` VARCHAR(45) NOT NULL,
    `outsourceEstablished` VARCHAR(45) NOT NULL,
    `outsourceCEO` VARCHAR(45) NOT NULL,
    `outsourceLatX` DOUBLE NOT NULL,
    `outsourceLatY` DOUBLE NOT NULL,
    `outsourceURL` VARCHAR(200) NOT NULL,
    `outsourceLotAddr` VARCHAR(20) NOT NULL,
    `outsourceAddr` VARCHAR(200) NOT NULL,
    `outsourceMapIMG` VARCHAR(200) NULL,
    `outsourceStatus` TINYINT NOT NULL DEFAULT 1,
    `outsourceViewCount` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`outsourceIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_outsource_request` (
    `requestIdx` INTEGER NOT NULL AUTO_INCREMENT,
    `outsourceName` VARCHAR(60) NOT NULL,
    `outsourceCEO` VARCHAR(45) NULL,
    `outsourceType` VARCHAR(10) NULL,
    `outsourceAddr` VARCHAR(200) NULL,
    `requestStatus` ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
    `requestDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `processedDate` DATETIME(0) NULL,
    `adminNote` TEXT NULL,
    `requestData` LONGTEXT NULL,

    INDEX `idx_outsource_request_date`(`requestDate`),
    INDEX `idx_outsource_request_status`(`requestStatus`),
    PRIMARY KEY (`requestIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_univboard` (
    `boardIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardTitle` VARCHAR(45) NOT NULL,
    `boardContent` MEDIUMTEXT NULL,
    `univIdx` BIGINT NULL,
    `boardRegDate` VARCHAR(45) NULL,
    `boardLike` BIGINT NOT NULL DEFAULT 0,
    `boardHits` BIGINT NOT NULL DEFAULT 0,
    `boardID` VARCHAR(45) NOT NULL,
    `boardPW` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`boardIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_univcomment` (
    `commentIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardIdx` BIGINT NOT NULL,
    `commentLike` BIGINT NOT NULL DEFAULT 0,
    `commentDepth` BIGINT NULL,
    `writerId` VARCHAR(45) NOT NULL,
    `writerPw` VARCHAR(100) NOT NULL,
    `commentPerent` BIGINT NULL,
    `commentContent` VARCHAR(200) NOT NULL,
    `regDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `modDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`commentIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_universityinfo` (
    `univIdx` INTEGER NOT NULL AUTO_INCREMENT,
    `univName` VARCHAR(60) NOT NULL,
    `univLocate` VARCHAR(45) NOT NULL,
    `univType` VARCHAR(45) NOT NULL,
    `univEstablish` VARCHAR(45) NOT NULL,
    `univPresident` VARCHAR(45) NOT NULL,
    `univCampos` VARCHAR(45) NOT NULL,
    `univLateX` DOUBLE NOT NULL,
    `univLateY` DOUBLE NOT NULL,
    `univURL` VARCHAR(200) NOT NULL,
    `univLotAddr` VARCHAR(20) NOT NULL,
    `univAddr` VARCHAR(200) NOT NULL,
    `univMapIMG` VARCHAR(200) NULL,
    `univStatus` BOOLEAN NOT NULL DEFAULT true,
    `univViewCount` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`univIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_univrequest` (
    `requestIdx` INTEGER NOT NULL AUTO_INCREMENT,
    `univName` VARCHAR(60) NOT NULL,
    `univPresident` VARCHAR(45) NULL,
    `univType` VARCHAR(10) NULL,
    `univAddr` VARCHAR(200) NULL,
    `requestStatus` ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
    `requestDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `processedDate` DATETIME(0) NULL,
    `adminNote` TEXT NULL,

    PRIMARY KEY (`requestIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_user` (
    `userIdx` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(200) NOT NULL,
    `userPw` VARCHAR(200) NOT NULL,
    `userRole` VARCHAR(50) NOT NULL,
    `salt` VARCHAR(200) NOT NULL,
    `lastLogin` DATETIME(0) NULL,
    `userStatus` TINYINT NOT NULL DEFAULT 1,
    `accessToken` VARCHAR(200) NULL,

    UNIQUE INDEX `id`(`userId`),
    PRIMARY KEY (`userIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_views` (
    `pvIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `pvPath` VARCHAR(500) NOT NULL,
    `pvIp` VARCHAR(45) NULL,
    `pvUserAgent` TEXT NULL,
    `pvReferer` VARCHAR(500) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`pvIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_configs` (
    `service_id` BIGINT NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(30) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `display_name` VARCHAR(60) NULL,
    `emoji` VARCHAR(10) NULL,
    `color` VARCHAR(20) NULL,
    `template_type` ENUM('basic', 'company', 'restaurant') NOT NULL DEFAULT 'basic',
    `status` ENUM('active', 'inactive', 'deleted') NOT NULL DEFAULT 'active',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uk_slug`(`slug`),
    INDEX `idx_sort_order`(`sort_order`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_field_configs` (
    `field_id` BIGINT NOT NULL AUTO_INCREMENT,
    `service_id` BIGINT NOT NULL,
    `field_key` VARCHAR(60) NOT NULL,
    `field_label` VARCHAR(60) NOT NULL,
    `field_type` ENUM('text', 'number', 'date', 'url', 'image', 'rating', 'textarea') NOT NULL DEFAULT 'text',
    `field_length` INTEGER NULL,
    `is_required` TINYINT NOT NULL DEFAULT 0,
    `is_searchable` TINYINT NOT NULL DEFAULT 0,
    `show_in_list` TINYINT NOT NULL DEFAULT 1,
    `show_in_detail` TINYINT NOT NULL DEFAULT 1,
    `show_in_admin` TINYINT NOT NULL DEFAULT 1,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_service_id`(`service_id`),
    UNIQUE INDEX `uk_service_field`(`service_id`, `field_key`),
    PRIMARY KEY (`field_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_comp_board` (
    `boardIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardTitle` VARCHAR(45) NOT NULL,
    `boardContent` TEXT NULL,
    `compIdx` BIGINT NULL,
    `boardRegDate` VARCHAR(45) NULL,
    `boardLike` BIGINT NOT NULL DEFAULT 0,
    `boardHits` BIGINT NOT NULL DEFAULT 0,
    `boardID` VARCHAR(45) NOT NULL,
    `boardPW` VARCHAR(100) NOT NULL,
    `boardCategory` VARCHAR(20) NULL,
    `boardRating` DECIMAL(2, 1) NULL,
    `isDeleted` TINYINT NOT NULL DEFAULT 0,

    INDEX `idx_comp_board_category`(`boardCategory`),
    INDEX `idx_comp_board_comp`(`compIdx`),
    INDEX `idx_comp_board_composite`(`compIdx`, `isDeleted`, `boardRegDate`),
    INDEX `idx_comp_board_deleted`(`isDeleted`),
    PRIMARY KEY (`boardIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_comp_comment` (
    `commentIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardIdx` BIGINT NOT NULL,
    `commentLike` BIGINT NOT NULL DEFAULT 0,
    `commentDepth` BIGINT NULL,
    `writerId` VARCHAR(45) NOT NULL,
    `writerPw` VARCHAR(100) NOT NULL,
    `commentParent` BIGINT NULL,
    `commentContent` VARCHAR(200) NOT NULL,
    `regDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `modDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `isDeleted` TINYINT NOT NULL DEFAULT 0,

    INDEX `idx_comp_comment_board`(`boardIdx`),
    INDEX `idx_comp_comment_composite`(`boardIdx`, `isDeleted`, `regDate`),
    INDEX `idx_comp_comment_deleted`(`isDeleted`),
    INDEX `idx_comp_comment_parent`(`commentParent`),
    PRIMARY KEY (`commentIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_comp_info` (
    `compIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `compName` VARCHAR(60) NOT NULL,
    `compLocate` VARCHAR(45) NOT NULL,
    `compType` VARCHAR(45) NOT NULL,
    `compEstablish` VARCHAR(45) NULL,
    `compCEO` VARCHAR(45) NOT NULL,
    `compIndustry` VARCHAR(45) NOT NULL,
    `compLateX` DOUBLE NOT NULL,
    `compLateY` DOUBLE NOT NULL,
    `compURL` VARCHAR(200) NULL,
    `compLotAddr` VARCHAR(20) NOT NULL,
    `compAddr` VARCHAR(200) NOT NULL,
    `compMapIMG` VARCHAR(200) NULL,
    `compStatus` TINYINT NOT NULL DEFAULT 1,
    `compViewCount` INTEGER NOT NULL DEFAULT 0,
    `compEmployeeCount` INTEGER NULL,
    `compCapital` BIGINT NULL,
    `compSales` BIGINT NULL,
    `compAvgSalary` BIGINT NULL,
    `compAvgTenure` DECIMAL(4, 1) NULL,
    `totalEmployees` INTEGER NULL,
    `newHires` INTEGER NULL,
    `resignations` INTEGER NULL,
    `compOperatingProfit` BIGINT NULL,
    `compNetIncome` BIGINT NULL,
    `compTotalAssets` BIGINT NULL,
    `compTotalLiabilities` BIGINT NULL,
    `compTotalEquity` BIGINT NULL,
    `compCorpCode` VARCHAR(8) NULL,
    `compDataUpdatedAt` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_comp_corp_code`(`compCorpCode`),
    INDEX `idx_comp_data_updated`(`compDataUpdatedAt`),
    INDEX `idx_comp_industry`(`compIndustry`),
    INDEX `idx_comp_info_composite`(`compStatus`, `compType`, `compIndustry`),
    INDEX `idx_comp_locate`(`compLocate`),
    INDEX `idx_comp_name`(`compName`),
    INDEX `idx_comp_status`(`compStatus`),
    INDEX `idx_comp_type`(`compType`),
    PRIMARY KEY (`compIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_comp_interview` (
    `interviewIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `compIdx` BIGINT NOT NULL,
    `writerId` VARCHAR(45) NOT NULL,
    `writerPw` VARCHAR(100) NOT NULL,
    `interviewTitle` VARCHAR(100) NOT NULL,
    `interviewContent` TEXT NULL,
    `interviewDate` DATETIME(0) NULL,
    `interviewResult` VARCHAR(20) NULL,
    `interviewDifficulty` INTEGER NULL,
    `position` VARCHAR(50) NULL,
    `regDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `modDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `isDeleted` TINYINT NOT NULL DEFAULT 0,

    INDEX `idx_comp_interview_comp`(`compIdx`),
    INDEX `idx_comp_interview_composite`(`compIdx`, `isDeleted`, `regDate`),
    INDEX `idx_comp_interview_deleted`(`isDeleted`),
    INDEX `idx_comp_interview_regDate`(`regDate`),
    PRIMARY KEY (`interviewIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_comp_request` (
    `requestIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `compName` VARCHAR(60) NOT NULL,
    `compCEO` VARCHAR(45) NULL,
    `compType` VARCHAR(20) NULL,
    `compIndustry` VARCHAR(45) NULL,
    `compAddr` VARCHAR(200) NULL,
    `requestStatus` ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
    `requestDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `processedDate` DATETIME(0) NULL,
    `adminNote` TEXT NULL,
    `requesterId` VARCHAR(45) NULL,

    INDEX `idx_comp_request_date`(`requestDate`),
    INDEX `idx_comp_request_status`(`requestStatus`),
    PRIMARY KEY (`requestIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_comp_salary` (
    `salaryIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `compIdx` BIGINT NOT NULL,
    `salary` BIGINT NOT NULL,
    `workYear` INTEGER NOT NULL,
    `department` VARCHAR(50) NOT NULL,
    `regDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `modDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_comp_salary_comp`(`compIdx`),
    INDEX `idx_comp_salary_composite`(`compIdx`, `regDate`),
    INDEX `idx_comp_salary_regDate`(`regDate`),
    INDEX `idx_comp_salary_salary`(`salary`),
    PRIMARY KEY (`salaryIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_crawler_keywords` (
    `keywordIdx` INTEGER NOT NULL AUTO_INCREMENT,
    `keyword` VARCHAR(100) NOT NULL,
    `region` VARCHAR(50) NOT NULL DEFAULT '서울',
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `discoveryCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`keywordIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_freeboard` (
    `boardIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardTitle` VARCHAR(200) NOT NULL,
    `boardContent` TEXT NOT NULL,
    `boardRegDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `boardModDate` DATETIME(0) NULL,
    `boardLike` BIGINT NOT NULL DEFAULT 0,
    `boardHits` BIGINT NOT NULL DEFAULT 0,
    `boardID` VARCHAR(45) NOT NULL,
    `boardPW` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `tags` LONGTEXT NULL,
    `isDeleted` TINYINT NOT NULL DEFAULT 0,

    INDEX `idx_freeboard_boardid`(`boardID`),
    INDEX `idx_freeboard_category`(`category`),
    INDEX `idx_freeboard_composite`(`isDeleted`, `category`, `boardRegDate` DESC),
    INDEX `idx_freeboard_deleted`(`isDeleted`),
    INDEX `idx_freeboard_hits`(`boardHits`),
    INDEX `idx_freeboard_like`(`boardLike`),
    INDEX `idx_freeboard_regdate`(`boardRegDate`),
    INDEX `idx_freeboard_search`(`isDeleted`, `boardTitle`, `boardContent`(100)),
    PRIMARY KEY (`boardIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_freeboard_comment` (
    `commentIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardIdx` BIGINT NOT NULL,
    `commentLike` BIGINT NOT NULL DEFAULT 0,
    `commentDepth` BIGINT NOT NULL DEFAULT 0,
    `writerId` VARCHAR(45) NOT NULL,
    `writerPw` VARCHAR(100) NOT NULL,
    `commentParent` BIGINT NULL,
    `commentContent` TEXT NOT NULL,
    `commentRegDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `commentModDate` DATETIME(0) NULL,
    `isDeleted` TINYINT NOT NULL DEFAULT 0,

    INDEX `idx_freeboard_comment_board`(`boardIdx`),
    INDEX `idx_freeboard_comment_composite`(`boardIdx`, `isDeleted`, `commentRegDate`),
    INDEX `idx_freeboard_comment_deleted`(`isDeleted`),
    INDEX `idx_freeboard_comment_like`(`commentLike`),
    INDEX `idx_freeboard_comment_parent`(`commentParent`),
    INDEX `idx_freeboard_comment_regdate`(`commentRegDate`),
    PRIMARY KEY (`commentIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_freeboard_stats` (
    `statIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(50) NOT NULL,
    `tag` VARCHAR(50) NULL,
    `count` BIGINT NOT NULL DEFAULT 1,
    `lastUpdated` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_freeboard_stats_category`(`category`),
    INDEX `idx_freeboard_stats_count`(`count`),
    INDEX `idx_freeboard_stats_tag`(`tag`),
    UNIQUE INDEX `unique_category_tag`(`category`, `tag`),
    PRIMARY KEY (`statIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_report_board` (
    `reportIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardIdx` BIGINT NOT NULL,
    `serviceType` VARCHAR(20) NOT NULL,
    `reportReason` VARCHAR(255) NULL,
    `reportDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reportStatus` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `reportResult` TEXT NULL,
    `reporterId` VARCHAR(45) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`reportIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_restaurant_board` (
    `boardIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardTitle` VARCHAR(45) NOT NULL,
    `boardContent` TEXT NULL,
    `restaurantIdx` BIGINT NULL,
    `boardRegDate` VARCHAR(45) NULL,
    `boardLike` BIGINT NOT NULL DEFAULT 0,
    `boardHits` BIGINT NOT NULL DEFAULT 0,
    `boardRating` DECIMAL(2, 1) NULL,
    `boardID` VARCHAR(45) NOT NULL,
    `boardPW` VARCHAR(100) NOT NULL,

    INDEX `idx_restaurant_board_hits`(`boardHits`),
    INDEX `idx_restaurant_board_regDate`(`boardRegDate`),
    INDEX `idx_restaurant_board_restaurantIdx`(`restaurantIdx`),
    PRIMARY KEY (`boardIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_restaurant_comment` (
    `commentIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `boardIdx` BIGINT NOT NULL,
    `commentLike` BIGINT NOT NULL DEFAULT 0,
    `commentDepth` BIGINT NULL,
    `writerId` VARCHAR(45) NOT NULL,
    `writerPw` VARCHAR(100) NOT NULL,
    `commentParent` BIGINT NULL,
    `commentContent` VARCHAR(200) NOT NULL,
    `regDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `modDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_restaurant_comment_boardIdx`(`boardIdx`),
    INDEX `idx_restaurant_comment_parent`(`commentParent`),
    INDEX `idx_restaurant_comment_regDate`(`regDate`),
    PRIMARY KEY (`commentIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_restaurant_info` (
    `restaurantIdx` BIGINT NOT NULL AUTO_INCREMENT,
    `restaurantName` VARCHAR(60) NOT NULL,
    `restaurantLocation` VARCHAR(45) NOT NULL,
    `restaurantType` VARCHAR(45) NOT NULL,
    `restaurantEstablished` VARCHAR(45) NOT NULL,
    `restaurantOwner` VARCHAR(45) NOT NULL,
    `restaurantLatX` DOUBLE NOT NULL,
    `restaurantLatY` DOUBLE NOT NULL,
    `restaurantURL` VARCHAR(200) NOT NULL,
    `restaurantLotAddr` VARCHAR(100) NOT NULL,
    `restaurantAddr` VARCHAR(200) NOT NULL,
    `restaurantMapIMG` VARCHAR(200) NULL,
    `restaurantImage` VARCHAR(200) NULL,
    `restaurantRating` DECIMAL(2, 1) NULL,
    `restaurantMenu` TEXT NULL,
    `restaurantStatus` TINYINT NOT NULL DEFAULT 1,
    `restaurantViewCount` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_restaurant_name_addr`(`restaurantName`, `restaurantAddr`),
    PRIMARY KEY (`restaurantIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_restaurant_request` (
    `requestIdx` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurantName` VARCHAR(60) NOT NULL,
    `restaurantOwner` VARCHAR(45) NULL,
    `restaurantType` VARCHAR(10) NULL,
    `restaurantAddr` VARCHAR(200) NULL,
    `requestStatus` ENUM('pending', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
    `requestDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `processedDate` DATETIME(0) NULL,
    `adminNote` TEXT NULL,

    INDEX `idx_restaurant_request_date`(`requestDate`),
    INDEX `idx_restaurant_request_status`(`requestStatus`),
    PRIMARY KEY (`requestIdx`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

