const express = require('express');
const router = express.Router();
const commentController = require('../controller/commentController');

// 댓글 조회
router.get('/', commentController.getComments);

// 댓글 추가
router.post('/insert', commentController.insertComment);

// 댓글 수정
router.put('/modify', commentController.modifyComment);

// 댓글 삭제
router.put('/delete', commentController.deleteComment);

module.exports = router;
