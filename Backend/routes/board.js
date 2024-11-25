const express = require('express');
const router = express.Router();
const boardController = require('../controller/boardController');

// 라우트 정의
router.get('/', boardController.getBoards);
router.get('/detail', boardController.getBoardDetail);
router.post('/insert', boardController.insertBoard);
router.put('/correct', boardController.correctBoard);
router.delete('/delete', boardController.deleteBoard);

module.exports = router;