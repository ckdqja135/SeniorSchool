const express = require('express');
const router = express.Router();
const churchCommentController = require('../controller/churchCommentController');

// 교회 댓글 조회
router.get('/', churchCommentController.getChurchComments);

// 교회 댓글 추가
router.post('/insert', churchCommentController.insertChurchComment);

// 교회 댓글 수정
router.put('/modify', churchCommentController.modifyChurchComment);

// 교회 댓글 삭제
router.delete('/delete', churchCommentController.deleteChurchComment);

module.exports = router;
