const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 업로드 디렉토리 설정
const uploadDir = path.join(__dirname, '../public/uploads/restaurants');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`[uploadMiddleware] Created upload directory: ${uploadDir}`);
}

// 파일 저장 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 파일명: restaurant_{timestamp}_{random}.{ext}
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `restaurant_${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// 파일 필터 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다. (jpeg, jpg, png, gif, webp)'));
    }
};

// multer 설정
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB 제한
    },
    fileFilter: fileFilter
});

// 단일 이미지 업로드 미들웨어
const uploadSingleImage = upload.single('restaurantImage');

// 이미지 업로드 미들웨어 래퍼 (에러 처리 포함)
const handleImageUpload = (req, res, next) => {
    uploadSingleImage(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: '파일 크기는 5MB를 초과할 수 없습니다.' });
                }
                return res.status(400).json({ error: err.message });
            }
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

module.exports = {
    upload,
    handleImageUpload
};

