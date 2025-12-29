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
        
        // logger.info(`[getBoards] Found ${boards.length} boards for univIdx: ${univIdx}${hasSearchCondition ? ' with search conditions' : ''}`);
        return boards;
    } catch (error) {
        logger.error(`[getBoards] Error: ${error.message}`);
        throw error;
    }
};

exports.getBoardDetail = async (boardIdx) => {
    const detailBoard = await UnivBoard.findOne({ 
        where: { boardIdx: boardIdx },
        include: [
            {
                model: require('../model/index').University,
                as: 'university',
                attributes: ['univName', 'univLocate', 'univType', 'univCampos']
            }
        ]
    });

    // 조회수 증가
    await UnivBoard.update(
        { boardHits: sequelize.literal('boardHits + 1') },
        { where: { boardIdx: boardIdx } }
    );

    return detailBoard;
};

/**
 * 게시글 생성
 */
exports.insertBoard = async (boardData) => {
    // logger.info(`[insertBoard] Start - boardData: ${JSON.stringify(boardData)}`);

    const transaction = await sequelize.transaction({ autocommit: false });

    try {
        // UnivBoard 테이블에 모든 데이터 저장
        const board = await UnivBoard.create(
            {
                univIdx: boardData.univIdx,
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
        logger.debug(`[insertBoard] UnivBoard created. BoardIdx: ${board.boardIdx}`);

        await transaction.commit();
        logger.info(`[insertBoard] Transaction committed. Board inserted successfully. BoardIdx: ${board.boardIdx}`);
        return 'Board inserted successfully';
    } catch (error) {
        logger.error(`[insertBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

/**
 * 게시글 수정
 */
exports.correctBoard = async (boardData) => {
   
    // 입력된 비밀번호 암호화
    const hashedPassword = hashPassword(boardData.writerPw);
    
    const transaction = await sequelize.transaction();
    try {
        // 먼저 게시글 존재 여부와 비밀번호 확인
        const existingBoard = await UnivBoard.findOne({
            where: { boardIdx: boardData.boardIdx },
            transaction,
        });
        
        if (!existingBoard) {
            logger.warn(`[correctBoard] Board not found. BoardIdx: ${boardData.boardIdx}`);
            await transaction.rollback();
            throw new Error('Board not found');
        }
        
        // UnivBoard 업데이트
        const [affectedCount] = await UnivBoard.update(
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
            logger.warn('[correctBoard] No matching board found. Rolling back transaction.');
            await transaction.rollback();
            throw new Error('No matching board found');
        }

        await transaction.commit();
        logger.info(`[correctBoard] Transaction committed. Board updated successfully. BoardIdx: ${boardData.boardIdx}`);
        return 'Board updated successfully';
    } catch (error) {
        logger.error(`[correctBoard] Error: ${error.message}. Transaction rollback.`);
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

/**
 * 게시글 삭제
 */
exports.deleteBoard = async (boardData) => {

    const transaction = await sequelize.transaction();
    try {
        // 삭제할 대상이 존재하는지 조회
        const boardResult = await UnivBoard.findOne({
            where: {
                boardIdx: boardData.boardIdx,
                boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
            },
            transaction,
        });

        // 대상이 없으면 롤백
        if (!boardResult) {
            logger.warn('[deleteBoard] No matching record found for boardIdx and writerPw. Rolling back.');
            await transaction.rollback();
            throw new Error('No matching record found for boardIdx and writerPw');
        }

        // UnivBoard 삭제
        await UnivBoard.destroy({
            where: {
                boardIdx: boardData.boardIdx,
                boardPW: hashPassword(boardData.writerPw), // SHA256 암호화 적용
            },
            transaction,
        });
        logger.debug(`[deleteBoard] UnivBoard deleted. BoardIdx: ${boardData.boardIdx}`);

        // UnivComment 삭제
        await UnivComment.destroy({
            where: { boardIdx: boardData.boardIdx },
            transaction,
        });
        logger.debug(`[deleteBoard] UnivComment deleted. BoardIdx: ${boardData.boardIdx}`);

        await transaction.commit();
        logger.info(`[deleteBoard] Transaction committed. Board deleted successfully. BoardIdx: ${boardData.boardIdx}`);
        return 'Board deleted successfully';
    } catch (error) {
        logger.error(`[deleteBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 게시판 좋아요 토글
exports.toggleBoardLike = async (boardIdx, isLiked) => {
    return await toggleBoardLikeHelper(UnivBoard, boardIdx, isLiked, {
        sequelize,
        logger
    });
};

// 게시판 좋아요 수 조회
exports.getBoardLike = async (boardId) => {
    return await getBoardLikeHelper(UnivBoard, boardId, {
        logger,
        throwOnNotFound: true
    });
};

/**
 * 최근순으로 게시된 게시글 목록 조회 (대학교 정보 포함)
 * @returns {Promise<Object>} - 게시글 목록과 페이징 정보
 */
exports.getRecentBoardsWithUnivInfo = async () => {
    try {
        const limit = 5; // 고정된 제한 수

        // Raw Query로 UnivBoard와 UniversityInfo 테이블 조인하여 최근순으로 조회
        const query = `
            SELECT 
                ub.boardIdx, 
                ub.boardTitle, 
                ub.boardContent, 
                ub.univIdx, 
                ub.boardRegDate, 
                ub.boardLike, 
                ub.boardHits, 
                ub.boardID,
                u.univName,
                u.univLocate,
                u.univType,
                u.univCampos
            FROM tb_univboard ub
            INNER JOIN tb_universityinfo u ON ub.univIdx = u.univIdx
            WHERE u.univStatus = 1
            ORDER BY ub.boardRegDate DESC
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
            FROM tb_univboard ub
            INNER JOIN tb_universityinfo u ON ub.univIdx = u.univIdx
            WHERE u.univStatus = 1
        `;

        const countResult = await sequelize.query(countQuery, {
            type: sequelize.QueryTypes.SELECT
        });

        const totalCount = countResult[0]?.totalCount || 0;

        logger.info(`[getRecentBoardsWithUnivInfo] Retrieved ${results.length} boards`);
        
        return {
            status: 200,
            data: results,
            totalCount: totalCount,
            currentCount: results.length
        };
    } catch (error) {
        logger.error(`[getRecentBoardsWithUnivInfo] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 전체 대학교의 게시판 조회수 기준 인기 후기 TOP10 조회
 * @returns {Promise<Object>} - 인기 후기 목록과 정보
 */
exports.getTopViewedBoardsByUniversity = async () => {
    try {
        // Raw Query로 조회수 기준 인기 후기 TOP10 조회
        const query = `
            SELECT 
                ub.boardIdx,
                ub.boardTitle, 
                ub.boardContent, 
                ub.boardRegDate, 
                ub.boardLike, 
                ub.boardHits, 
                ub.boardID,
                u.univName,
                u.univLocate,
                u.univType,
                u.univCampos
            FROM tb_univboard ub
            INNER JOIN tb_universityinfo u ON ub.univIdx = u.univIdx
            WHERE u.univStatus = 1
            ORDER BY ub.boardHits DESC
            LIMIT :limit
        `;

        // Sequelize로 Raw Query 실행
        const results = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { limit: 10 }
        });

        logger.info(`[getTopViewedBoardsByUniversity] 전체 대학교의 인기 후기 TOP10 조회 완료: ${results.length}개`);
        
        return {
            status: 200,
            data: results
        };
    } catch (error) {
        logger.error(`[getTopViewedBoardsByUniversity] Error: ${error.message}`);
        throw error;
    }
};