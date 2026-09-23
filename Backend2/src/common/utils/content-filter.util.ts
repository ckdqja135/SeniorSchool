// 글·댓글 공통 콘텐츠 필터: 욕설 / 음담패설(성적 표현) / XSS 를 한 곳에서 검사한다.
// validateUserInput(body) 가 요청 본문의 사용자 입력 필드를 모두 검사하고, contentFilterMiddleware 가 이것만 호출한다.

// ── 자음 욕설 패턴 (공백/특수문자 삽입 우회 방지) ──
const SEP = '[\\s.\\-_!@#$%^&*()]*'; // 자음 사이 허용 구분자
const JAUM_PATTERNS = [
  `ㅅ${SEP}ㅂ`,           // ㅅㅂ
  `ㅆ${SEP}ㅂ`,           // ㅆㅂ
  `ㅂ${SEP}ㅅ`,           // ㅂㅅ
  `ㅈ${SEP}ㄴ`,           // ㅈㄴ
  `ㄱ${SEP}ㅅㄲ`,         // ㄱㅅㄲ
  `ㅁ${SEP}ㅊ`,           // ㅁㅊ
  `ㅗ${SEP}ㅣ`,           // 가운뎃손가락 이모티콘 형태
  `ㄲ${SEP}ㅈ`,           // ㄲㅈ
  `ㅅ${SEP}ㅂ${SEP}ㄴ`,  // ㅅㅂㄴ
].map(p => new RegExp(p, 'i')); // 'g' 를 붙이면 .test() 가 lastIndex 를 기억해 번갈아 매칭을 놓친다

// ── 완성형 욕설 (한글 사이 공백 제거 후 매칭) ──
const PROFANITY_WORDS = [
  '시발', '씨발', '씨팔', '시팔', '씨바', '시바',
  '개새끼', '개세끼', '개색기', '개색끼', '개쉐끼',
  '병신', '빙신', '븅신', '뱅신',
  '지랄', '찐따', '찐다',
  '미친놈', '미친년', '미친새끼',
  '개년', '쌍년', '쌍놈',
  '좆', '좃',
  '닥쳐', '꺼져', '뒤져', '뒈져', '뒤지',
  '느금마', '느금',
  '엠창', '엠생',
  '쓰레기년', '쓰레기놈',
  '개같은', '개같은년', '개같은놈',
  '한남충', '한녀충', '맘충',
];

// ── 성적 표현 ──
const SEXUAL_WORDS = [
  '섹스', '성관계', '성행위',
  '자위', '딸딸이',
  '보지', '자지', '씹',
  '야동', '야사', '야설',
  '강간', '성폭행', '성추행',
  '매춘', '원조교제',
  '음란', '포르노', 'porn',
  '떡치', '박아', '따먹',
];

// ── XSS 패턴 (저장형 XSS 대상, 고신뢰 패턴만) ──
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on(?:load|error|click|mouseover|focus|blur|change|submit)\s*=/i,
  /<[^>]*\son[a-z]+\s*=/i,           // 태그 안의 모든 on* 이벤트 핸들러 (onmouseenter, onanimationstart 등)
  /data\s*:\s*text\/html/i,
  /<iframe[\s>]/i,
  /<embed[\s>]/i,
  /<object[\s>]/i,
  /eval\s*\(/i,
  /document\s*\.\s*(?:write|cookie|location)/i,
];

/**
 * 한글 문자 사이의 공백만 제거 (우회 방지)
 * "시 발" → "시발", "2024년" → "2024년" (숫자-한글 사이 공백은 유지)
 */
function removeKoreanSpaces(text: string): string {
  return text.replace(/([가-힯])\s+([가-힯])/g, '$1$2');
}

export interface ContentValidationResult {
  isClean: boolean;
  reason?: string;
  category?: string;
}

/**
 * 텍스트 콘텐츠 검증
 */
export function validateContent(text: string): ContentValidationResult {
  if (!text || typeof text !== 'string') {
    return { isClean: true };
  }

  // 1. XSS 검사 (원본 텍스트 대상)
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(text)) {
      return { isClean: false, reason: '보안에 위험한 내용이 포함되어 있습니다.', category: 'xss' };
    }
  }

  // 2. 자음 욕설 검사 (원본 텍스트 대상)
  for (const pattern of JAUM_PATTERNS) {
    if (pattern.test(text)) {
      return { isClean: false, reason: '부적절한 언어가 포함되어 있습니다.', category: 'profanity' };
    }
  }

  // 3. 완성형 욕설 검사 (한글 사이 공백 제거 후)
  const normalized = removeKoreanSpaces(text);
  for (const word of PROFANITY_WORDS) {
    if (normalized.includes(word)) {
      return { isClean: false, reason: '부적절한 언어가 포함되어 있습니다.', category: 'profanity' };
    }
  }

  // 4. 성적 표현 검사
  for (const word of SEXUAL_WORDS) {
    if (normalized.includes(word)) {
      return { isClean: false, reason: '성적인 내용이 포함되어 있습니다.', category: 'sexual' };
    }
  }

  return { isClean: true };
}

// 글·댓글 작성/수정에서 사용자가 직접 입력하는 텍스트 필드 (비밀번호 제외)
export const USER_TEXT_FIELDS = [
  'boardTitle', 'boardContent',            // 후기·자유게시판·동적 서비스 글
  'commentContent',                        // 댓글
  'interviewTitle', 'interviewContent',    // 회사 면접 후기
  'boardID', 'writerId', 'commentWriter',  // 작성자 이름
  'tags', 'position', 'department',        // 태그·직무·부서
];

/**
 * 요청 본문의 사용자 입력 필드를 모두 검사한다. 문제가 있으면 첫 필드와 결과를, 없으면 null 을 돌려준다.
 * 배열 필드(tags 등)는 원소마다 검사한다.
 */
export function validateUserInput(body: Record<string, any> | null | undefined): { field: string; result: ContentValidationResult } | null {
  if (!body || typeof body !== 'object') return null;
  for (const field of USER_TEXT_FIELDS) {
    const value = body[field];
    const texts = Array.isArray(value) ? value : [value];
    for (const text of texts) {
      if (!text || typeof text !== 'string') continue;
      const result = validateContent(text);
      if (!result.isClean) return { field, result };
    }
  }
  return null;
}
