# CLAUDE.md

목적
- 오리 백엔드(Node.js/Express/Sequelize) 유지보수를 최소 변경, 안전 중심으로 수행한다.
- 기본 범위는 `Backend/`; 명시 요청이 없으면 `Frontend/`는 아예 건드리지 않는다.

리포 맵
- 엔트리: `Backend/app.js`
- HTTP 계층: `Backend/routes/`, `Backend/controller/`
- 도메인/서비스: `Backend/service/`, `Backend/model/`
- 공통/인프라: `Backend/middlewares/`, `Backend/utils/`, `Backend/scheduler/`

변경 정책
- 작고 명확한 diff, 불필요한 신규 의존성 금지.
- 기존 동작 보존을 우선하고 회귀·보안 리스크를 가장 먼저 본다.
- 로그는 최소·정밀하게, 기존 스타일을 재사용한다.
- 세션 재등록/클라이언트 재초기화는 꼭 필요할 때만 한다.

상태 기반 전환(캐스팅/로컬, next-play) 가이드
- 전환은 하나의 트랜잭션으로 본다: 시작 시 `nextPlayMode = "CAST" | "LOCAL"` 스냅샷, `nextPlayInProgress` 토글.
- 전환 중(`nextPlayInProgress=true`)에는 교차 경로 호출을 차단한다: CAST 모드에서 로컬 `setPlaylists/play()` 금지, LOCAL 모드에서 캐스트 전용 경로만 유지.
- 캐스팅 중에는 로컬 자동재생/오디오가 절대 발생하지 않아야 한다; 로컬 전환 시에는 자동 다음화가 기존대로 유지되어야 한다.
- iOS 캐스팅 next-play에서는 `setPlayerKey` 재사용 금지(핫픽스 준수); register-session 호출 남발 금지.
- disconnect/cleanup 이벤트는 전환 완료 후 정책에 맞게만 로컬 재생을 허용한다.
- 타임라인 로그: 전환 시작/완료, `nextPlayMode`, `nextPlayInProgress`, `isCasting.current`, 분기 트리거(onComplete/onChromecastMediaComplete/onCasting/sessionEnded 등).

근거 및 인용
- 파일/라인 근거를 명시한다(`path:line` 또는 `path#Lx`).
- 응답에서 코드 인용은 15줄을 넘기지 않는다.

버그픽스 응답 형식(필수)
1) 원인 요약 (<=5줄)
2) 수정 요약 (<=10줄)
3) 수정 파일/라인
4) 핵심 diff (<=15줄)
5) 테스트 (요청된 5개 또는 지정된 항목)
6) 롤백 (1-2줄)
7) WORKLOG.md (10줄 이내 append)
