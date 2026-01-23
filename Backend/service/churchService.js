const { ChurchInfo, ChurchRequest, ChurchBoard, sequelize } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const hashPassword = require('../utils/hashPassword');

// 교회 목록 조회
exports.getChurches = async (searchParams = {}) => {
    try {
        let whereClause = { churchStatus: 1 }; // 활성화된 교회만
        
        const { name, type, location } = searchParams;
        
        if (name && name.trim() !== '') {
            whereClause.churchName = {
                [Op.like]: `%${name.trim()}%`
            };
            logger.info(`[getChurches] Name search applied: "${name.trim()}"`);
        }
        
        if (type && type.trim() !== '') {
            whereClause.churchType = type.trim();
            logger.info(`[getChurches] Type search applied: "${type.trim()}"`);
        }
        
        if (location && location.trim() !== '') {
            whereClause.churchLocation = {
                [Op.like]: `%${location.trim()}%`
            };
            logger.info(`[getChurches] Location search applied: "${location.trim()}"`);
        }
        
        const churches = await ChurchInfo.findAll({ 
            where: whereClause,
            order: [['churchName', 'ASC']] // 교회명 순 정렬
        });
        
        logger.info(`[getChurches] Found ${churches.length} churches`);
        return churches;
    } catch (error) {
        logger.error(`[getChurches] Error: ${error.message}`);
        throw error;
    }
};

// 교회 상세 조회
exports.getChurchDetail = async (churchIdx, churchName, churchAddr) => {
    try {
        let whereClause = { churchStatus: 1 };
        
        // 검색 조건 구성
        if (churchIdx) {
            whereClause.churchIdx = churchIdx;
        } else if (churchName) {
            whereClause.churchName = churchName;
        } else if (churchAddr) {
            whereClause.churchAddr = churchAddr;
        }

        const church = await ChurchInfo.findOne({
            where: whereClause
        });

        if (!church) {
            throw new Error('Church not found');
        }

        // 조회수 증가
        await ChurchInfo.update(
            { churchViewCount: sequelize.literal('churchViewCount + 1'), updatedAt: sequelize.literal('updated_at') },
            { where: { churchIdx: church.churchIdx }, silent: true }
        );

        logger.info(`[getChurchDetail] Church detail retrieved. ChurchIdx: ${church.churchIdx}, ChurchName: ${church.churchName}`);
        return church;
    } catch (error) {
        logger.error(`[getChurchDetail] Error: ${error.message}`);
        throw error;
    }
};

// 교회 등록
exports.createChurch = async (churchData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(churchData)) {
            // 배열인 경우 여러 교회를 일괄 생성
            const results = [];
            for (const church of churchData) {
                const { churchName, churchLocation, churchType, churchPastor } = church;

                // 필수값 체크
                if (!churchName || !churchLocation || !churchType || !churchPastor) {
                    logger.warn(`[createChurch] Missing required fields: ${JSON.stringify(church)}`);
                    throw new Error('필수값이 누락되었습니다. (churchName, churchLocation, churchType, churchPastor)');
                }

                // DB에 데이터 생성
                const created = await ChurchInfo.create({
                    churchName: church.churchName,
                    churchLocation: church.churchLocation,
                    churchType: church.churchType,
                    churchEstablished: church.churchEstablished || '',
                    churchPastor: church.churchPastor,
                    churchLatX: church.churchLatX || 0,
                    churchLatY: church.churchLatY || 0,
                    churchURL: church.churchURL || '',
                    churchLotAddr: church.churchLotAddr || '',
                    churchAddr: church.churchAddr || '',
                    churchMapIMG: church.churchMapIMG || null,
                    churchStatus: 1,
                    churchViewCount: 0
                });
                results.push(created);
                logger.info(`[createChurch] 교회 등록 완료! : ${created.churchIdx}`);
            }
            return {
                insert: results.length,
                success: true
            };
        } else {
            // 단일 객체인 경우
            const { churchName, churchLocation, churchType, churchPastor } = churchData;

            // 필수값 체크
            if (!churchName || !churchLocation || !churchType || !churchPastor) {
                logger.warn(`[createChurch] Missing required fields: ${JSON.stringify(churchData)}`);
                throw new Error('필수값이 누락되었습니다. (churchName, churchLocation, churchType, churchPastor)');
            }

            // DB에 데이터 생성
            const created = await ChurchInfo.create({
                churchName: churchData.churchName,
                churchLocation: churchData.churchLocation,
                churchType: churchData.churchType,
                churchEstablished: churchData.churchEstablished || '',
                churchPastor: churchData.churchPastor,
                churchLatX: churchData.churchLatX || 0,
                churchLatY: churchData.churchLatY || 0,
                churchURL: churchData.churchURL || '',
                churchLotAddr: churchData.churchLotAddr || '',
                churchAddr: churchData.churchAddr || '',
                churchMapIMG: churchData.churchMapIMG || null,
                churchStatus: 1,
                churchViewCount: 0
            });
            logger.info(`[createChurch] 교회 등록 완료! : ${created.churchIdx}`);

            return {
                insert: 1,
                success: true
            };
        }
    } catch (error) {
        // 에러 로그 출력 후, 상위 컨트롤러/서비스로 재전달
        logger.error(`[createChurch] Error: ${error.message}`);
        throw error;
    }
};

// 교회 수정
exports.updateChurch = async (churchIdx, churchData) => {
    const transaction = await sequelize.transaction();
    
    try {
        // 교회 존재 여부 확인
        const existingChurch = await ChurchInfo.findOne({
            where: { churchIdx: churchIdx },
            transaction
        });
        
        if (!existingChurch) {
            throw new Error('Church not found');
        }
        
        // 교회 정보 업데이트
        const [affectedCount] = await ChurchInfo.update(
            {
                churchName: churchData.churchName || existingChurch.churchName,
                churchLocation: churchData.churchLocation || existingChurch.churchLocation,
                churchType: churchData.churchType || existingChurch.churchType,
                churchEstablished: churchData.churchEstablished || existingChurch.churchEstablished,
                churchPastor: churchData.churchPastor || existingChurch.churchPastor,
                churchLatX: churchData.churchLatX !== undefined ? churchData.churchLatX : existingChurch.churchLatX,
                churchLatY: churchData.churchLatY !== undefined ? churchData.churchLatY : existingChurch.churchLatY,
                churchURL: churchData.churchURL || existingChurch.churchURL,
                churchLotAddr: churchData.churchLotAddr || existingChurch.churchLotAddr,
                churchAddr: churchData.churchAddr || existingChurch.churchAddr,
                churchMapIMG: churchData.churchMapIMG !== undefined ? churchData.churchMapIMG : existingChurch.churchMapIMG,
                churchStatus: churchData.churchStatus !== undefined ? churchData.churchStatus : existingChurch.churchStatus
            },
            {
                where: { churchIdx: churchIdx },
                transaction
            }
        );

        if (affectedCount === 0) {
            throw new Error('No church was updated');
        }

        await transaction.commit();
        logger.info(`[updateChurch] Church updated successfully. ChurchIdx: ${churchIdx}`);
        
        // 업데이트된 교회 정보 반환
        return await ChurchInfo.findByPk(churchIdx);
    } catch (error) {
        logger.error(`[updateChurch] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 삭제 (소프트 삭제)
exports.deleteChurch = async (churchIdx) => {
    const transaction = await sequelize.transaction();
    
    try {
        // 교회 존재 여부 확인
        const existingChurch = await ChurchInfo.findOne({
            where: { churchIdx: churchIdx },
            transaction
        });
        
        if (!existingChurch) {
            throw new Error('Church not found');
        }
        
        // 교회 상태를 비활성화로 변경 (소프트 삭제)
        const [affectedCount] = await ChurchInfo.update(
            { churchStatus: 0 },
            {
                where: { churchIdx: churchIdx },
                transaction
            }
        );

        if (affectedCount === 0) {
            throw new Error('No church was deleted');
        }

        await transaction.commit();
        logger.info(`[deleteChurch] Church deleted successfully. ChurchIdx: ${churchIdx}`);
        return true;
    } catch (error) {
        logger.error(`[deleteChurch] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 자동 검색
exports.autoComplete = async (keyword) => {
    try {
        const churches = await ChurchInfo.findAll({
            attributes: ['churchName', 'churchAddr', 'churchPastor'],
            where: {
                churchName: {
                    [Op.not]: '',
                    [Op.like]: `%${keyword}%`,
                },
                churchStatus: 1 // 활성화된 교회만
            },
            order: [['churchName', 'ASC']],
            limit: 10 // 최대 10개까지만
        });
        
        logger.info(`[autoComplete] Found ${churches.length} churches for keyword: "${keyword}"`);
        return churches;
    } catch (error) {
        logger.error(`[autoComplete] Error: ${error.message}`);
        throw error;
    }
};

// 교회명으로 교회 정보 조회 (조회수 증가 포함)
exports.getChurchInfoByName = async (churchName) => {
    const transaction = await sequelize.transaction();

    try {
        const church = await ChurchInfo.findOne({
            where: {
                churchName: {
                    [Op.eq]: churchName,
                },
                churchStatus: 1
            },
            transaction
        });

        if (!church) {
            await transaction.rollback();
            return null;
        }

        // churchViewCount 증가
        await ChurchInfo.update(
            { churchViewCount: sequelize.literal("churchViewCount + 1"), updatedAt: sequelize.literal('updated_at') },
            { where: { churchIdx: church.churchIdx }, transaction, silent: true }
        );

        await transaction.commit();

        logger.info(`[getChurchInfoByName] 교회 검색 완료: ${churchName}`);
        return church;
    } catch (error) {
        logger.error(`[getChurchInfoByName] Error: ${error.message}`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 조회수 높은 순으로 상위 10개 교회 조회
exports.getTopViewedChurches = async () => {
    try {
        const topChurches = await ChurchInfo.findAll({
            attributes: [
                'churchIdx',
                'churchName', 
                'churchLocation', 
                'churchType',
                'churchPastor',
                'churchViewCount'
            ],
            where: {
                churchStatus: 1 // 활성화된 교회만
            },
            order: [['churchViewCount', 'DESC']], // 조회수 높은 순 정렬
            limit: 10 // 상위 10개만
        });

        logger.info(`[getTopViewedChurches] 상위 10개 교회 조회 완료: ${topChurches.length}개`);
        
        return {
            status: 200,
            data: topChurches,
            totalCount: topChurches.length
        };
    } catch (error) {
        logger.error(`[getTopViewedChurches] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 교회 추가 요청 생성
 * @param {Object} requestData - 요청 데이터 (churchName, churchPastor, churchType, churchAddr)
 * @returns {Promise<Object>} - 생성 결과
 */
exports.createChurchRequest = async (requestData) => {
    try {
        const { churchName, churchPastor, churchType, churchAddr } = requestData;

        // 필수값 체크 (교회 이름만 필수)
        if (!churchName || churchName.trim() === '') {
            throw new Error('교회 이름은 필수입니다.');
        }

        // 교회 이름 중복 체크 (이미 요청된 교회인지)
        const existingRequest = await ChurchRequest.findOne({
            where: { churchName: churchName.trim() }
        });

        if (existingRequest) {
            return {
                success: false,
                message: '이미 요청된 교회입니다.',
                existingRequest
            };
        }

        // 요청 데이터 생성
        const newRequest = await ChurchRequest.create({
            churchName: churchName.trim(),
            churchPastor: churchPastor ? churchPastor.trim() : null,
            churchType: churchType ? churchType.trim() : null,
            churchAddr: churchAddr ? churchAddr.trim() : null,
            requestStatus: 'pending',
            requestDate: new Date()
        });

        logger.info(`[createChurchRequest] 교회 요청 생성 완료: ${newRequest.requestIdx} - ${newRequest.churchName}`);
        
        return {
            success: true,
            message: '교회 요청이 성공적으로 등록되었습니다.',
            data: newRequest
        };
    } catch (error) {
        logger.error(`[createChurchRequest] Error: ${error.message}`);
        throw error;
    }
};

// 교회 후기 목록 조회
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

// 교회 후기 상세보기
exports.getChurchBoardDetail = async (boardIdx) => {
    try {
        const detailBoard = await ChurchBoard.findOne({ 
            where: { boardIdx: boardIdx },
            include: [
                {
                    model: ChurchInfo,
                    as: 'church',
                    attributes: ['churchName', 'churchLocation', 'churchType', 'churchPastor']
                }
            ]
        });

        if (!detailBoard) {
            throw new Error('Board not found');
        }

        // 조회수 증가
        await ChurchBoard.update(
            { boardHits: sequelize.literal('boardHits + 1') },
            { where: { boardIdx: boardIdx } }
        );

        return detailBoard;
    } catch (error) {
        logger.error(`[getChurchBoardDetail] Error: ${error.message}`);
        throw error;
    }
};

// 교회 후기 등록
exports.insertChurchBoard = async (boardData) => {
    const transaction = await sequelize.transaction({ autocommit: false });

    try {
        // ChurchBoard 테이블에 모든 데이터 저장
        const board = await ChurchBoard.create(
            {
                churchIdx: boardData.churchIdx,
                boardTitle: boardData.boardTitle,
                boardContent: boardData.boardContent,
                boardRegDate: boardData.boardReg || new Date(),
                boardLike: boardData.boardLike || 0,
                boardHits: boardData.boardHits || 0,
                boardID: boardData.boardId,
                boardPW: (boardData.writerPw || boardData.boardPw) && (boardData.writerPw || boardData.boardPw).trim() !== '' ? hashPassword((boardData.writerPw || boardData.boardPw).trim()) : null,
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

// 교회 후기 수정
exports.correctChurchBoard = async (boardData) => {
    const transaction = await sequelize.transaction({ autocommit: false });

    try {
        const { boardIdx, boardTitle, boardContent, boardPw, writerPw } = boardData;

        if (!boardIdx) {
            throw new Error('boardIdx is required');
        }

        // 기존 게시글 확인
        const existingBoard = await ChurchBoard.findOne({
            where: { boardIdx: boardIdx },
            transaction
        });

        if (!existingBoard) {
            throw new Error('Board not found');
        }

        // 비밀번호 확인 (비밀번호가 있는 경우)
        const password = writerPw || boardPw;
        if (password && typeof password === 'string' && password.trim() !== '') {
            const hashedPassword = hashPassword(password.trim());
            if (existingBoard.boardPW !== hashedPassword) {
                throw new Error('Invalid password');
            }
        }

        // 게시글 수정
        await ChurchBoard.update(
            {
                boardTitle: boardTitle || existingBoard.boardTitle,
                boardContent: boardContent || existingBoard.boardContent,
            },
            {
                where: { boardIdx: boardIdx },
                transaction
            }
        );

        await transaction.commit();
        logger.info(`[correctChurchBoard] Board updated successfully. BoardIdx: ${boardIdx}`);
        return 'Church board updated successfully';
    } catch (error) {
        logger.error(`[correctChurchBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 후기 삭제
exports.deleteChurchBoard = async (boardData) => {
    const transaction = await sequelize.transaction({ autocommit: false });

    try {
        const { boardIdx, boardPw, writerPw } = boardData;

        if (!boardIdx) {
            throw new Error('boardIdx is required');
        }

        // 기존 게시글 확인
        const existingBoard = await ChurchBoard.findOne({
            where: { boardIdx: boardIdx },
            transaction
        });

        if (!existingBoard) {
            throw new Error('Board not found');
        }

        // 비밀번호 확인
        const password = writerPw || boardPw;
        if (password && typeof password === 'string' && password.trim() !== '') {
            const hashedPassword = hashPassword(password.trim());
            if (existingBoard.boardPW !== hashedPassword) {
                throw new Error('Invalid password');
            }
        }

        // 게시글 삭제
        await ChurchBoard.destroy({
            where: { boardIdx: boardIdx },
            transaction
        });

        await transaction.commit();
        logger.info(`[deleteChurchBoard] Board deleted successfully. BoardIdx: ${boardIdx}`);
        return 'Church board deleted successfully';
    } catch (error) {
        logger.error(`[deleteChurchBoard] Error: ${error.message}. Transaction rollback.`);
        await transaction.rollback();
        throw error;
    }
};

// 교회 후기 좋아요 토글
exports.toggleChurchBoardLike = async (boardIdx, isLiked) => {
    try {
        const board = await ChurchBoard.findByPk(boardIdx);
        
        if (!board) {
            throw new Error('Board not found');
        }

        // 현재 좋아요 수를 숫자로 변환 (문자열 연결 방지)
        const currentLikes = Number(board.boardLike) || 0;
        const newLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);

        await ChurchBoard.update(
            { boardLike: newLikes },
            { where: { boardIdx: boardIdx } }
        );

        logger.info(`[toggleChurchBoardLike] Board like toggled. BoardIdx: ${boardIdx}, isLiked: ${isLiked}, Current: ${currentLikes}, New: ${newLikes}`);

        return {
            boardIdx: boardIdx,
            isLiked: isLiked,
            likeCount: newLikes
        };
    } catch (error) {
        logger.error(`[toggleChurchBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 교회 후기 좋아요 조회
exports.getChurchBoardLike = async (boardId) => {
    try {
        const board = await ChurchBoard.findOne({
            where: { boardIdx: boardId }
        });

        if (!board) {
            throw new Error('Board not found');
        }

        return board.boardLike || 0;
    } catch (error) {
        logger.error(`[getChurchBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 최근순으로 게시된 교회 후기 목록 조회 (교회 정보 포함)
exports.getRecentChurchBoardsWithInfo = async () => {
    try {
        const recentBoards = await ChurchBoard.findAll({
            include: [
                {
                    model: ChurchInfo,
                    as: 'church',
                    attributes: ['churchName', 'churchLocation', 'churchType', 'churchPastor']
                }
            ],
            order: [['boardRegDate', 'DESC']],
            limit: 5 // 최근 5개
        });

        logger.info(`[getRecentChurchBoardsWithInfo] 최근 교회 후기 조회 완료: ${recentBoards.length}개`);
        
        return {
            status: 200,
            data: recentBoards,
            totalCount: recentBoards.length
        };
    } catch (error) {
        logger.error(`[getRecentChurchBoardsWithInfo] Error: ${error.message}`);
        throw error;
    }
};

// 교회별로 후기 조회수 기준 인기 후기 TOP10 조회
exports.getTopViewedChurchBoardsByChurch = async () => {
    try {
        const topBoards = await ChurchBoard.findAll({
            include: [
                {
                    model: ChurchInfo,
                    as: 'church',
                    attributes: ['churchName', 'churchLocation', 'churchType', 'churchPastor']
                }
            ],
            order: [['boardHits', 'DESC']],
            limit: 10 // 상위 10개
        });

        logger.info(`[getTopViewedChurchBoardsByChurch] 교회별 인기 후기 조회 완료: ${topBoards.length}개`);
        
        return {
            status: 200,
            data: topBoards,
            totalCount: topBoards.length
        };
    } catch (error) {
        logger.error(`[getTopViewedChurchBoardsByChurch] Error: ${error.message}`);
        throw error;
    }
};