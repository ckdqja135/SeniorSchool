const express = require('express');
const router = express.Router();
const controller = require('../../controller/admin/churchBoardController');
const { authenticateToken, isAdmin } = require('../../middlewares/authMiddleware');

/**
 * Admin - 교회오빠 - 후기 관리 API (조회, 삽입, 수정, 삭제)
 */

// 후기 목록 조회 (페이지네이션)
router.get('/', authenticateToken, isAdmin, controller.getPosts);

// 후기 생성
router.post('/', authenticateToken, isAdmin, controller.createPost);

// 후기 수정
router.put('/:boardIdx', authenticateToken, isAdmin, controller.updatePost);

// 후기 삭제
router.delete('/:boardIdx', authenticateToken, isAdmin, controller.deletePost);

module.exports = router;
