const { CompBoard, sequelize, CompComment } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

exports.getBoards = async (compIdx, searchParams = {}) => {
    try {
        let whereClause = { compIdx: compIdx };
        
        // 검색 조건이 있는 경우 추가
        const { id, title, content } = searchParams;
        let hasSearchCondition = false;
        
        if (id && id.trim() !== '') {
            // boardID: 정확한 일치 검색
            whereClause.boardID = id.trim();
            hasSearchCondition = true;
            logger.info(`[getBoards] ID search applied: "${id.trim()}" for compIdx: ${compIdx}`);
        }
        
        if (title && title.trim() !== '') {
            // boardTitle: LIKE 검색
            whereClause.boardTitle = {
                [Op.like]: `%${title.trim()}%`
            };
            hasSearchCondition = true;
            logger.info(`[getBoards] Title search applied: "${title.trim()}" for compIdx: ${compIdx}`);
        }
        
        if (content && content.trim() !== '') {
            // boardContent: LIKE 검색
            whereClause.boardContent = {
                [Op.like]: `%${content.trim()}%`
            };
            hasSearchCondition = true;
            logger.info(`[getBoards] Content search applied: "${content.trim()}" for compIdx: ${compIdx}`);
        }
        
        if (!hasSearchCondition) {
            logger.info(`[getBoards] No search condition, returning all boards for compIdx: ${compIdx}`);
        }
        
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
            boardRegDate: now.toISOString().slice(0, 19).replace('T', ' ')
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
        const increment = isLiked ? 1 : -1;
        
        // 좋아요 수 업데이트
        await CompBoard.update(
            { 
                boardLike: sequelize.literal(`GREATEST(0, boardLike + ${increment})`)
            },
            { 
                where: { boardIdx: boardIdx },
                transaction 
            }
        );

        // 업데이트된 좋아요 수 조회
        const updatedBoard = await CompBoard.findOne({
            where: { boardIdx: boardIdx },
            attributes: ['boardLike'],
            transaction
        });

        await transaction.commit();
        
        const action = isLiked ? 'increased' : 'decreased';
        logger.info(`[toggleBoardLike] Board like ${action} for boardIdx: ${boardIdx}, current likes: ${updatedBoard.boardLike}`);
        
        return {
            message: `Board like ${action} successfully`,
            currentLikes: updatedBoard.boardLike
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`[toggleBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 게시판 좋아요 수 조회
exports.getBoardLike = async (boardId) => {
    try {
        const board = await CompBoard.findOne({
            where: { boardIdx: boardId },
            attributes: ['boardLike']
        });

        if (!board) {
            logger.warn(`[getBoardLike] Board not found for boardId: ${boardId}`);
            return 0;
        }

        logger.info(`[getBoardLike] Like count retrieved for boardId: ${boardId}, likes: ${board.boardLike}`);
        return board.boardLike;
    } catch (error) {
        logger.error(`[getBoardLike] Error: ${error.message}`);
        throw error;
    }
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


/**
 * 회사 조회수 기준 인기 회사 TOP10 조회
 */
exports.getTopViewedBoardsByCompany = async () => {
    try {
        const { CompInfo } = require('../model/index');
        
        const topViewedCompanies = await CompInfo.findAll({
            attributes: [
                'compIdx',
                'compName',
                'compLocate',
                'compType',
                'compCEO',
                'compViewCount'
            ],
            order: [
                ['compViewCount', 'DESC'], // 회사 조회수 기준 내림차순
                ['compName', 'ASC']        // 동일 조회수일 경우 회사명 오름차순
            ],
            limit: 10 // TOP 10만 조회
        });

        logger.info(`[getTopViewedBoardsByCompany] 인기 회사 TOP10 조회 성공: ${topViewedCompanies.length}개`);
        
        return {
            status: 200,
            data: topViewedCompanies,
            totalCount: topViewedCompanies.length
        };
    } catch (error) {
        logger.error(`[getTopViewedBoardsByCompany] Error: ${error.message}`);
        throw error;
    }
};