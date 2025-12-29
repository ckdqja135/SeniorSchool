const { ChurchBoard, sequelize, ChurchComment } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const hashPassword = require('../utils/hashPassword');
const { buildBoardSearchConditions } = require('../utils/searchHelper');
const { toggleBoardLike: toggleBoardLikeHelper, getBoardLike: getBoardLikeHelper } = require('../utils/boardLikeHelper');

exports.getChurchBoards = async (churchIdx, searchParams = {}) => {
    try {
        let whereClause = { churchIdx: churchIdx };
        
        // 검색 조건 적용
        const { whereClause: updatedWhereClause, hasSearchCondition } = buildBoardSearchConditions(searchParams, whereClause);
        
        // 검색 조건 로깅
        if (hasSearchCondition) {
            const { id, title, content } = searchParams;
            if (id && id.trim() !== '') {
                logger.info(`[getChurchBoards] ID search applied: "${id.trim()}" for churchIdx: ${churchIdx}`);
            }
            if (title && title.trim() !== '') {
                logger.info(`[getChurchBoards] Title search applied: "${title.trim()}" for churchIdx: ${churchIdx}`);
            }
            if (content && content.trim() !== '') {
                logger.info(`[getChurchBoards] Content search applied: "${content.trim()}" for churchIdx: ${churchIdx}`);
            }
        } else {
            logger.info(`[getChurchBoards] No search condition, returning all boards for churchIdx: ${churchIdx}`);
        }
        
        whereClause = updatedWhereClause;
        
        const boards = await ChurchBoard.findAll({ 
            where: whereClause,
            order: [['boardRegDate', 'DESC']] // 최신순 정렬
        });
        
        return boards;
    } catch (error) {
        logger.error(`[getChurchBoards] Error: ${error.message}`);
        throw error;
    }
};

exports.getChurchBoardDetail = async (boardIdx) => {
    const detailBoard = await ChurchBoard.findOne({ 
        where: { boardIdx: boardIdx },
        include: [
            {
                model: require('../model/index').ChurchInfo,
                as: 'church',
                attributes: ['churchName', 'churchLocation', 'churchType', 'churchCampus']
            }
        ]
    });

    // 조회수 증가
    await ChurchBoard.update(
        { boardHits: sequelize.literal('boardHits + 1') },
        { where: { boardIdx: boardIdx } }
    );

    return detailBoard;
};

/**
 * 교회 게시글 생성
 */
exports.insertChurchBoard = async (boardData) => {
    const transaction = await sequelize.transaction({ autocommit: false });

    try {
        // ChurchBoard 테이블에 모든 데이터 저장
        const board = await ChurchBoard.create(
            {
                churchIdx: boardData.churchIdx,
                boardTitle: boardData.boardTitle,
                boardContent: boardData.boardContent,
                boardRegDate: boardData.boardReg,
                boardLike: boardData.boardLike || 0,
                boardHits: boardData.boardHits || 0,
                boardID: boardData.boardId,
                boardPW: hashPassword(boardData.boardPw), // SHA256 암호화 적용
            },
            { transaction }
        );
        logger.debug(`[insertChurchBoard] ChurchBoard created. BoardIdx: ${board.boardIdx}`);

        await transaction.commit();
        logger.info(`[insertChurchBoard] Transaction committed. Board inserted successfully. BoardIdx: ${board.boardIdx}`);
        return 'Church board inserted successfully';
    } catch (error) {
        logger.error(`[insertChurchBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

/**
 * 교회 게시글 수정
 */
exports.correctChurchBoard = async (boardData) => {
    // 입력된 비밀번호 암호화
    const hashedPassword = hashPassword(boardData.writerPw);
    
    const transaction = await sequelize.transaction();
    try {
        // 먼저 게시글 존재 여부와 비밀번호 확인
        const existingBoard = await ChurchBoard.findOne({
            where: { boardIdx: boardData.boardIdx },
            transaction,
        });
        
        if (!existingBoard) {
            logger.warn(`[correctChurchBoard] Board not found. BoardIdx: ${boardData.boardIdx}`);
            await transaction.rollback();
            throw new Error('Board not found');
        }
        
        // ChurchBoard 업데이트
        const [affectedCount] = await ChurchBoard.update(
            { 
                boardContent: boardData.boardContent,
                boardTitle: boardData.boardTitle 
            },
            {
                where: {
                    boardIdx: boardData.boardIdx,
                    boardPW: hashedPassword, // SHA256 암호화 적용
                },
                transaction,
            }
        );

        // 해당하는 레코드가 없으면 롤백 처리
        if (affectedCount === 0) {
            logger.warn('[correctChurchBoard] No matching board found. Rolling back transaction.');
            await transaction.rollback();
            throw new Error('No matching board found');
        }

        await transaction.commit();
        logger.info(`[correctChurchBoard] Transaction committed. Board updated successfully. BoardIdx: ${boardData.boardIdx}`);
        return 'Church board updated successfully';
    } catch (error) {
        logger.error(`[correctChurchBoard] Error: ${error.message}. Transaction rollback.`);
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

/**
 * 교회 게시글 삭제
 */
exports.deleteChurchBoard = async (boardData) => {
    const transaction = await sequelize.transaction();
    try {
        // 삭제할 대상이 존재하는지 조회
        const boardResult = await ChurchBoard.findOne({
            where: {
                boardIdx: boardData.boardIdx,
                boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
            },
            transaction,
        });

        // 대상이 없으면 롤백
        if (!boardResult) {
            logger.warn('[deleteChurchBoard] No matching record found for boardIdx and writerPw. Rolling back.');
            await transaction.rollback();
            throw new Error('No matching record found for boardIdx and writerPw');
        }

        // ChurchBoard 삭제
        await ChurchBoard.destroy({
            where: {
                boardIdx: boardData.boardIdx,
                boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
            },
            transaction,
        });
        logger.debug(`[deleteChurchBoard] ChurchBoard deleted. BoardIdx: ${boardData.boardIdx}`);

        // ChurchComment 삭제
        await ChurchComment.destroy({
            where: { boardIdx: boardData.boardIdx },
            transaction,
        });
        logger.debug(`[deleteChurchBoard] ChurchComment deleted. BoardIdx: ${boardData.boardIdx}`);

        await transaction.commit();
        logger.info(`[deleteChurchBoard] Transaction committed. Board deleted successfully. BoardIdx: ${boardData.boardIdx}`);
        return 'Church board deleted successfully';
    } catch (error) {
        logger.error(`[deleteChurchBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 게시판 좋아요 토글
exports.toggleChurchBoardLike = async (boardIdx, isLiked) => {
    const result = await toggleBoardLikeHelper(ChurchBoard, boardIdx, isLiked, {
        sequelize,
        logger
    });
    return {
        message: result.message,
        likeCount: result.currentLikes
    };
};

// 교회 게시판 좋아요 수 조회
exports.getChurchBoardLike = async (boardId) => {
    return await getBoardLikeHelper(ChurchBoard, boardId, {
        logger,
        throwOnNotFound: true
    });
};

/**
 * 최근순으로 게시된 교회 게시글 목록 조회 (교회 정보 포함)
 * @returns {Promise<Object>} - 게시글 목록과 페이징 정보
 */
exports.getRecentChurchBoardsWithChurchInfo = async () => {
    try {
        const limit = 5; // 고정된 제한 수

        // Raw Query로 ChurchBoard와 ChurchInfo 테이블 조인하여 최근순으로 조회
        const query = `
            SELECT 
                cb.boardIdx, 
                cb.boardTitle, 
                cb.boardContent, 
                cb.churchIdx, 
                cb.boardRegDate, 
                cb.boardLike, 
                cb.boardHits, 
                cb.boardID,
                ci.churchName,
                ci.churchLocation,
                ci.churchType
            FROM tb_church_board cb
            INNER JOIN tb_church_info ci ON cb.churchIdx = ci.churchIdx
            WHERE ci.churchStatus = 1
            ORDER BY cb.boardRegDate DESC
            LIMIT :limit
        `;

        // Sequelize로 Raw Query 실행
        const results = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { limit: limit }
        });

        // 전체 개수 조회를 위한 별도 쿼리
        const countQuery = `
            SELECT COUNT(*) as totalCount
            FROM tb_church_board cb
            INNER JOIN tb_church_info ci ON cb.churchIdx = ci.churchIdx
            WHERE ci.churchStatus = 1
        `;

        const countResult = await sequelize.query(countQuery, {
            type: sequelize.QueryTypes.SELECT
        });

        const totalCount = countResult[0]?.totalCount || 0;

        logger.info(`[getRecentChurchBoardsWithChurchInfo] Retrieved ${results.length} boards`);
        
        return {
            status: 200,
            data: results,
            totalCount: totalCount,
            currentCount: results.length
        };
    } catch (error) {
        logger.error(`[getRecentChurchBoardsWithChurchInfo] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 전체 교회의 게시판 조회수 기준 인기 후기 TOP10 조회
 * @returns {Promise<Object>} - 인기 후기 목록과 정보
 */
exports.getTopViewedChurchBoardsByChurch = async () => {
    try {
        // Raw Query로 조회수 기준 인기 후기 TOP10 조회
        const query = `
            SELECT 
                cb.boardIdx,
                cb.boardTitle, 
                cb.boardContent, 
                cb.boardRegDate, 
                cb.boardLike, 
                cb.boardHits, 
                cb.boardID,
                ci.churchName,
                ci.churchLocation,
                ci.churchType
            FROM tb_church_board cb
            INNER JOIN tb_church_info ci ON cb.churchIdx = ci.churchIdx
            WHERE ci.churchStatus = 1
            ORDER BY cb.boardHits DESC
            LIMIT :limit
        `;

        // Sequelize로 Raw Query 실행
        const results = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { limit: 10 }
        });

        logger.info(`[getTopViewedChurchBoardsByChurch] 전체 교회의 인기 후기 TOP10 조회 완료: ${results.length}개`);
        
        return {
            status: 200,
            data: results
        };
    } catch (error) {
        logger.error(`[getTopViewedChurchBoardsByChurch] Error: ${error.message}`);
        throw error;
    }
};
