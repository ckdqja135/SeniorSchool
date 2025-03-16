const express = require('express');
const router = express.Router();
const userController = require('../../controller/admin/userController');

// 로그인
router.post('/signIn', userController.signIn);

// 회원가입
router.post('/signUp', userController.signUp);

// 토큰 검증
router.get('/verify', userController.verifyToken);

// 어드민 삭제
router.delete('/deleteAdmin', userController.deleteAdmin );

// 어드민 추가
router.post('/createAdmin', userController.createAdmin);

// 어드민 정보 수정
router.patch('/patchAdmin', userController.patchAdmin);

// 어드민 리스트 가져오기
router.get('/getAdminlist', userController.getAdminlist);

// 로그아웃
// router.patch('/signOut', userController.signOut);

module.exports = router;