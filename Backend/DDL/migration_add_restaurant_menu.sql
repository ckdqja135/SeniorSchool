-- 식당 메뉴 컬럼 추가 마이그레이션
-- restaurantMenu: JSON 문자열로 메뉴명+가격 저장
-- 예시: [{"name":"교자칼국수","price":12000},{"name":"만두","price":8000}]

ALTER TABLE tb_restaurant_info
ADD COLUMN restaurantMenu TEXT NULL COMMENT '식당 메뉴 (JSON 배열: [{name, price}])' AFTER restaurantRating;
