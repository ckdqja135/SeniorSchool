-- 식당 원본 분류·테마 태그 컬럼 (신규).
-- 크롤러가 소스의 원본 분류(카카오 category_name 등)를 그대로 남기고, 그걸로 붙인 테마 태그를 함께 저장한다.
-- restaurantType 은 기존 화면이 쓰는 짧은 분류("한식")라 그대로 두고 따로 둔다.
-- 둘 다 NULL 허용이라 기존 행에는 영향이 없다 (다음 수집 때 채워진다).
-- 롤백: ALTER TABLE `tb_restaurant_info` DROP COLUMN `restaurantTheme`, DROP COLUMN `restaurantCategory`;

ALTER TABLE `tb_restaurant_info`
  ADD COLUMN `restaurantCategory` VARCHAR(100) NULL AFTER `restaurantType`,
  ADD COLUMN `restaurantTheme`    VARCHAR(100) NULL AFTER `restaurantCategory`;
