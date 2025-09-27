const express = require('express');
const router = express.Router();
const outsourceCommentController = require('../controller/outsourceCommentController');

// 외주업체 댓글 조회
router.get('/', outsourceCommentController.getOutsourceComments);

// 외주업체 댓글 추가
router.post('/insert', outsourceCommentController.insertOutsourceComment);

// 외주업체 댓글 수정
router.put('/modify', outsourceCommentController.modifyOutsourceComment);

// 외주업체 댓글 삭제
router.delete('/delete', outsourceCommentController.deleteOutsourceComment);

module.exports = router;
