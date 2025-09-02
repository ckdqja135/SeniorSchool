// const { xss } = require('express-xss-sanitizer'); // 주석 처리 - req.query를 읽기 전용으로 만드는 문제 해결

// XSS 공격 패턴 목록
const xssPatterns = [
    // 스크립트 태그 관련
    '<script', '</script>', 'javascript:', 'vbscript:', 'data:text/html',
    // 정규식 패턴 (더 정확한 매칭)
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /alert\s*\(/gi,
    /confirm\s*\(/gi,
    /prompt\s*\(/gi,
    // 이벤트 핸들러
    'onload=', 'onerror=', 'onclick=', 'onmouseover=', 'onmouseout=',
    'onmousedown=', 'onmouseup=', 'onmousemove=', 'onkeydown=', 'onkeypress=',
    'onkeyup=', 'onfocus=', 'onblur=', 'onchange=', 'onsubmit=', 'onreset=',
    'onselect=', 'onabort=', 'ondblclick=', 'onresize=', 'onunload=',
    // CSS 관련
    'expression(', 'url(', 'behavior:', '-moz-binding:',
    // HTML 속성
    'style=', 'src=', 'href=', 'background=', 'background-image:',
    // 특수 문자 인코딩
    '&#', '&#x', '%26', '%3C', '%3E', '%22', '%27', '%2F',
    // 자바스크립트 함수
    'eval(', 'setTimeout(', 'setInterval(', 'Function(',
    'document.write(', 'document.writeln(', 'innerHTML', 'outerHTML',
    // DOM 조작
    'createElement(', 'appendChild(', 'insertBefore(', 'replaceChild(',
    'removeChild(', 'cloneNode(', 'importNode(', 'adoptNode(',
    // iframe 관련
    '<iframe', '</iframe>', 'frameBorder=', 'allowTransparency=',
    // object/embed 관련
    '<object', '</object>', '<embed', '</embed>', 'type=',
    // meta 태그 관련
    '<meta', 'http-equiv=', 'refresh', 'content=',
    // base 태그 관련
    '<base', 'target=', 'href=',
    // form 관련
    '<form', '</form>', 'action=', 'method=', 'enctype=',
    // input 관련
    '<input', 'type=', 'value=', 'name=',
    // SVG 관련
    '<svg', '</svg>', 'onload=',
    // MathML 관련
    '<math', '</math>',
    // 특수 태그
    '<applet', '</applet>', '<marquee', '</marquee>',
    // 데이터 URI
    'data:', 'base64,'
];

// XSS 공격 감지 미들웨어
const xssMiddleware = (req, res, next) => {
    // URL 파라미터 검사
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    for (const [key, value] of urlParams) {
        const decodedValue = decodeURIComponent(value);
        if (xssPatterns.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(decodedValue);
            } else {
                return decodedValue.toLowerCase().includes(pattern.toLowerCase());
            }
        })) {
            return res.status(400).json({
                status: 400,
                message: '잘못된 요청입니다. XSS 공격 시도가 감지되었습니다.'
            });
        }
    }

    // body 데이터 검사
    if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        if (xssPatterns.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(bodyStr);
            } else {
                return bodyStr.toLowerCase().includes(pattern.toLowerCase());
            }
        })) {
            return res.status(400).json({
                status: 400,
                message: '잘못된 요청입니다. XSS 공격 시도가 감지되었습니다.'
            });
        }
    }

    // xss-clean 미들웨어 비활성화 - req.query 읽기 전용 문제 해결
    // 대신 위에서 이미 XSS 패턴 검사를 수행했으므로 next() 호출
    next();
};

module.exports = xssMiddleware;
