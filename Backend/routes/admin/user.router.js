const express = require('express');
const router = express.Router();
const userController = require('../../controller/admin/userController');
const { authenticateToken, isMaster } = require('../../middlewares/authMiddleware');

// 로그인
router.post('/signIn', userController.signIn);

// 토큰 검증
router.get('/verify', userController.verifyToken);

// 어드민 삭제
router.delete('/deleteAdmin', authenticateToken, isMaster, userController.deleteAdmin );

// 어드민 추가
router.post('/createAdmin', authenticateToken, isMaster, userController.createAdmin);

// 어드민 정보 수정
router.patch('/patchAdmin', authenticateToken, isMaster, userController.patchAdmin);

// 어드민 리스트 가져오기
router.get('/getAdminlist', authenticateToken, isMaster, userController.getAdminlist);

// 로그아웃
router.patch('/signOut', authenticateToken, userController.signOut);

module.exports = router;