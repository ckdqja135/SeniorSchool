const express = require('express');
const router = express.Router();
const controller = require('../../controller/admin/freeBoardController');
const { authenticateToken, isAdmin } = require('../../middlewares/authMiddleware');

/**
 * Admin - 자유게시판 관리 API (삽입, 수정, 삭제)
 */

// 게시글 생성
router.post('/', authenticateToken, isAdmin, controller.createPost);

// 게시글 수정
router.put('/:boardIdx', authenticateToken, isAdmin, controller.updatePost);

// 게시글 삭제 (소프트 삭제)
router.delete('/:boardIdx', authenticateToken, isAdmin, controller.deletePost);

module.exports = router;


