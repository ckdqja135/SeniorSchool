const { OutsourceInfo, OutsourceRequest, OutsourceBoard, sequelize } = require('../model/index');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// 외주업체 목록 조회
exports.getOutsources = async (searchParams = {}) => {
    try {
        let whereClause = { outsourceStatus: 1 }; // 활성화된 외주업체만
        
        const { name, type, location, limit } = searchParams;
        
        if (name && name.trim() !== '') {
            whereClause.outsourceName = {
                [Op.like]: `%${name.trim()}%`
            };
            logger.info(`[getOutsources] Name search applied: "${name.trim()}"`);
        }
        
        if (type && type.trim() !== '') {
            whereClause.outsourceType = type.trim();
            logger.info(`[getOutsources] Type search applied: "${type.trim()}"`);
        }
        
        if (location && location.trim() !== '') {
            whereClause.outsourceLocation = {
                [Op.like]: `%${location.trim()}%`
            };
            logger.info(`[getOutsources] Location search applied: "${location.trim()}"`);
        }
        
        // limit 파라미터 처리
        const queryOptions = {
            where: whereClause,
            order: [['outsourceName', 'ASC']] // 외주업체명 순 정렬
        };
        
        if (limit && !isNaN(parseInt(limit))) {
            queryOptions.limit = parseInt(limit);
            logger.info(`[getOutsources] Limit applied: ${limit}`);
        }
        
        const outsources = await OutsourceInfo.findAll(queryOptions);
        
        logger.info(`[getOutsources] Found ${outsources.length} outsources`);
        return outsources;
    } catch (error) {
        logger.error(`[getOutsources] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 상세 조회
exports.getOutsourceDetail = async (outsourceIdx, outsourceName, outsourceAddr) => {
    try {
        let whereClause = { outsourceStatus: 1 };
        
        // 검색 조건 구성
        if (outsourceIdx) {
            whereClause.outsourceIdx = outsourceIdx;
        } else if (outsourceName) {
            whereClause.outsourceName = outsourceName;
        } else if (outsourceAddr) {
            whereClause.outsourceAddr = outsourceAddr;
        }

        const outsource = await OutsourceInfo.findOne({
            where: whereClause
        });

        if (!outsource) {
            throw new Error('Outsource not found');
        }

        // 조회수 증가
        await OutsourceInfo.update(
            { outsourceViewCount: sequelize.literal('outsourceViewCount + 1') },
            { where: { outsourceIdx: outsource.outsourceIdx } }
        );

        logger.info(`[getOutsourceDetail] Outsource detail retrieved. OutsourceIdx: ${outsource.outsourceIdx}, OutsourceName: ${outsource.outsourceName}`);
        return outsource;
    } catch (error) {
        logger.error(`[getOutsourceDetail] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 등록
exports.createOutsource = async (outsourceData) => {
    try {
        // 배열 형태의 데이터인지 확인
        if (Array.isArray(outsourceData)) {
            // 배열인 경우 여러 외주업체를 일괄 생성
            const results = [];
            for (const outsource of outsourceData) {
                const { outsourceName, outsourceLocation, outsourceType, outsourceCEO } = outsource;

                // 필수값 체크
                if (!outsourceName || !outsourceLocation || !outsourceType || !outsourceCEO) {
                    logger.warn(`[createOutsource] Missing required fields: ${JSON.stringify(outsource)}`);
                    throw new Error('필수값이 누락되었습니다. (outsourceName, outsourceLocation, outsourceType, outsourceCEO)');
                }

                // DB에 데이터 생성
                const created = await OutsourceInfo.create({
                    outsourceName: outsource.outsourceName,
                    outsourceLocation: outsource.outsourceLocation,
                    outsourceType: outsource.outsourceType,
                    outsourceEstablished: outsource.outsourceEstablished || '미정',
                    outsourceCEO: outsource.outsourceCEO,
                    outsourceLatX: outsource.outsourceLatX || 0.0,
                    outsourceLatY: outsource.outsourceLatY || 0.0,
                    outsourceURL: outsource.outsourceURL || '',
                    outsourceLotAddr: outsource.outsourceLotAddr || '',
                    outsourceAddr: outsource.outsourceAddr || '',
                    outsourceMapIMG: outsource.outsourceMapIMG || null,
                    outsourceStatus: 1,
                    outsourceViewCount: 0
                });

                results.push(created);
                logger.info(`[createOutsource] Outsource created: ${outsource.outsourceName}`);
            }

            return { success: true, message: `${results.length}개의 외주업체가 생성되었습니다.`, data: results };
        } else {
            // 단일 외주업체 생성
            const { outsourceName, outsourceLocation, outsourceType, outsourceCEO } = outsourceData;

            // 필수값 체크
            if (!outsourceName || !outsourceLocation || !outsourceType || !outsourceCEO) {
                throw new Error('필수값이 누락되었습니다. (outsourceName, outsourceLocation, outsourceType, outsourceCEO)');
            }

            const created = await OutsourceInfo.create({
                outsourceName: outsourceData.outsourceName,
                outsourceLocation: outsourceData.outsourceLocation,
                outsourceType: outsourceData.outsourceType,
                outsourceEstablished: outsourceData.outsourceEstablished || '미정',
                outsourceCEO: outsourceData.outsourceCEO,
                outsourceLatX: outsourceData.outsourceLatX || 0.0,
                outsourceLatY: outsourceData.outsourceLatY || 0.0,
                outsourceURL: outsourceData.outsourceURL || '',
                outsourceLotAddr: outsourceData.outsourceLotAddr || '',
                outsourceAddr: outsourceData.outsourceAddr || '',
                outsourceMapIMG: outsourceData.outsourceMapIMG || null,
                outsourceStatus: 1,
                outsourceViewCount: 0
            });

            logger.info(`[createOutsource] Single outsource created: ${outsourceData.outsourceName}`);
            return { success: true, message: '외주업체가 생성되었습니다.', data: created };
        }
    } catch (error) {
        logger.error(`[createOutsource] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 수정
exports.updateOutsource = async (outsourceIdx, outsourceData) => {
    try {
        const outsource = await OutsourceInfo.findByPk(outsourceIdx);
        
        if (!outsource) {
            throw new Error('Outsource not found');
        }

        await OutsourceInfo.update(outsourceData, {
            where: { outsourceIdx }
        });

        logger.info(`[updateOutsource] Outsource updated. OutsourceIdx: ${outsourceIdx}`);
        return { success: true, message: '외주업체가 수정되었습니다.' };
    } catch (error) {
        logger.error(`[updateOutsource] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 삭제 (상태 변경)
exports.deleteOutsource = async (outsourceIdx) => {
    try {
        const result = await OutsourceInfo.update(
            { outsourceStatus: 0 },
            { where: { outsourceIdx } }
        );

        if (result[0] === 0) {
            throw new Error('Outsource not found');
        }

        logger.info(`[deleteOutsource] Outsource deleted. OutsourceIdx: ${outsourceIdx}`);
        return { success: true, message: '외주업체가 삭제되었습니다.' };
    } catch (error) {
        logger.error(`[deleteOutsource] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 추가 요청 생성
exports.createOutsourceRequest = async (requestData) => {
    try {
        const { 
            name,
            outsourceCEO, // 대표자명 (공통 필드)
            tagline, 
            category, 
            contactEmail, 
            isPublic,
            serviceTypes,
            description,
            region,
            websiteUrl,
            mainPortfolioUrl,
            contactChannel,
            timezone, // 타임존 (선택 필드)
            // 개발 분야 전용 필드
            minBudget,
            avgBudget,
            maxBudget,
            avgBudgetRange,
            team,
            devInfo,
            govSupport,
            // 기타 분야 필드
            customCategory
        } = requestData;

        // 공통 필수 필드 검증
        if (!name || name.trim() === '') {
            throw new Error('업체명(name)은 필수입니다.');
        }

        if (!tagline || tagline.trim() === '') {
            throw new Error('한 줄 소개(tagline)는 필수입니다.');
        }

        if (!category || category.trim() === '') {
            throw new Error('분야(category)는 필수입니다.');
        }

        if (!contactEmail || contactEmail.trim() === '') {
            throw new Error('연락 이메일(contactEmail)은 필수입니다.');
        }

        if (typeof isPublic !== 'boolean') {
            throw new Error('공개 여부(isPublic)는 필수이며 boolean 값이어야 합니다.');
        }

        // 카테고리별 필수 필드 검증
        if (category === 'DEVELOPMENT') {
            // 개발 분야 필수 필드
            if (!devInfo) {
                throw new Error('개발 분야는 devInfo가 필수입니다.');
            }

            if (!devInfo.techStackSummary || !Array.isArray(devInfo.techStackSummary) || devInfo.techStackSummary.length === 0) {
                throw new Error('devInfo.techStackSummary는 1개 이상 필수입니다.');
            }

            // 정부지원사업 정보 검증
            if (govSupport && govSupport.hasGovSupportExperience === true) {
                if (!govSupport.govSupportPrograms || !Array.isArray(govSupport.govSupportPrograms) || govSupport.govSupportPrograms.length === 0) {
                    throw new Error('정부지원사업 경험이 있으면 govSupportPrograms는 필수입니다.');
                }
            }
        } else {
            // 개발 분야가 아닐 때
            const validCategories = ['DESIGN', 'MARKETING', 'VIDEO', 'CONSULTING', 'OTHER'];
            if (!validCategories.includes(category)) {
                throw new Error(`유효하지 않은 카테고리입니다. 허용된 값: ${validCategories.join(', ')}`);
            }

            // OTHER 카테고리일 때 customCategory 필수
            if (category === 'OTHER') {
                if (!customCategory || customCategory.trim() === '') {
                    throw new Error('기타 분야를 선택한 경우 customCategory는 필수입니다.');
                }
            }
        }

        // 중복 요청 체크 (pending 상태인 동일 업체명)
        const existingRequest = await OutsourceRequest.findOne({
            where: {
                outsourceName: name.trim(),
                requestStatus: 'pending'
            }
        });

        if (existingRequest) {
            return {
                success: false,
                message: '이미 동일한 외주업체에 대한 요청이 처리 대기중입니다.'
            };
        }

        // 기존 필드 호환성을 위해 매핑 (하위 호환성 유지)
        const outsourceName = name.trim();
        const outsourceCEOValue = outsourceCEO ? outsourceCEO.trim() : null;
        const outsourceType = category; // 카테고리를 타입으로 사용
        const outsourceAddr = region ? region.trim() : null;

        // 새 요청 생성 (모든 데이터를 JSON으로 저장)
        const newRequest = await OutsourceRequest.create({
            outsourceName: outsourceName,
            outsourceCEO: outsourceCEOValue,
            outsourceType: outsourceType,
            outsourceAddr: outsourceAddr,
            requestStatus: 'pending',
            requestData: requestData // 전체 요청 데이터를 JSON으로 저장
        });

        logger.info(`[createOutsourceRequest] New outsource request created. RequestIdx: ${newRequest.requestIdx}, Name: ${name}, Category: ${category}`);

        return {
            success: true,
            message: '외주업체 추가 요청이 성공적으로 등록되었습니다.',
            data: newRequest
        };
    } catch (error) {
        logger.error(`[createOutsourceRequest] Error: ${error.message}`);
        throw error;
    }
};


// 외주업체 후기 등록
exports.insertOutsourceBoard = async (boardData) => {
    try {
        const { boardTitle, boardContent, outsourceIdx, boardID, boardPW } = boardData;

        // 필수값 체크
        if (!boardTitle || !boardContent || !outsourceIdx || !boardID || !boardPW) {
            throw new Error('필수값이 누락되었습니다.');
        }

        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        const newBoard = await OutsourceBoard.create({
            boardTitle,
            boardContent,
            outsourceIdx,
            boardRegDate: currentDate,
            boardLike: 0,
            boardHits: 0,
            boardID,
            boardPW
        });

        logger.info(`[insertOutsourceBoard] New board created. BoardIdx: ${newBoard.boardIdx}`);
        return '후기가 성공적으로 등록되었습니다.';
    } catch (error) {
        logger.error(`[insertOutsourceBoard] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 후기 수정
exports.correctOutsourceBoard = async (boardData) => {
    try {
        const { boardIdx, boardTitle, boardContent, boardID, boardPW } = boardData;

        if (!boardIdx || !boardID || !boardPW) {
            throw new Error('필수값이 누락되었습니다.');
        }

        // 작성자 확인
        const board = await OutsourceBoard.findOne({
            where: { boardIdx, boardID, boardPW }
        });

        if (!board) {
            throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        await OutsourceBoard.update({
            boardTitle: boardTitle || board.boardTitle,
            boardContent: boardContent || board.boardContent
        }, {
            where: { boardIdx }
        });

        logger.info(`[correctOutsourceBoard] Board updated. BoardIdx: ${boardIdx}`);
        return '후기가 성공적으로 수정되었습니다.';
    } catch (error) {
        logger.error(`[correctOutsourceBoard] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 후기 삭제
exports.deleteOutsourceBoard = async (boardData) => {
    try {
        const { boardIdx, boardID, boardPW } = boardData;

        if (!boardIdx || !boardID || !boardPW) {
            throw new Error('필수값이 누락되었습니다.');
        }

        // 작성자 확인 후 삭제
        const result = await OutsourceBoard.destroy({
            where: { boardIdx, boardID, boardPW }
        });

        if (result === 0) {
            throw new Error('게시글을 찾을 수 없거나 작성자 정보가 일치하지 않습니다.');
        }

        logger.info(`[deleteOutsourceBoard] Board deleted. BoardIdx: ${boardIdx}`);
        return '후기가 성공적으로 삭제되었습니다.';
    } catch (error) {
        logger.error(`[deleteOutsourceBoard] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 후기 좋아요 토글
exports.toggleOutsourceBoardLike = async (boardIdx, isLiked) => {
    try {
        const board = await OutsourceBoard.findByPk(boardIdx);
        
        if (!board) {
            throw new Error('Board not found');
        }

        let newLikeCount;
        if (isLiked) {
            // 좋아요 추가
            newLikeCount = board.boardLike + 1;
        } else {
            // 좋아요 제거 (0 미만으로 내려가지 않도록)
            newLikeCount = Math.max(0, board.boardLike - 1);
        }

        await OutsourceBoard.update(
            { boardLike: newLikeCount },
            { where: { boardIdx } }
        );

        logger.info(`[toggleOutsourceBoardLike] Board like toggled. BoardIdx: ${boardIdx}, NewLikeCount: ${newLikeCount}`);
        return { 
            message: isLiked ? '좋아요가 추가되었습니다.' : '좋아요가 취소되었습니다.',
            likeCount: newLikeCount
        };
    } catch (error) {
        logger.error(`[toggleOutsourceBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 후기 좋아요 수 조회
exports.getOutsourceBoardLike = async (boardId) => {
    try {
        const board = await OutsourceBoard.findByPk(boardId);
        
        if (!board) {
            throw new Error('Board not found');
        }

        return board.boardLike;
    } catch (error) {
        logger.error(`[getOutsourceBoardLike] Error: ${error.message}`);
        throw error;
    }
};

// 최근순으로 게시된 외주업체 후기 목록 조회 (외주업체 정보 포함)
exports.getRecentOutsourceBoardsWithInfo = async () => {
    try {
        const boards = await OutsourceBoard.findAll({
            include: [{
                model: require('../model/index').OutsourceInfo,
                as: 'outsource',
                where: { outsourceStatus: 1 }
            }],
            order: [['boardRegDate', 'DESC']],
            limit: 20
        });

        logger.info(`[getRecentOutsourceBoardsWithInfo] Found ${boards.length} recent boards`);
        return boards;
    } catch (error) {
        logger.error(`[getRecentOutsourceBoardsWithInfo] Error: ${error.message}`);
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
                where: { outsourceStatus: 1 }
            }],
            order: [['boardHits', 'DESC']],
            limit: 10
        });

        logger.info(`[getTopViewedOutsourceBoardsByOutsource] Found ${boards.length} top viewed boards`);
        return boards;
    } catch (error) {
        logger.error(`[getTopViewedOutsourceBoardsByOutsource] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 조회수 기준 TOP 조회
exports.getTopViewedOutsources = async () => {
    try {
        const outsources = await OutsourceInfo.findAll({
            where: {
                outsourceStatus: 1 // 활성화된 외주업체만
            },
            order: [['outsourceViewCount', 'DESC']],
            limit: 10 // 10개 고정
        });

        logger.info(`[getTopViewedOutsources] Found ${outsources.length} top viewed outsources`);
        return outsources;
    } catch (error) {
        logger.error(`[getTopViewedOutsources] Error: ${error.message}`);
        throw error;
    }
};

// 외주업체 자동 완성 검색
exports.autoComplete = async (keyword) => {
    try {
        const outsources = await OutsourceInfo.findAll({
            attributes: ['outsourceName', 'outsourceAddr', 'outsourceCEO', 'outsourceType'],
            where: {
                outsourceName: {
                    [Op.not]: '',
                    [Op.like]: `%${keyword}%`,
                },
                outsourceStatus: 1 // 활성화된 외주업체만
            },
            order: [['outsourceName', 'ASC']],
            limit: 10 // 최대 10개까지만
        });
        
        logger.info(`[autoComplete] Found ${outsources.length} outsources for keyword: "${keyword}"`);
        return outsources;
    } catch (error) {
        logger.error(`[autoComplete] Error: ${error.message}`);
        throw error;
    }
};
