const { Op } = require('sequelize');

/**
 * 게시판 검색 조건 생성 함수
 * @param {Object} searchParams - 검색 파라미터 { id, title, content }
 * @param {Object} whereClause - 기존 whereClause 객체 (기본 조건 포함)
 * @returns {Object} - { whereClause: 수정된 whereClause, hasSearchCondition: 검색 조건 존재 여부 }
 */
const buildBoardSearchConditions = (searchParams = {}, whereClause = {}) => {
    const { id, title, content } = searchParams;
    let hasSearchCondition = false;
    
    // ID 검색: 정확한 일치
    if (id && id.trim() !== '') {
        whereClause.boardID = id.trim();
        hasSearchCondition = true;
    }
    
    // 제목 검색: LIKE 검색
    if (title && title.trim() !== '') {
        whereClause.boardTitle = {
            [Op.like]: `%${title.trim()}%`
        };
        hasSearchCondition = true;
    }
    
    // 내용 검색: LIKE 검색
    if (content && content.trim() !== '') {
        whereClause.boardContent = {
            [Op.like]: `%${content.trim()}%`
        };
        hasSearchCondition = true;
    }
    
    return {
        whereClause,
        hasSearchCondition
    };
};

module.exports = {
    buildBoardSearchConditions
};

