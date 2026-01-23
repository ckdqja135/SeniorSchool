# WORKLOG

## 2026-01-24 | BUGFIX: 대시보드 최근 활동 - 조회(GET)로 인한 오염 수정
- **원인**: Info 테이블 조회수 증가 시 MySQL `ON UPDATE CURRENT_TIMESTAMP`가 `updated_at`을 갱신 → `getRecentActivities()`가 이를 "update" 활동으로 집계
- **수정**: 모든 GET 상세 핸들러의 조회수 UPDATE에 `updatedAt: literal('updated_at')` 추가하여 타임스탬프 자동갱신 억제
- **대상 파일**: churchService, compService, restaurantService, outsourceService, searchService, admin/compService (총 6파일, 7개소)
- **검증**: GET 조회 시 `updated_at` 불변 확인, 실제 수정(PUT/PATCH) 시 정상 갱신 확인
- **롤백**: `git revert <commit>` (6파일 원복)
