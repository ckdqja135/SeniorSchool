-- 식당 정보 테이블에 이미지와 별점 컬럼 추가

-- 이미지 컬럼 추가
ALTER TABLE tb_restaurant_info 
ADD COLUMN restaurantImage VARCHAR(200) NULL COMMENT '식당 이미지' AFTER restaurantMapIMG;

-- 별점 컬럼 추가 (0.0 ~ 5.0, 0.5 단위)
ALTER TABLE tb_restaurant_info 
ADD COLUMN restaurantRating DECIMAL(2,1) NULL COMMENT '식당 별점 (0.0 ~ 5.0, 0.5 단위)' AFTER restaurantImage;

