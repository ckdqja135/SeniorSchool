const express = require('express');
const router = express.Router();
const { slugResolver } = require('../../middlewares/slugResolver');

// 퍼블릭 컨트롤러
const entityController = require('../../controller/dynamic/dynamicEntityController');
const boardController = require('../../controller/dynamic/dynamicBoardController');
const commentController = require('../../controller/dynamic/dynamicCommentController');
const requestController = require('../../controller/dynamic/dynamicRequestController');

// 모든 :slug 경로에 slugResolver 미들웨어 적용
router.use('/:slug', slugResolver);

// 엔티티 API
router.get('/:slug/entities', entityController.listEntities);
router.get('/:slug/entities/top-viewed', entityController.getTopViewed);
router.get('/:slug/entities/auto-search', entityController.autoSearch);
router.get('/:slug/entities/:id', entityController.getEntityDetail);

// 게시판 API
router.get('/:slug/boards', boardController.listBoards);
router.get('/:slug/boards/recent', boardController.getRecentBoards);
router.get('/:slug/boards/top-viewed', boardController.getTopViewedBoards);
router.get('/:slug/boards/:id', boardController.getBoardDetail);
router.post('/:slug/boards/insert', boardController.insertBoard);
router.post('/:slug/boards/:id/like', boardController.toggleBoardLike);

// 댓글 API
router.get('/:slug/comments/:boardId', commentController.listComments);
router.post('/:slug/comments', commentController.createComment);
router.delete('/:slug/comments/:id', commentController.deleteComment);

// 추가 요청 API
router.post('/:slug/requests', requestController.createRequest);

module.exports = router;
