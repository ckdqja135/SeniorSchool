// Backend/utils/searchHelper.js의 Prisma 포팅 — Op.like → contains (MySQL LIKE '%..%'와 동일 semantics/collation)
/**
 * 게시판 검색 조건 생성 함수
 * @param searchParams - 검색 파라미터 { id, title, content }
 * @param whereClause - 기존 whereClause 객체 (기본 조건 포함)
 * @returns { whereClause: 수정된 whereClause, hasSearchCondition: 검색 조건 존재 여부 }
 */
export const buildBoardSearchConditions = (
    searchParams: { id?: string; title?: string; content?: string } = {},
    whereClause: Record<string, any> = {},
) => {
    const { id, title, content } = searchParams;
    let hasSearchCondition = false;

    // ID 검색: 정확한 일치
    if (id && id.trim() !== '') {
        whereClause.boardID = id.trim();
        hasSearchCondition = true;
    }

    // 제목 검색: LIKE 검색
    if (title && title.trim() !== '') {
        whereClause.boardTitle = { contains: title.trim() };
        hasSearchCondition = true;
    }

    // 내용 검색: LIKE 검색
    if (content && content.trim() !== '') {
        whereClause.boardContent = { contains: content.trim() };
        hasSearchCondition = true;
    }

    return {
        whereClause,
        hasSearchCondition
    };
};
