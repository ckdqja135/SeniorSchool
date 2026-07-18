// @Public() — 인증/권한 가드를 건너뛰는 공개 라우트 표시 데코레이터.
// 어드민 라우터 안에 섞여 있는 비-어드민(공개) 라우트(예: POST /admin/{univ,church,outsource}/request)에 사용.
// 클래스 레벨 @UseGuards(JwtAuthGuard, AdminGuard)가 걸린 컨트롤러라도, 이 데코레이터가 붙은
// 핸들러는 가드가 Reflector로 감지해 통과시킨다 (원본에서 해당 라우트가 무가드였던 계약 보존).
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
