const { ChurchBoard, sequelize, ChurchComment } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const crypto = require('crypto');

// SHA256 암호화 함수
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

exports.getChurchBoards = async (churchIdx, searchParams = {}) => {
    try {
        let whereClause = { churchIdx: churchIdx };
        
        // 검색 조건이 있는 경우 추가
        const { id, title, content } = searchParams;
        let hasSearchCondition = false;
        
        if (id && id.trim() !== '') {
            // boardID: 정확한 일치 검색
            whereClause.boardID = id.trim();
            hasSearchCondition = true;
            logger.info(`[getChurchBoards] ID search applied: "${id.trim()}" for churchIdx: ${churchIdx}`);
        }
        
        if (title && title.trim() !== '') {
            // boardTitle: LIKE 검색
            whereClause.boardTitle = {
                [Op.like]: `%${title.trim()}%`
            };
            hasSearchCondition = true;
            logger.info(`[getChurchBoards] Title search applied: "${title.trim()}" for churchIdx: ${churchIdx}`);
        }
        
        if (content && content.trim() !== '') {
            // boardContent: LIKE 검색
            whereClause.boardContent = {
                [Op.like]: `%${content.trim()}%`
            };
            hasSearchCondition = true;
            logger.info(`[getChurchBoards] Content search applied: "${content.trim()}" for churchIdx: ${churchIdx}`);
        }
        
        if (!hasSearchCondition) {
            logger.info(`[getChurchBoards] No search condition, returning all boards for churchIdx: ${churchIdx}`);
        }
        
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
    try {
        // 게시글 존재 확인 및 현재 좋아요 수 조회
        const board = await ChurchBoard.findByPk(boardIdx);
        
        if (!board) {
            throw new Error('Board not found');
        }

        // 현재 좋아요 수를 숫자로 변환
        const currentLikeCount = Number(board.boardLike) || 0;
        let newLikeCount;
        let message;
        
        if (isLiked) {
            // 좋아요 증가
            newLikeCount = currentLikeCount + 1;
            message = '좋아요가 추가되었습니다.';
        } else {
            // 좋아요 감소 (0 미만으로 내려가지 않도록 처리)
            newLikeCount = Math.max(0, currentLikeCount - 1);
            message = '좋아요가 취소되었습니다.';
        }

        // 업데이트
        await ChurchBoard.update(
            { boardLike: newLikeCount },
            { where: { boardIdx: boardIdx } }
        );

        logger.info(`[toggleChurchBoardLike] Board like toggled. BoardIdx: ${boardIdx}, IsLiked: ${isLiked}, Current: ${currentLikeCount}, New: ${newLikeCount}`);
        
        return {
            message: message,
            likeCount: newLikeCount
        };
    } catch (error) {
        logger.error(`[toggleChurchBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 교회 게시판 좋아요 수 조회
exports.getChurchBoardLike = async (boardId) => {
    try {
        const board = await ChurchBoard.findOne({
            where: { boardIdx: boardId },
            attributes: ['boardLike']
        });

        if (!board) {
            throw new Error('Board not found');
        }

        logger.info(`[getChurchBoardLike] Board like count retrieved. BoardIdx: ${boardId}, LikeCount: ${board.boardLike}`);
        return board.boardLike;
    } catch (error) {
        logger.error(`[getChurchBoardLike] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 최근순으로 게시된 교회 게시글 목록 조회 (교회 정보 포함)
 * @returns {Promise<Object>} - 게시글 목록과 페이징 정보
 */
exports.getRecentChurchBoardsWithChurchInfo = async () => {
    try {
        const limit = 5; // 고정된 제한 수

        // ChurchBoard와 ChurchInfo 테이블 조인하여 최근순으로 조회
        const { count, rows } = await ChurchBoard.findAndCountAll({
            include: [
                {
                    model: require('../model/index').ChurchInfo,
                    as: 'church',
                    attributes: ['churchName', 'churchLocation', 'churchType'],
                    where: { churchStatus: 1 } // 활성화된 교회만
                }
            ],
            attributes: [
                'boardIdx', 
                'boardTitle', 
                'boardContent', 
                'churchIdx', 
                'boardRegDate', 
                'boardLike', 
                'boardHits', 
                'boardID'
            ],
            order: [['boardRegDate', 'DESC']], // 최근순 정렬
            limit: limit
        });

        logger.info(`[getRecentChurchBoardsWithChurchInfo] Retrieved ${rows.length} boards`);
        
        return {
            status: 200,
            data: rows,
            totalCount: count,
            currentCount: rows.length
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
        const topBoards = await ChurchBoard.findAll({
            include: [
                {
                    model: require('../model/index').ChurchInfo,
                    as: 'church',
                    attributes: ['churchName', 'churchLocation', 'churchType'],
                    where: { churchStatus: 1 } // 활성화된 교회만
                }
            ],
            attributes: [
                'boardIdx',
                'boardTitle', 
                'boardContent', 
                'boardRegDate', 
                'boardLike', 
                'boardHits', 
                'boardID'
            ],
            order: [['boardHits', 'DESC']], // 조회수 높은 순 정렬
            limit: 10 // 상위 10개만
        });

        logger.info(`[getTopViewedChurchBoardsByChurch] 전체 교회의 인기 후기 TOP10 조회 완료: ${topBoards.length}개`);
        
        return {
            status: 200,
            data: topBoards
        };
    } catch (error) {
        logger.error(`[getTopViewedChurchBoardsByChurch] Error: ${error.message}`);
        throw error;
    }
};
