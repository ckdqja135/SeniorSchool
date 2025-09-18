const express = require('express');
const router = express.Router();
const compCommentController = require('../controller/compCommentController');

// 댓글 조회
router.get('/', compCommentController.getComments);

// 댓글 추가
router.post('/insert', compCommentController.insertComment);

// 댓글 수정
router.put('/modify', compCommentController.modifyComment);

// 댓글 삭제
router.put('/delete', compCommentController.deleteComment);

module.exports = router;
