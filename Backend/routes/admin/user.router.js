const express = require('express');
const router = express.Router();
const userController = require('../../controller/admin/userController');

// 로그인
router.post('/signIn', userController.signIn);

// 회원가입
router.post('/signUp', userController.signUp);

// 토큰 검증
router.get('/verify', userController.verifyToken);

router.delete('/deleteAdmin', );

router.post('/addAdmin', );

router.get('/getAdmin', );



module.exports = router;