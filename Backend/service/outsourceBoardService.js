const { OutsourceBoard, OutsourceInfo, OutsourceComment, sequelize } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const hashPassword = require('../utils/hashPassword');
const { buildBoardSearchConditions } = require('../utils/searchHelper');
const { toggleBoardLike: toggleBoardLikeHelper, getBoardLike: getBoardLikeHelper } = require('../utils/boardLikeHelper');

exports.getOutsourceBoards = async (outsourceIdx, searchParams = {}) => {
    try {
        let whereClause = { outsourceIdx: outsourceIdx };
        
        // 검색 조건 적용
        const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);
        
        // 검색 조건 로깅
        if (hasSearchCondition) {
            const { id, title, content } = searchParams;
            if (id && id.trim() !== '') {
                logger.info(`[getOutsourceBoards] ID search applied: "${id.trim()}" for outsourceIdx: ${outsourceIdx}`);
            }
            if (title && title.trim() !== '') {
                logger.info(`[getOutsourceBoards] Title search applied: "${title.trim()}" for outsourceIdx: ${outsourceIdx}`);
            }
            if (content && content.trim() !== '') {
                logger.info(`[getOutsourceBoards] Content search applied: "${content.trim()}" for outsourceIdx: ${outsourceIdx}`);
            }
        } else {
            logger.info(`[getOutsourceBoards] No search condition, returning all boards for outsourceIdx: ${outsourceIdx}`);
        }
        
        whereClause = updatedWhereClause;
        
        const boards = await OutsourceBoard.findAll({ 
            where: whereClause,
            order: [['boardRegDate', 'DESC']] // 최신순 정렬
        });
        
        logger.info(`[getOutsourceBoards] Found ${boards.length} boards for outsourceIdx: ${outsourceIdx}`);
        return boards;
    } catch (error) {
        logger.error(`[getOutsourceBoards] Error: ${error.message}`);
        throw error;
    }
};

exports.getOutsourceBoardDetail = async (boardIdx) => {
    try {
        // 게시글 상세 조회 (외주업체 정보와 댓글 포함)
        const board = await OutsourceBoard.findOne({
            where: { boardIdx: boardIdx },
            include: [
                {
                    model: OutsourceInfo,
                    as: 'outsource',
                    attributes: ['outsourceName', 'outsourceAddr', 'outsourceLocation', 'outsourceType', 'outsourceEstablished', 'outsourceCEO', 'outsourceURL']
                },
                {
                    model: OutsourceComment,
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
        await OutsourceBoard.update(
            { boardHits: sequelize.literal('boardHits + 1') },
            { where: { boardIdx: boardIdx } }
        );

        logger.info(`[getOutsourceBoardDetail] Board detail retrieved with outsource info and view count updated. BoardIdx: ${boardIdx}`);
        return board;
    } catch (error) {
        logger.error(`[getOutsourceBoardDetail] Error: ${error.message}`);
        throw error;
    }
};

exports.insertOutsourceBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    
    try {
        // 필수 필드 검증
        const { boardTitle, boardContent, outsourceIdx, boardID, boardPW, boardPw } = boardData;
        
        // boardPW 또는 boardPw 둘 다 지원
        const password = boardPW || boardPw;
        
        // 디버깅을 위한 로그
        logger.info(`[insertOutsourceBoard] Received data: ${JSON.stringify(boardData)}`);
        logger.info(`[insertOutsourceBoard] Parsed fields - boardTitle: ${boardTitle}, boardContent: ${boardContent}, outsourceIdx: ${outsourceIdx}, boardID: ${boardID}, password: ${password}`);
        
        if (!boardTitle || !boardContent || !outsourceIdx || !boardID || !password) {
            logger.error(`[insertOutsourceBoard] Missing fields - boardTitle: ${!!boardTitle}, boardContent: ${!!boardContent}, outsourceIdx: ${!!outsourceIdx}, boardID: ${!!boardID}, password: ${!!password}`);
            throw new Error('필수 입력값이 누락되었습니다.');
        }

        // 현재 날짜/시간 생성
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        // 게시글 생성
        const newBoard = await OutsourceBoard.create({
            boardTitle: boardTitle,
            boardContent: boardContent,
            outsourceIdx: outsourceIdx,
            boardRegDate: currentDate,
            boardLike: 0,
            boardHits: 0,
            boardID: boardID,
            boardPW: hashPassword(password) // SHA256 암호화 적용
        }, { transaction });

        await transaction.commit();
        
        logger.info(`[insertOutsourceBoard] New board created successfully. BoardIdx: ${newBoard.boardIdx}, OutsourceIdx: ${outsourceIdx}`);
        return '외주 후기가 성공적으로 등록되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[insertOutsourceBoard] Error: ${error.message}`);
        throw error;
    }
};

exports.correctOutsourceBoard = async (boardData) => {
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
        
        const existingBoard = await OutsourceBoard.findOne({
            where: whereCondition
        }, { transaction });

        if (!existingBoard) {
            throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        // 게시글 수정
        const updateData = {};
        if (boardTitle) updateData.boardTitle = boardTitle;
        if (boardContent) updateData.boardContent = boardContent;

        await OutsourceBoard.update(updateData, {
            where: { boardIdx: boardIdx }
        }, { transaction });

        await transaction.commit();
        
        logger.info(`[correctOutsourceBoard] Board updated successfully. BoardIdx: ${boardIdx}`);
        return '외주 후기가 성공적으로 수정되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[correctOutsourceBoard] Error: ${error.message}`);
        throw error;
    }
};

exports.deleteOutsourceBoard = async (boardData) => {
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
        const deleteResult = await OutsourceBoard.destroy({
            where: whereCondition
        }, { transaction });

        if (deleteResult === 0) {
            throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        await transaction.commit();
        
        logger.info(`[deleteOutsourceBoard] Board deleted successfully. BoardIdx: ${boardIdx}`);
        return '외주 후기가 성공적으로 삭제되었습니다.';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[deleteOutsourceBoard] Error: ${error.message}`);
        throw error;
    }
};

exports.toggleOutsourceBoardLike = async (boardIdx, isLiked) => {
    const result = await toggleBoardLikeHelper(OutsourceBoard, boardIdx, isLiked, {
        sequelize,
        logger
    });
    return {
        message: result.message,
        likeCount: result.currentLikes
    };
};

exports.getOutsourceBoardLike = async (boardId) => {
    return await getBoardLikeHelper(OutsourceBoard, boardId, {
        logger,
        throwOnNotFound: true
    });
};

exports.getRecentOutsourceBoardsWithOutsourceInfo = async () => {
    try {
        const boards = await OutsourceBoard.findAll({
            include: [{
                model: require('../model/index').OutsourceInfo,
                as: 'outsource',
                where: { outsourceStatus: 1 }, // 활성 상태인 외주업체만
                required: true
            }],
            order: [['boardRegDate', 'DESC']],
            limit: 20 // 최신 20개
        });
        
        logger.info(`[getRecentOutsourceBoardsWithOutsourceInfo] Found ${boards.length} recent boards with outsource info`);
        return boards;
    } catch (error) {
        logger.error(`[getRecentOutsourceBoardsWithOutsourceInfo] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체별로 후기 조회수 기준 인기 후기 TOP10 조회
exports.getTopViewedOutsourceBoardsByOutsource = async () => {
    try {
        const boards = await OutsourceBoard.findAll({
            include: [{
                model: require('../model/index').OutsourceInfo,
                as: 'outsource',
                where: { outsourceStatus: 1 }, // 활성 상태인 외주업체만
                required: true
            }],
            order: [['boardHits', 'DESC']], // 조회수 기준 내림차순
            limit: 10 // TOP 10
        });
        
        logger.info(`[getTopViewedOutsourceBoardsByOutsource] Found ${boards.length} top viewed boards by outsource`);
        return boards;
    } catch (error) {
        logger.error(`[getTopViewedOutsourceBoardsByOutsource] Error: ${error.message}`);
        throw error;
    }
};

