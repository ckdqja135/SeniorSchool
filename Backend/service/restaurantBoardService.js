const { RestaurantBoard, RestaurantInfo, sequelize, RestaurantComment } = require('../model/index');
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
        // 게시글 상세 조회 (식당 정보와 댓글 포함)
        const board = await RestaurantBoard.findOne({
            where: { boardIdx: boardIdx },
            include: [
                {
                    model: RestaurantInfo,
                    as: 'restaurant',
                    attributes: ['restaurantName', 'restaurantAddr', 'restaurantLocation', 'restaurantType']
                },
                {
                    model: RestaurantComment,
                    attributes: ['commentIdx', 'commentContent', 'writerId', 'regDate', 'commentLike'],
                    separate: true,
                    order: [['regDate', 'ASC']]
                }
            ]
        });

        if (!board) {
            throw new Error('게시글을 찾을 수 없습니다.');
        }

        // 조회수 증가
        await RestaurantBoard.update(
            { boardHits: sequelize.literal('boardHits + 1') },
            { where: { boardIdx: boardIdx } }
        );

        logger.info(`[getRestaurantBoardDetail] Board detail retrieved with restaurant info and view count updated. BoardIdx: ${boardIdx}`);
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

        // boardRegDate 처리: 프론트엔드에서 보낸 값을 사용, 없으면 현재 시간 사용
        let boardRegDate = boardData.boardRegDate;
        if (!boardRegDate) {
            // 프론트엔드에서 보내지 않으면 서버에서 현재 시간 생성
            boardRegDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        
        // 평점 검증 (0.5 ~ 5.0, 0.5 단위)
        let boardRating = null;
        if (boardData.boardRating !== undefined && boardData.boardRating !== null) {
            const rating = parseFloat(boardData.boardRating);
            if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
                throw new Error('평점은 0.5 ~ 5.0 사이의 값이어야 합니다.');
            }
            // 0.5 단위로 반올림
            boardRating = Math.round(rating * 2) / 2;
        }

        // 게시글 생성
        const newBoard = await RestaurantBoard.create({
            boardTitle: boardTitle,
            boardContent: boardContent,
            restaurantIdx: restaurantIdx,
            boardRegDate: boardRegDate,
            boardLike: 0,
            boardHits: 0,
            boardRating: boardRating,
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
        
        // 평점 검증 및 처리 (0.5 ~ 5.0, 0.5 단위)
        if (boardData.boardRating !== undefined && boardData.boardRating !== null) {
            const rating = parseFloat(boardData.boardRating);
            if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
                throw new Error('평점은 0.5 ~ 5.0 사이의 값이어야 합니다.');
            }
            // 0.5 단위로 반올림
            updateData.boardRating = Math.round(rating * 2) / 2;
        }

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
        // 게시글 존재 확인 및 현재 좋아요 수 조회
        const board = await RestaurantBoard.findByPk(boardIdx);
        
        if (!board) {
            throw new Error('게시글을 찾을 수 없습니다.');
        }

        // 현재 좋아요 수를 숫자로 변환 (문자열 연결 방지)
        const currentLikes = Number(board.boardLike) || 0;
        let newLikes;
        let message;
        
        if (isLiked) {
            // 좋아요 증가
            newLikes = currentLikes + 1;
            message = '좋아요가 추가되었습니다.';
        } else {
            // 좋아요 감소 (0 미만으로 내려가지 않도록 처리)
            newLikes = Math.max(0, currentLikes - 1);
            message = '좋아요가 취소되었습니다.';
        }

        await RestaurantBoard.update(
            { boardLike: newLikes },
            { where: { boardIdx: boardIdx } }
        );
        
        logger.info(`[toggleRestaurantBoardLike] Board like toggled. BoardIdx: ${boardIdx}, IsLiked: ${isLiked}, Current: ${currentLikes}, New: ${newLikes}`);
        
        return {
            message: message,
            likeCount: newLikes
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
                model: RestaurantInfo,
                as: 'restaurant',
                where: { restaurantStatus: 1 }, // 활성 상태인 식당만
                required: true
            }],
            order: [['boardRegDate', 'DESC']],
            limit: 5 // 최신 5개
        });
        
        logger.info(`[getRecentRestaurantBoardsWithRestaurantInfo] Found ${boards.length} recent boards with restaurant info`);
        return boards;
    } catch (error) {
        logger.error(`[getRecentRestaurantBoardsWithRestaurantInfo] Error: ${error.message}`);
        throw error;
    }
};

