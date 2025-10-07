const { RestaurantBoard, sequelize, RestaurantComment } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

exports.getRestaurantBoards = async (restaurantIdx, searchParams = {}) => {
    try {
        let whereClause = { restaurantIdx: restaurantIdx };
        
        // 검색 조건이 있는 경우 추가
        const { id, title, content } = searchParams;
        let hasSearchCondition = false;
        
        if (id && id.trim() !== '') {
            // boardID: 정확한 일치 검색
            whereClause.boardID = id.trim();
            hasSearchCondition = true;
            logger.info(`[getRestaurantBoards] ID search applied: "${id.trim()}" for restaurantIdx: ${restaurantIdx}`);
        }
        
        if (title && title.trim() !== '') {
            // boardTitle: LIKE 검색
            whereClause.boardTitle = {
                [Op.like]: `%${title.trim()}%`
            };
            hasSearchCondition = true;
            logger.info(`[getRestaurantBoards] Title search applied: "${title.trim()}" for restaurantIdx: ${restaurantIdx}`);
        }
        
        if (content && content.trim() !== '') {
            // boardContent: LIKE 검색
            whereClause.boardContent = {
                [Op.like]: `%${content.trim()}%`
            };
            hasSearchCondition = true;
            logger.info(`[getRestaurantBoards] Content search applied: "${content.trim()}" for restaurantIdx: ${restaurantIdx}`);
        }
        
        if (!hasSearchCondition) {
            logger.info(`[getRestaurantBoards] No search condition, returning all boards for restaurantIdx: ${restaurantIdx}`);
        }
        
        const boards = await RestaurantBoard.findAll({ 
            where: whereClause,
            order: [['boardRegDate', 'DESC']] // 최신순 정렬
        });
        
        logger.info(`[getRestaurantBoards] Found ${boards.length} boards for restaurantIdx: ${restaurantIdx}`);
        return boards;
    } catch (error) {
        logger.error(`[getRestaurantBoards] Error: ${error.message}`);
        throw error;
    }
};

exports.getRestaurantBoardDetail = async (boardIdx) => {
    try {
        // 게시글 상세 조회
        const board = await RestaurantBoard.findOne({
            where: { boardIdx: boardIdx }
        });

        if (!board) {
            throw new Error('게시글을 찾을 수 없습니다.');
        }

        // 조회수 증가
        await RestaurantBoard.update(
            { boardHits: sequelize.literal('boardHits + 1') },
            { where: { boardIdx: boardIdx } }
        );

        logger.info(`[getRestaurantBoardDetail] Board detail retrieved and view count updated. BoardIdx: ${boardIdx}`);
        return board;
    } catch (error) {
        logger.error(`[getRestaurantBoardDetail] Error: ${error.message}`);
        throw error;
    }
};

exports.insertRestaurantBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    
    try {
        // 필수 필드 검증
        const { boardTitle, boardContent, restaurantIdx, boardID, boardPW, boardPw } = boardData;
        
        // boardPW 또는 boardPw 둘 다 지원
        const password = boardPW || boardPw;
        
        // 디버깅을 위한 로그
        logger.info(`[insertRestaurantBoard] Received data: ${JSON.stringify(boardData)}`);
        logger.info(`[insertRestaurantBoard] Parsed fields - boardTitle: ${boardTitle}, boardContent: ${boardContent}, restaurantIdx: ${restaurantIdx}, boardID: ${boardID}, password: ${password}`);
        
        if (!boardTitle || !boardContent || !restaurantIdx || !boardID || !password) {
            logger.error(`[insertRestaurantBoard] Missing fields - boardTitle: ${!!boardTitle}, boardContent: ${!!boardContent}, restaurantIdx: ${!!restaurantIdx}, boardID: ${!!boardID}, password: ${!!password}`);
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // 현재 날짜/시간 생성
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        // 게시글 생성
        const newBoard = await RestaurantBoard.create({
            boardTitle: boardTitle,
            boardContent: boardContent,
            restaurantIdx: restaurantIdx,
            boardRegDate: currentDate,
            boardLike: 0,
            boardHits: 0,
            boardID: boardID,
            boardPW: hashPassword(password) // SHA256 암호화 적용
        }, { transaction });

        await transaction.commit();
        
        logger.info(`[insertRestaurantBoard] New board created successfully. BoardIdx: ${newBoard.boardIdx}, RestaurantIdx: ${restaurantIdx}`);
        return '식당 후기가 성공적으로 등록되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[insertRestaurantBoard] Error: ${error.message}`);
        throw error;
    }
};

exports.correctRestaurantBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { boardIdx, boardTitle, boardContent, boardID, boardPW, boardPw, writerPw } = boardData;
        
        // 필수 필드 검증 - 프론트엔드 데이터 형식에 맞춰 수정
        const password = boardPW || boardPw || writerPw;
        
        if (!boardIdx || !password) {
            throw new Error('필수 입력값이 누락되었습니다.');
        }
        
        // boardID가 없으면 boardIdx로만 조회 (프론트엔드에서 boardID를 보내지 않는 경우)
        const whereCondition = { boardIdx: boardIdx };
        if (boardID) {
            whereCondition.boardID = boardID;
        }
        whereCondition.boardPW = hashPassword(password);
        
        const existingBoard = await RestaurantBoard.findOne({
            where: whereCondition
        }, { transaction });

        if (!existingBoard) {
            throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        // 게시글 수정
        const updateData = {};
        if (boardTitle) updateData.boardTitle = boardTitle;
        if (boardContent) updateData.boardContent = boardContent;

        await RestaurantBoard.update(updateData, {
            where: { boardIdx: boardIdx }
        }, { transaction });

        await transaction.commit();
        
        logger.info(`[correctRestaurantBoard] Board updated successfully. BoardIdx: ${boardIdx}`);
        return '식당 후기가 성공적으로 수정되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[correctRestaurantBoard] Error: ${error.message}`);
        throw error;
    }
};

exports.deleteRestaurantBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { boardIdx, boardID, boardPW, boardPw, writerPw } = boardData;
        
        // 필수 필드 검증 - 프론트엔드 데이터 형식에 맞춰 수정
        const password = boardPW || boardPw || writerPw;
        
        if (!boardIdx || !password) {
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // boardID가 없으면 boardIdx로만 조회 (프론트엔드에서 boardID를 보내지 않는 경우)
        const whereCondition = { boardIdx: boardIdx };
        if (boardID) {
            whereCondition.boardID = boardID;
        }
        whereCondition.boardPW = hashPassword(password);

        // 작성자 확인 후 삭제
        const deleteResult = await RestaurantBoard.destroy({
            where: whereCondition
        }, { transaction });

        if (deleteResult === 0) {
            throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        await transaction.commit();
        
        logger.info(`[deleteRestaurantBoard] Board deleted successfully. BoardIdx: ${boardIdx}`);
        return '식당 후기가 성공적으로 삭제되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[deleteRestaurantBoard] Error: ${error.message}`);
        throw error;
    }
};

exports.toggleRestaurantBoardLike = async (boardIdx, isLiked) => {
    try {
        // 게시글 존재 확인
        const board = await RestaurantBoard.findByPk(boardIdx);
        
        if (!board) {
            throw new Error('게시글을 찾을 수 없습니다.');
        }

        let updateQuery;
        let message;
        
        if (isLiked) {
            // 좋아요 증가
            updateQuery = { boardLike: sequelize.literal('boardLike + 1') };
            message = '좋아요가 추가되었습니다.';
        } else {
            // 좋아요 감소 (0 미만으로 내려가지 않도록 처리)
            updateQuery = { boardLike: sequelize.literal('GREATEST(boardLike - 1, 0)') };
            message = '좋아요가 취소되었습니다.';
        }

        await RestaurantBoard.update(updateQuery, {
            where: { boardIdx: boardIdx }
        });

        // 업데이트된 좋아요 수 조회
        const updatedBoard = await RestaurantBoard.findByPk(boardIdx);
        
        logger.info(`[toggleRestaurantBoardLike] Board like toggled. BoardIdx: ${boardIdx}, IsLiked: ${isLiked}, NewLikeCount: ${updatedBoard.boardLike}`);
        
        return {
            message: message,
            likeCount: updatedBoard.boardLike
        };
    } catch (error) {
        logger.error(`[toggleRestaurantBoardLike] Error: ${error.message}`);
        throw error;
    }
};

exports.getRestaurantBoardLike = async (boardId) => {
    try {
        const board = await RestaurantBoard.findByPk(boardId, {
            attributes: ['boardLike']
        });
        
        if (!board) {
            throw new Error('게시글을 찾을 수 없습니다.');
        }
        
        logger.info(`[getRestaurantBoardLike] Board like count retrieved. BoardId: ${boardId}, LikeCount: ${board.boardLike}`);
        return board.boardLike;
    } catch (error) {
        logger.error(`[getRestaurantBoardLike] Error: ${error.message}`);
        throw error;
    }
};

exports.getRecentRestaurantBoardsWithRestaurantInfo = async () => {
    try {
        const boards = await RestaurantBoard.findAll({
            include: [{
                model: require('../model/index').RestaurantInfo,
                as: 'restaurant',
                where: { restaurantStatus: 1 }, // 활성 상태인 식당만
                required: true
            }],
            order: [['boardRegDate', 'DESC']],
            limit: 20 // 최신 20개
        });
        
        logger.info(`[getRecentRestaurantBoardsWithRestaurantInfo] Found ${boards.length} recent boards with restaurant info`);
        return boards;
    } catch (error) {
        logger.error(`[getRecentRestaurantBoardsWithRestaurantInfo] Error: ${error.message}`);
        throw error;
    }
};

exports.getTopViewedRestaurantBoardsByRestaurant = async () => {
    try {
        const boards = await RestaurantBoard.findAll({
            include: [{
                model: require('../model/index').RestaurantInfo,
                as: 'restaurant',
                where: { restaurantStatus: 1 }, // 활성 상태인 식당만
                required: true
            }],
            order: [['boardHits', 'DESC']], // 조회수 기준 내림차순
            limit: 10 // TOP 10
        });
        
        logger.info(`[getTopViewedRestaurantBoardsByRestaurant] Found ${boards.length} top viewed boards by restaurant`);
        return boards;
    } catch (error) {
        logger.error(`[getTopViewedRestaurantBoardsByRestaurant] Error: ${error.message}`);
        throw error;
    }
};

