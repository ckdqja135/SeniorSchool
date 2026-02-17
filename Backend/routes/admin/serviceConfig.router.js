const express = require('express');
const router = express.Router();
const configController = require('../../controller/admin/serviceConfigController');
const entityController = require('../../controller/admin/dynamicEntityController');
const boardController = require('../../controller/admin/dynamicBoardController');
const requestController = require('../../controller/admin/dynamicRequestController');
const { authenticateToken, isAdmin } = require('../../middlewares/authMiddleware');
const { slugResolver } = require('../../middlewares/slugResolver');

// 서비스 설정 CRUD
router.get('/', authenticateToken, isAdmin, configController.listServices);
router.post('/', authenticateToken, isAdmin, configController.createService);
router.get('/:slug', authenticateToken, isAdmin, configController.getService);
router.put('/:slug', authenticateToken, isAdmin, configController.updateService);
router.delete('/:slug', authenticateToken, isAdmin, configController.deleteService);

// 어드민 동적 서비스 관리 (slug 기반)
router.use('/:slug/search', authenticateToken, isAdmin, slugResolver);
router.use('/:slug/entities', authenticateToken, isAdmin, slugResolver);
router.use('/:slug/board', authenticateToken, isAdmin, slugResolver);
router.use('/:slug/requests', authenticateToken, isAdmin, slugResolver);

// 엔티티 관리
router.get('/:slug/search', entityController.searchEntities);
router.post('/:slug/entities', entityController.createEntity);
router.put('/:slug/entities/:id', entityController.updateEntity);
router.delete('/:slug/entities/:id', entityController.deleteEntity);

// 게시판 관리
router.get('/:slug/board', boardController.listBoards);
router.delete('/:slug/board/:id', boardController.deleteBoard);

// 추가 요청 관리
router.get('/:slug/requests', requestController.listRequests);
router.put('/:slug/requests/:id', requestController.updateRequestStatus);

module.exports = router;
