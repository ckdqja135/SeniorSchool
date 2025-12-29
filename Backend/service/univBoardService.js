const { UnivBoard, sequelize, UnivComment } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const hashPassword = require('../utils/hashPassword');
const { buildBoardSearchConditions } = require('../utils/searchHelper');
const { toggleBoardLike: toggleBoardLikeHelper, getBoardLike: getBoardLikeHelper } = require('../utils/boardLikeHelper');

exports.getBoards = async (univIdx, searchParams = {}) => {
    try {
        let whereClause = { univIdx: univIdx };
        
        // 검색 조건 적용
        const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);
        
        // 검색 조건 로깅
        if (hasSearchCondition) {
            const { id, title, content } = searchParams;
            if (id && id.trim() !== '') {
                logger.info(`[getBoards] ID search applied: "${id.trim()}" for univIdx: ${univIdx}`);
            }
            if (title && title.trim() !== '') {
                logger.info(`[getBoards] Title search applied: "${title.trim()}" for univIdx: ${univIdx}`);
            }
            if (content && content.trim() !== '') {
                logger.info(`[getBoards] Content search applied: "${content.trim()}" for univIdx: ${univIdx}`);
            }
        } else {
            logger.info(`[getBoards] No search condition, returning all boards for univIdx: ${univIdx}`);
        }
        
        whereClause = updatedWhereClause;
        
        const boards = await UnivBoard.findAll({ 
            where: whereClause,
            order: [['boardRegDate', 'DESC']] // 최신순 정렬
        });
        
        logger.info(`[getBoards] Found ${boards.length} boards for univIdx: ${univIdx}`);
        return boards;
        
    } catch (error) {
        logger.error(`[getBoards] Error: ${error.message}`);
        throw error;
    }
};

exports.getBoardDetail = async (boardIdx) => {
    const transaction = await sequelize.transaction();
    try {
        // 조회수 증가
        await UnivBoard.update(
            { boardHit: sequelize.literal('boardHit + 1') },
            { 
                where: { boardIdx: boardIdx },
                transaction 
            }
        );

        // 게시글 상세 정보 조회
        const board = await UnivBoard.findOne({ 
            where: { boardIdx: boardIdx },
            transaction 
        });

        await transaction.commit();
        
        if (!board) {
            logger.warn(`[getBoardDetail] Board not found for boardIdx: ${boardIdx}`);
            return null;
        }
        
        logger.info(`[getBoardDetail] Board detail retrieved for boardIdx: ${boardIdx}`);
        return board;
        
    } catch (error) {
        await transaction.rollback();
        logger.error(`[getBoardDetail] Error: ${error.message}`);
        throw error;
    }
};

exports.insertBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();
        // 게시글 생성
        const board = await UnivBoard.create({
            univIdx: boardData.univIdx,
            boardTitle: boardData.boardTitle,
            boardContent: boardData.boardContent,
            boardID: boardData.boardID,
            boardPw: hashPassword(boardData.boardPw), // SHA256 암호화 적용
            boardHit: 0, // 초기 조회수는 0
            boardLike: 0, // 초기 좋아요는 0
            boardRegDate: now,
            boardModDate: now, // 작성 시에도 수정일을 현재 시간으로 설정
        }, { transaction });

        logger.debug(`[insertBoard] Board created. BoardId: ${board.boardIdx}`);

        await transaction.commit();
        logger.info(`[insertBoard] Transaction committed. Board inserted successfully. BoardId: ${board.boardIdx}`);
        return 'Board inserted successfully';
    } catch (error) {
        logger.error(`[insertBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

exports.correctBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    try {
        // 비밀번호 검증
        const board = await UnivBoard.findOne({
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        if (!board) {
            throw new Error('Board not found');
        }

        // 입력된 비밀번호와 저장된 비밀번호 비교
        const hashedInputPassword = hashPassword(boardData.boardPw);
        if (board.boardPw !== hashedInputPassword) {
            throw new Error('Incorrect password');
        }

        // 게시글 수정
        const now = new Date();
        await UnivBoard.update({
            boardTitle: boardData.boardTitle,
            boardContent: boardData.boardContent,
            boardModDate: now
        }, {
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        await transaction.commit();
        logger.info(`[correctBoard] Board updated successfully. BoardId: ${boardData.boardIdx}`);
        return 'Board updated successfully';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[correctBoard] Error: ${error.message}. Transaction rollback.`);
        throw error;
    }
};

exports.deleteBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    try {
        // 비밀번호 검증
        const board = await UnivBoard.findOne({
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        if (!board) {
            throw new Error('Board not found');
        }

        // 입력된 비밀번호와 저장된 비밀번호 비교
        const hashedInputPassword = hashPassword(boardData.boardPw);
        if (board.boardPw !== hashedInputPassword) {
            throw new Error('Incorrect password');
        }

        // 관련 댓글들도 함께 삭제
        await UnivComment.destroy({
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        // 게시글 삭제
        await UnivBoard.destroy({
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        await transaction.commit();
        logger.info(`[deleteBoard] Board and related comments deleted successfully. BoardId: ${boardData.boardIdx}`);
        return 'Board deleted successfully';
    } catch (error) {
        await transaction.rollback();
        logger.error(`[deleteBoard] Error: ${error.message}. Transaction rollback.`);
        throw error;
    }
};

// 게시판 좋아요 토글 (증가/감소)
exports.toggleBoardLike = async (boardIdx, isLiked) => {
    const transaction = await sequelize.transaction();
    try {
        const result = await toggleBoardLikeHelper(UnivBoard, boardIdx, isLiked, {
            sequelize,
            transaction,
            logger
        });
        await transaction.commit();
        return {
            message: `Board like ${result.action} successfully`,
            currentLikes: result.currentLikes
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// 게시판 좋아요 수 조회
exports.getBoardLike = async (boardId) => {
    return await getBoardLikeHelper(UnivBoard, boardId, {
        logger,
        throwOnNotFound: false
    });
};

/**
 * 최근순으로 게시된 게시글 목록 조회 (대학교 정보 포함)
 */
exports.getRecentBoardsWithUnivInfo = async () => {
    try {
        const { UniversityInfo } = require('../model/index');
        
        const recentBoards = await UnivBoard.findAll({
            include: [{
                model: UniversityInfo,
                as: 'University',
                attributes: ['univName', 'univLocation']
            }],
            attributes: [
                'boardIdx',
                'boardTitle', 
                'boardContent',
                'boardID',
                'boardHit',
                'boardLike',
                'boardRegDate',
                'univIdx'
            ],
            order: [['boardRegDate', 'DESC']],
            limit: 20 // 최근 20개만 조회
        });

        logger.info(`[getRecentBoardsWithUnivInfo] 최근 게시글 조회 성공: ${recentBoards.length}개`);
        
        return {
            status: 200,
            data: recentBoards,
            totalCount: recentBoards.length
        };
    } catch (error) {
        logger.error(`[getRecentBoardsWithUnivInfo] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 전체 대학교의 게시판 조회수 기준 인기 후기 TOP10 조회
 */
exports.getTopViewedBoardsByUniversity = async () => {
    try {
        const { UniversityInfo } = require('../model/index');
        
        const topViewedBoards = await UnivBoard.findAll({
            include: [{
                model: UniversityInfo,
                as: 'University',
                attributes: ['univName', 'univLocation']
            }],
            attributes: [
                'boardIdx',
                'boardTitle',
                'boardContent', 
                'boardID',
                'boardHit',
                'boardLike',
                'boardRegDate',
                'univIdx'
            ],
            order: [
                ['boardHit', 'DESC'],    // 조회수 기준 내림차순
                ['boardRegDate', 'DESC'] // 동일 조회수일 경우 최신순
            ],
            limit: 10 // TOP 10만 조회
        });

        logger.info(`[getTopViewedBoardsByUniversity] 인기 후기 TOP10 조회 성공: ${topViewedBoards.length}개`);
        
        return {
            status: 200,
            data: topViewedBoards,
            totalCount: topViewedBoards.length,
            message: '전체 대학교의 인기 후기 TOP10 조회 성공'
        };
    } catch (error) {
        logger.error(`[getTopViewedBoardsByUniversity] Error: ${error.message}`);
        throw error;
    }
};
