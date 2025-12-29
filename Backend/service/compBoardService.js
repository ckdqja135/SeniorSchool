const { CompBoard, sequelize, CompComment } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const hashPassword = require('../utils/hashPassword');
const { buildBoardSearchConditions } = require('../utils/searchHelper');
const { toggleBoardLike: toggleBoardLikeHelper, getBoardLike: getBoardLikeHelper } = require('../utils/boardLikeHelper');

exports.getBoards = async (compIdx, searchParams = {}) => {
    try {
        let whereClause = { compIdx: compIdx };
        
        // 검색 조건 적용
        const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);
        
        // 검색 조건 로깅
        if (hasSearchCondition) {
            const { id, title, content } = searchParams;
            if (id && id.trim() !== '') {
                logger.info(`[getBoards] ID search applied: "${id.trim()}" for compIdx: ${compIdx}`);
            }
            if (title && title.trim() !== '') {
                logger.info(`[getBoards] Title search applied: "${title.trim()}" for compIdx: ${compIdx}`);
            }
            if (content && content.trim() !== '') {
                logger.info(`[getBoards] Content search applied: "${content.trim()}" for compIdx: ${compIdx}`);
            }
        } else {
            logger.info(`[getBoards] No search condition, returning all boards for compIdx: ${compIdx}`);
        }
        
        whereClause = updatedWhereClause;
        
        const boards = await CompBoard.findAll({ 
            where: whereClause,
            order: [['boardRegDate', 'DESC']] // 최신순 정렬
        });
        
        logger.info(`[getBoards] Found ${boards.length} boards for compIdx: ${compIdx}`);
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
        await CompBoard.update(
            { boardHits: sequelize.literal('boardHits + 1') },
            { 
                where: { boardIdx: boardIdx },
                transaction 
            }
        );

        // 게시글 상세 정보 조회
        const board = await CompBoard.findOne({ 
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

const normalizeBoardRating = (rating) => {
    if (rating === undefined || rating === null) {
        return null;
    }
    const numericRating = parseFloat(rating);
    if (
        Number.isNaN(numericRating) ||
        numericRating < 0.5 ||
        numericRating > 5.0 ||
        !Number.isInteger(numericRating * 2)
    ) {
        throw new Error('Invalid board rating value');
    }
    return numericRating;
};

exports.insertBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();
        // 게시글 생성
        const board = await CompBoard.create({
            compIdx: boardData.compIdx,
            boardTitle: boardData.boardTitle,
            boardContent: boardData.boardContent,
            boardID: boardData.boardID,
            boardPW: hashPassword(boardData.boardPw), // SHA256 암호화 적용
            boardHits: 0, // 초기 조회수는 0
            boardLike: 0, // 초기 좋아요는 0
            boardRegDate: now.toISOString().slice(0, 19).replace('T', ' '), // 문자열 형태로 저장
            boardRating: normalizeBoardRating(boardData.boardRating),
            isDeleted: false
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
        const board = await CompBoard.findOne({
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        if (!board) {
            throw new Error('Board not found');
        }

        // 입력된 비밀번호와 저장된 비밀번호 비교
        const hashedInputPassword = hashPassword(boardData.boardPw);
        if (board.boardPW !== hashedInputPassword) {
            throw new Error('Incorrect password');
        }

        // 게시글 수정
        const now = new Date();
        await CompBoard.update({
            boardTitle: boardData.boardTitle,
            boardContent: boardData.boardContent,
            boardRegDate: now.toISOString().slice(0, 19).replace('T', ' '),
            boardRating: normalizeBoardRating(boardData.boardRating)
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
        const board = await CompBoard.findOne({
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        if (!board) {
            throw new Error('Board not found');
        }

        // 입력된 비밀번호와 저장된 비밀번호 비교
        const hashedInputPassword = hashPassword(boardData.boardPw);
        if (board.boardPW !== hashedInputPassword) {
            throw new Error('Incorrect password');
        }

        // 관련 댓글들도 함께 삭제
        await CompComment.destroy({
            where: { boardIdx: boardData.boardIdx },
            transaction
        });

        // 게시글 삭제
        await CompBoard.destroy({
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
        const result = await toggleBoardLikeHelper(CompBoard, boardIdx, isLiked, {
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
    return await getBoardLikeHelper(CompBoard, boardId, {
        logger,
        throwOnNotFound: false
    });
};

/**
 * 최근순으로 게시된 게시글 목록 조회 (회사 정보 포함)
 */
exports.getRecentBoardsWithCompInfo = async () => {
    try {
        const { CompInfo } = require('../model/index');
        
        const recentBoards = await CompBoard.findAll({
            include: [{
                model: CompInfo,
                as: 'company',
                attributes: ['compName', 'compLocate']
            }],
            attributes: [
                'boardIdx',
                'boardTitle', 
                'boardContent',
                'boardID',
                'boardHits',
                'boardLike',
                'boardRegDate',
                'compIdx'
            ],
            order: [['boardRegDate', 'DESC']],
            limit: 5 // 최근 5개 조회
        });

        logger.info(`[getRecentBoardsWithCompInfo] 최근 게시글 조회 성공: ${recentBoards.length}개`);
        
        return {
            status: 200,
            data: recentBoards,
            totalCount: recentBoards.length
        };
    } catch (error) {
        logger.error(`[getRecentBoardsWithCompInfo] Error: ${error.message}`);
        throw error;
    }
};

