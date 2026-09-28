-- 스케줄러 실행 기록 테이블 (신규).
-- 지금까지 크론이 언제 돌았는지, 성공했는지 남는 곳이 어디에도 없었다.
-- 어드민 '스케줄러 실행' 화면이 이 표를 읽고, 수동 실행과 정기(크론) 실행 둘 다 여기에 쌓인다.
-- 새 테이블이라 기존 데이터에 영향이 없다.
-- 롤백: DROP TABLE `tb_scheduler_run`;

CREATE TABLE `tb_scheduler_run` (
  `runIdx`        BIGINT       NOT NULL AUTO_INCREMENT,
  -- 잡 레지스트리 키 (예: restaurant-crawl)
  `jobKey`        VARCHAR(60)  NOT NULL,
  -- 화면 표시용 이름. 키가 바뀌어도 과거 기록이 읽히도록 같이 저장한다
  `jobLabel`      VARCHAR(100) NOT NULL,
  -- manual | cron
  `trigger`       VARCHAR(10)  NOT NULL DEFAULT 'manual',
  -- running | success | failed | canceled
  `status`        VARCHAR(10)  NOT NULL DEFAULT 'running',
  -- 대상 기간 (기간을 받는 잡만 채운다)
  `periodFrom`    VARCHAR(20)  NULL,
  `periodTo`      VARCHAR(20)  NULL,
  `startedAt`     DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finishedAt`    DATETIME(0)  NULL,
  `durationMs`    INT          NULL,
  -- 결과 한 줄 요약 (예: "42건 저장")
  `resultMessage` VARCHAR(255) NULL,
  `error`         TEXT         NULL,
  PRIMARY KEY (`runIdx`),
  INDEX `idx_scheduler_run_job` (`jobKey`, `startedAt`),
  INDEX `idx_scheduler_run_status` (`status`),
  INDEX `idx_scheduler_run_started` (`startedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
