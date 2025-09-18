const express = require('express');
const router = express.Router();
const univCommentController = require('../controller/univCommentController');

// 댓글 조회
router.get('/', univCommentController.getComments);

// 댓글 추가
router.post('/insert', univCommentController.insertComment);

// 댓글 수정
router.put('/modify', univCommentController.modifyComment);

// 댓글 삭제
router.put('/delete', univCommentController.deleteComment);

module.exports = router;
