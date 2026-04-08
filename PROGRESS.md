# JT기출 진행기록

## 현재 상태
- **완료**: 보안/저작권 강화 + Claude API 인프라 + UX 개선 + **JT 튜터 AI 상담** + **프로덕션 배포 완료**
- 배포 URL: https://gichul.jttax.co.kr (커스텀 도메인) / https://jt-gichul.vercel.app
- GitHub: https://github.com/jjuntube101-hash/jt-gichul (Public)
- 배포 방법: Git 연동 (GitHub push → Vercel 자동 배포)
- Supabase: xddaqkymeactyfqqfcuv, **11테이블** (기존 6 + Sprint 19 추가 5)
- 총 문항: 2,065 (세법 1,245 + 회계 820)
- 빌드: 2,095 페이지 정상 생성
- 9급 커리큘럼: 12주 → **13주** (지방세 분할)
- 7급 커리큘럼: 16주 → **17주** (지방세 분할)
- Anthropic API: 크레딧 $10 충전, Auto reload OFF (소진 시 자동 차단)
- 마지막 배포: 260408 (JT 튜터 AI 상담 기능 + 마크다운 표 렌더링 + 로고 + UI 겹침 수정)
- 다음 할 일: 북마크 기능 배포 (git push) → Tier 1 나머지 (다크모드 토글, Zod 검증)

### 문제 북마크 기능 (260408)
- [x] **useBookmarks 훅** — localStorage 기반 북마크 CRUD (로그인 불필요, 오프라인 지원)
- [x] **문제 상세 북마크 버튼** — QuestionView 헤더에 Bookmark 아이콘 토글 (fill-warning 활성)
- [x] **오답노트 북마크 탭** — Review 페이지 3탭 구조 (오답/복습/북마크), 통계+바로풀기+삭제
- 신규 파일: `hooks/useBookmarks.ts`
- 수정 파일: `app/question/[no]/QuestionView.tsx`, `app/review/page.tsx`
- 빌드 검증: 2,095페이지, 에러 0

### JT 튜터 AI 상담 기능 (260408)
- [x] **AI 세무 상담 기능 구현** — 플로팅 버튼 + 바텀시트 채팅 UI
  - 시스템 프롬프트: "JT 튜터" 페르소나 (세법·회계 전문 + 심리 멘토)
  - law.go.kr API 연동: 실시간 법령 조문 컨텍스트 주입
  - 기출 DB 연동: 관련 문항 2~3개 자동 검색
  - 멀티턴 대화: 최대 5왕복(10메시지)
  - Rate limiting: Free 3회/일 (Haiku), Premium 20회/일 (Sonnet)
  - 추천 질문 칩 4개 (양도소득세, 면세/영세율, 가산세, 심리 상담)
  - 마크다운 렌더링 (볼드, 리스트, 이모지)
- [x] **StudyTimer 삭제** — 하단 네비게이션의 "타이머" 탭 제거
- [x] **GitHub repo Public 전환** — Vercel Hobby 플랜 git author 제한 해결
- [x] **Vercel Git 연동 복구** — repo visibility 변경 후 재연결
- [x] **프로덕션 배포 + E2E 테스트 완료** — gichul.jttax.co.kr에서 실제 AI 답변 수신 확인
- [x] **마크다운 표·구분선·h1 렌더링** — MarkdownTable 컴포넌트 추가, 커스텀 파서 확장
- [x] **JT 로고 이미지 적용** — 텍스트 "JT" → logo-jt-small.png 이미지로 교체 (헤더/버블/로딩)
- [x] **바텀시트 BottomNav 겹침 해결** — bottom: 64px로 바텀시트를 네비바 위에 배치
- 신규 파일: `lib/lawApi.ts`, `lib/askContextEngine.ts`, `components/ai/AskFAB.tsx`, `components/ai/AskChat.tsx`, `hooks/useAskAI.ts`
- 수정 파일: `lib/aiConfig.ts`, `lib/aiPrompts.ts`, `lib/claude.ts`, `app/api/ai/[feature]/route.ts`, `app/layout.tsx`
- 알려진 이슈: AI 답변 내 마크다운 표가 raw 텍스트로 표시됨 (테이블 파싱 미구현)

### 기능 개선 + SEO + 성능 (260407 심야)
- [x] **오답노트 필터 강화** — 모드 필터(전체/연습/OX) UI 노출 + 법별(과목별) 필터 추가 (review/page.tsx)
- [x] **SEO 사이트맵 보강** — review/ai/mock-exam/login 정적 페이지 추가 (sitemap.ts)
- [x] **manifest.json 업데이트** — "세법" → "세법·회계", 문항 수 2,065 반영
- [x] **정적 데이터 캐시** — /data/ 경로 Cache-Control 헤더 추가 (24h + stale-while-revalidate 7d)
- [x] **Anthropic 크레딧 충전** — $10 충전, Auto reload OFF (3중 보호 완성)
- [x] **피드백 처리** — d151a720 resolved
- PWA 푸시: 인프라 완성, VAPID 키 + PUSH_API_KEY 환경변수 추가 시 활성화
- 빌드 검증: 2,095페이지, 에러 0

### API 키 보호 대책 (260407 밤)
- [x] **Haiku 모델 분리** — 브리핑/오답진단/모의고사 claude-haiku-4-5 사용 (비용 ~1/10 절감)
- [x] **월간 $10 상한** — 서버측 월간 비용 추정, 초과 시 Claude 보강 차단 (로컬 엔진만 작동)
- [x] **신규 계정 24시간 대기** — 가입 후 24시간 미만 계정 AI 기능 차단 (계정 팜 방지)
- [x] **sanitizeInput 전체 적용** — 5개 AI 기능 모두 프롬프트 인젝션 방어 (기존 briefing만 → 전체)
- [x] **접근 실패 로깅** — 401/403/429 시 [AI-SECURITY] 태그로 console.warn 기록
- [x] **Anthropic Console** — $10 크레딧 충전, Auto reload OFF (소진 시 자동 차단 = 사실상 $10 한도)
- 빌드 검증: 2,095페이지, 에러 0

### UI/UX 개선 2차 (260407 밤)
- [x] **글자 크기 업그레이드** — 본문 text-sm→text-base, 선택지 text-[15px], 보기/해설 text-sm (QuestionView, OX, practice, review, WrongAnswerDiagnosis)
- [x] **DESIGN.md 타이포그래피** — 5단계 규칙 업데이트 (본문 16px, 콘텐츠 보조 15px)
- [x] **휴식 모달 빈도 조정** — 3시간→5시간, 스누즈 30분→1시간 (RestReminder.tsx)
- [x] **홈 빈 공간 수정** — main pb-24→pb-6 (footer가 bottom nav 여유 처리)
- 빌드 검증: 2,095페이지, 에러 0

### 수동 작업 완료 (260407 저녁)
- [x] **Supabase RLS 마이그레이션** — v5 보안 강화: ai_usage/ai_cache 불필요 RLS 정책 3개 DROP 완료
- [x] **Vercel ANTHROPIC_API_KEY** — 환경변수 추가 (All Environments) + Redeploy 트리거
- AI API 프로덕션 연동 완료 (코드 변경 없이 환경변수만 추가)

### UX 버그 수정 + 크로스 브라우저 테스트 (260407 오후)
- [x] **포커스 모드 나가기 버튼** — OX 퀴즈/타이머/1분 퀴즈 진행 중 X 닫기 버튼 추가 (focusMode에서 Header+BottomNav 숨김 시 탈출 불가 버그 수정)
- [x] **선택지 문단 구분 수정** — QuestionView 선택지에 `whitespace-pre-wrap` 추가 (\n 포함 선택지 줄바꿈 표시)
- [x] **문제 본문 굵은 글씨 범위** — `font-medium` → `font-normal` (전체 굵게 → 일반 두께, 강조 구분 가능)
- [x] **피드백 해결** — [d151a720] 문단 구분 + 굵은 글씨 처리 → resolved
- [x] **크로스 브라우저 테스트** — 홈/OX/문제상세(#651) 다크·라이트 모드 확인, 선택지 줄바꿈 정상
- 빌드 검증: 2,095페이지, 에러 0

### 보안 강화 + UX 개선 + 프로덕션 배포 (260407)
- [x] **보안/저작권 강화** — Edge middleware(rate limiting, bot blocking, security headers), robots.txt 크롤러 차단, ContentProtection(select-none, contextmenu 차단), 프린트 워터마크, noarchive 메타, 프롬프트 인젝션 방어(sanitizeInput)
- [x] **Claude API 인프라** — `lib/claude.ts` 싱글턴 클라이언트, 2-tier 구조(로컬엔진 + Claude 보강), 5개 기능(briefing/wrong_answer/mock_exam/weekly_report/dday_strategy)
- [x] **시험목표 재분류** — "회계" 제거, 9급/7급 모두 세법+회계 포함으로 통일 (OnboardingModal, MockExam, MyPage, Roadmap, JourneyMap)
- [x] **학습맵 목차순 정렬** — 17개 법률 + 164개 토픽 기본서 목차 순서 적용, 국세/지방세/회계 3그룹 분리 (useTopicMastery.ts, TopicMasteryMap.tsx)
- [x] **에러 메시지 구체화** — 브리핑/모의고사/주간보고서 API에 사전 조건 체크(온보딩 완료, 최소 풀이 수) + 에러 코드별 CTA 버튼(문제 풀러 가기, 프로필 설정하기)
- [x] **헤더 "세법" 제거** — "JT 기출"로 변경 (세법+회계 통합)
- [x] **AI 도구 설명** — 개발자 문구 → 수험생 친화 문구
- [x] **GitHub 저장소** — jjuntube101-hash/jt-gichul (Private) 생성 + push
- [x] **Vercel 프로덕션 배포** — CLI 직접 배포 성공 (gichul.jttax.co.kr)
- 빌드: 2,095페이지, 에러 0
- 커밋: `95b8dcc` "UX 개선: 시험목표 재분류, 학습맵 목차순 정렬, 에러 메시지 구체화"

### DESIGN.md + JourneyMap + 마이페이지 리프레시 (260407)
- [x] **DESIGN.md 작성** — awesome-design-md 9-섹션 포맷, 기존 디자인 시스템 문서화 (Visual Theme/Colors/Typography/Components/Layout/Depth/Don'ts/Responsive/Agent Prompt Guide)
- [x] **design-preview.html** — DESIGN.md HTML 프리뷰 (라이트/다크 전환 가능, 참고용 보관)
- [x] **JourneyMap 컴포넌트** — `components/progress/JourneyMap.tsx` 신규 (풀이진도 프로그레스바 + 마스터토픽 수 + 로드맵 주차 + D-day 카운트다운 + 복습 대기 배너)
- [x] **마이페이지 리프레시** — JourneyMap "학습 여정" 섹션 추가, 통계 카드 2×2→정답률 2카드로 간소화(풀이+OX 각각 정답/총수 서브텍스트), 시험일 프로필 표시, 스트릭 아이콘 orange→warning 토큰, MenuLink ChevronRight 아이콘 통일, roadmap 주차 역산 로직
- 빌드 검증: 2,090페이지, 에러 0

### 사전 생성 AI 4종 (260407)
- [x] **생성 스크립트** — `scripts/generate-ai-data.ts` (2,065문항 전수 분석)
- [x] **출제자의 눈** — `public/data/ai/exam_patterns.json` (120개 토픽: 출제빈도/함정비율/연도추이/시험별)
- [x] **유사 문항 비교** — `public/data/ai/similar_questions.json` (443개 그룹: related_questions 기반 연결)
- [x] **함정 패턴 훈련소** — `public/data/ai/trap_patterns.json` (10가지 유형: 설명+빈도+법별분포+실제예시5건)
- [x] **조문 암기 카드** — `public/data/ai/law_flashcards.json` (2,783개 조문: OX 플래시카드)
- [x] **AI 허브 페이지** — `/ai` (4종 기능 진입점)
- [x] **출제자의 눈 UI** — `/ai/exam-patterns` (법별 필터, 토픽 아코디언, 연도 바차트, 함정 비율 바)
- [x] **함정 훈련소 UI** — `/ai/traps` (전체 빈도 차트, 유형별 설명+법분포+실제예시 링크)
- [x] **유사 문항 UI** — `/ai/similar` (법별 필터, 연도 범위, 모아풀기 링크)
- [x] **조문 암기 카드 UI** — `/ai/flashcards` (목록/학습 모드, 플립 애니메이션, 셔플/이전/다음)
- 빌드 검증: 2,095페이지 (+5 AI), 에러 0
- API 비용: $0 (정적 JSON, 클라이언트 사이드)

### FeatureTooltip + 홈 AI 링크 (260407)
- [x] **FeatureTooltip** — `components/ui/FeatureTooltip.tsx` (localStorage 기반 첫 방문 1회 표시, 5초 자동 닫힘, top/bottom 위치)
- [x] **HomeCards 적용** — 신규 유저: "1문제만!" CTA 안내 / 일반 유저: 브리핑 안내
- [x] **홈 AI 링크** — `/ai` 진입점 배너 (Sparkles 아이콘 + NEW 뱃지)
- 빌드 검증: 2,095페이지, 에러 0

### P2 신규 기능 (260407)
- [x] P2-1: 마이페이지 프로필 편집 (이름 변경 + 시험 목표 변경, DB upsert)
- [x] P2-2: 1분 퀴즈 해설 표시 (답변 후 law_ref 즉시 표시 + 결과 화면 오답 해설 섹션)
- [x] P2-3: 오답 패턴 분석 (오답노트에 함정유형별 바 차트 — trap_type/trap_patterns 기반)
- [x] P2-4: 연도별 기출 모아보기 (practice?year=YYYY 파라미터 + 검색 페이지 연도 그리드)
- [x] P2-5: 관련 문항 연결 (문항 상세 페이지에 related_questions 전체 목록 + 모아풀기 링크)
- [x] P2-6: 지방세 로드맵 2주 분할 (9급 11주→11·12주+13주 복습, 7급 14주→14·15주+16·17주)
- [x] 공통 유틸 모듈 생성 (lib/utils/dateUtils.ts, arrayUtils.ts)

### CEO 총괄 — 4인 전문가 리뷰 반영 (260407)
수험생·디자이너·개발자·강사 4인 전문가가 전체 기능을 점검, CEO가 종합하여 P0~P2 분류 후 수정.

**P0 수정 (즉시)**:
- [x] P0-1: RoadmapTimeline — 회계 examTarget 캐스팅 버그 수정 (as "9급"|"7급" → "회계" 분기 추가)
- [x] P0-2: SM-2 간격복습 — 초반 고정 간격 1→3→7→14→30 적용 (기존: 1→2→6→15→38)
- [x] P0-3: useSolveRecord — 전체 테이블 풀스캔 → count 쿼리 최적화 (2×select 제거)
- [x] P0-4: roadmap.ts LAW 매핑 검증 — 현행 유지 (exam_index에 조세법총론·종합부동산세법 실존 확인)
- [x] P0-5: StudyTimer — 하드코딩 색상 20+개 → 디자인 토큰(primary/success/muted 등) 전환
- [x] P0-6: mockExamEngine — O(n) pool.find → poolMap O(1) 조회 최적화

**P1 수정 (이번 스프린트)**:
- [x] P1-1: mock-exam/result — bg-white/80 → bg-card/80 다크모드 수정
- [x] P1-2: 공통 유틸 추출 (lib/utils/dateUtils.ts, arrayUtils.ts) — 중복 코드 기반 마련

**P2 (모두 구현 완료)**:
- [x] 마이페이지 프로필 편집 기능
- [x] 1분 퀴즈 해설 표시
- [x] 오답 패턴 분석 (함정유형별)
- [x] 연도별 기출 모아보기
- [x] 관련 문항 연결 (유사문항 비교)
- [x] 지방세 로드맵 2주 분할 (11주차 과부하)

### 사용자 보고 버그 수정 (260407)
- [x] 1. 회계 문제풀이 불가 → CategoryTree에 subject 파라미터 추가
- [x] 2. 모의고사 미생성 → 풀이기록 <5일 때 unseen 60%/challenge 30% 비율 적용
- [x] 3. 브리핑 안 보임 → StageHome 외부로 독립 (1문항부터 표시)
- [x] 4. 이번주 학습 기준 불명 → 자유 선택형 RoadmapCard 전면 개편 (주차 그리드 피커)
- [x] 5. 약점과목 고정 → useTopicMastery 기반 자동 재평가 (정답률 70%↓ + 5문항↑ 감지, DB 자동 갱신)

### 500명 시뮬레이션 기반 핫픽스 (260407)
- [x] P0-1: 모의고사 엔진 회계 문항 포함 (mockExamEngine.ts L99 필터 수정)
- [x] P0-2: 모의고사 UI에 "회계" 선택지 추가
- [x] P0-3: 온보딩에 "회계" 시험 목표 + 회계 카테고리 약점 선택 추가
- [x] P1-1: D-day 전략 examTarget 동적화 (사용자 프로필 조회)
- [x] P1-2: 주간 보고서 examTarget 동적화
- [x] P1-3: 1분 퀴즈 subject dependency 추가 (과목 전환 시 문항 갱신)
- [x] P1-4: QuickStartCTA 현재 과목 기반 랜덤 문항 선택
- [x] P2-1: 검색 MAX_YEAR 동적화 (하드코딩 2025 → 현재 연도)
- [x] P2-2: 오답노트 OX 필터 수정 (mode === "ox" || "quick"로 정확 매칭)

### 보안/저작권 강화 (260407)
- [x] **middleware.ts** — IP 기반 속도제한 (/data/ 분당30회, /api/ 분당60회, /question/ 분당60회), 악성 봇 UA 차단 (20+ 패턴), 보안 헤더 자동 추가
- [x] **robots.ts** — `/data/`, `/api/` Disallow + 악성 크롤러 6종 전면 차단
- [x] **문항 메타태그** — noarchive + max-snippet:80 (검색엔진 캐시/스니펫 제한)
- [x] **ContentProtection 컴포넌트** — QuestionView에 적용 (select-none, 우클릭 차단, Ctrl+U/S 차단)
- [x] **인쇄 워터마크** — @media print에 "JT기출 - 무단 복제 금지" 대각선 워터마크
- [x] **next.config.ts 보안 헤더** — X-Frame-Options DENY, X-Content-Type-Options nosniff, /data/ X-Robots-Tag noindex
- [x] **프롬프트 인젝션 방지** — sanitizeInput() 함수 (줄바꿈/JSON구조/명령어키워드 제거, 100자 제한)
- [x] **RLS 마이그레이션 SQL** — ai_usage UPDATE/INSERT 정책 제거 (레이트리밋 우회 방지), ai_cache 읽기 정책 제거
- [x] **오답진단 AI 표시** — Claude 보강 시 "AI 심층 분석" 섹션 자동 표시 (Sparkles 아이콘)
- 빌드 검증: 정상 (에러 0, Middleware 활성)

### Claude API 인프라 구축 (260407)
- [x] **@anthropic-ai/sdk 설치** — Anthropic 공식 Node.js SDK
- [x] **lib/claude.ts** — 싱글턴 클라이언트, callClaude/callClaudeJSON 래퍼, logAIUsage, 모델 라우팅 (haiku→sonnet-4, sonnet→sonnet-4)
- [x] **lib/aiPrompts.ts** — 5종 프롬프트 템플릿 (브리핑/오답진단/주간보고서/D-day전략/모의고사리뷰), 각각 system prompt + user message 빌더
- [x] **route.ts 업그레이드** — generatePlaceholder 제거 → 2-tier 구조 (Tier 1 로컬 엔진 + Tier 2 enhanceWithClaude), isClaudeEnabled() 체크, AI 사용량 로깅, aiGenerated 플래그 반환
- [x] **.env.local에 ANTHROPIC_API_KEY 설정** — Tier 2 활성화 준비 완료
- 빌드 검증: 정상 (에러 0)
- 현재 상태: **인프라만 구축, Claude API 실제 호출 안 함** (사용자 지시)

### Sprint 19~22 주요 구현
- [x] DB 5테이블 (user_study_profiles, daily_study_logs, spaced_repetition_cards, ai_cache, ai_usage)
- [x] 3단계 온보딩 (이름+시험목표 → 시험일 → 약점과목)
- [x] Write-through 동기화 엔진 (localStorage + Supabase 병행)
- [x] AI 인프라 (/api/ai/[feature], 캐시, 레이트리밋)
- [x] 브리핑/오답진단/모의고사/주간보고서/D-day전략 엔진
- [x] 학습 로드맵 (9급 12주 / 7급 16주 / 회계 8주)
- [x] 유저 단계별 홈 (anonymous/new/regular/power)
- [x] ㄱㄴㄷㄹ 조합 문제 O/X 배지 + 계산문제 숫자 하이라이트
- [x] 회계 820문항 통합 (2001~2820 번호 체계)
- [x] 500명 가상 수험생 12개월 시뮬레이션 → P0/P1 도출

### 시뮬레이션 기반 개선 (260407)
- [x] P0-1: 비로그인 풀이 기록 마이그레이션 (anonSolveBuffer → Supabase on login)
- [x] P0-2: 신규 유저 경험 강화 (로드맵 미리보기 + 해금 안내)
- [x] P0-3: 로드맵 시험일 기반 역산 (examDate에서 totalWeeks 역산)
- [x] P1-1: 회계 로드맵 8주 커리큘럼 추가
- [x] P1-2: 주간 보고서 cache-first 순서 변경 (캐시 히트 시 레이트리밋 미소비)

### MVP 오픈 조건 체크리스트
- [x] 1,245문항 데이터 무결성 (1,260페이지 빌드 성공, TypeScript 오류 0)
- [x] 가상 수험생 5명 시나리오 통과 (Sprint 4 QA, P0 3건 수정 완료)
- [x] Lighthouse 성능 90+ 전 항목 달성 (98/96/100/100)
- [x] PWA 아이콘 JT 공식 로고 적용 (icon-192/512, apple-touch-icon, favicon)
- [x] OG 공유 이미지 JT 로고 적용 (홈 + 문항별 동적 OG)
- [x] 브레드크럼 네비게이션 버그 수정 (쿼리 파라미터 유지)
- [x] 하단 네비게이션 "랜덤" 버튼 추가 (6탭)
- [x] **해설 검수 50문항 통과** — verdict 일치 50/50, 필드 완성 50/50, 이슈 0건
- [x] **데이터 정제** — PDF 추출 아티팩트 73건 제거 (시험지 페이지 표시 잔존)
- [x] 실기기 PWA 설치 + 오프라인 동작 확인
- [x] **국세/지방세 분류 필터** — 문항 목록, 랜덤, 타이머, OX 퀴즈 모두 적용
- [x] **공유 텍스트/OG 이미지 개선** — 챌린지 메시징, CTA 배너, 정답률별 색상
- [x] **피드백 시스템** — 앱 내 수집 + Claude CLI 조회/처리 + 전체 파이프라인 검증 완료
- [x] **Supabase 마이그레이션** — streak_freezes, last_freeze_earned_at, last_freeze_used_at 컬럼 추가
- [x] **Vercel 환경변수** — VAPID_PRIVATE_KEY, PUSH_API_KEY, CRON_SECRET, SUPABASE_SERVICE_KEY 설정
- [ ] 모바일/PC 크로스 브라우저 — **다양한 기기 추가 테스트 필요**

### Sprint 2 — 4대 기능 추가 (260407)
- [x] 1. 홈 화면 리팩토링 — 유저 단계별 카드 축소 (HomeCards.tsx, 12→3~7개)
- [x] 2. "틀린 문제 바로 풀기" — 오답노트에서 원터치로 오답 세트 연습 세션 생성
- [x] 3. 간격 복습 탭 — 오답노트에 "간격 복습" 탭 추가 (오늘 복습/예정/마스터 통계)
- [x] 4. 모의고사 결과 분석 — /mock-exam/result 페이지 (점수/등급/과목별/난이도별 분석)

### 다음 할 일
1. **AI API 실연동** — `/api/ai/[feature]` → Claude API 호출 실구현 (비용 발생, API 키 필요)
4. 회계 기출 데이터 보강 (추가 수집, 텍스트 100% 정확성 보장)
5. 베타 피드백 수집 + 반영
6. 모바일/PC 크로스 브라우저 테스트

## 작업 이력

### 260406 (28차 — Sprint 18: 심화 기능 5종)
- **주간 마스터리 리포트**: `WeeklyReport.tsx` — 이번 주 vs 지난 주 풀이량/정답률 비교, 정복 토픽, 추천 집중 과목 (일요일 저녁~월요일 표시)
- **간격 복습 (Spaced Repetition)**: `lib/spacedRepetition.ts` + `hooks/useSpacedRepetition.ts` — SM-2 알고리즘, 1→3→7→14→30일 간격, 오답 자동 등록 (`questTracker.ts` 연동)
- **간격 복습 홈 카드**: `SpacedReviewCard.tsx` — 오늘 복습 대기 문항 수 표시 + /review 링크
- **휴식 권유**: `RestReminder.tsx` — 3시간 연속 사용 감지, 부드러운 모달 (쉬기/30분 스누즈), 윤리적 경계
- **에러 바운더리**: `ErrorBoundary.tsx` — React 클래스 컴포넌트, 렌더링 오류 캐치, 새로고침/홈 안내
- **베타 페이지 개선**: Sprint 17 기능 7종 반영 (1분 퀴즈, 간격 복습, 뽀모도로 등), 1분 퀴즈 퀵스타트 링크
- **layout.tsx 통합**: ErrorBoundary 래핑 + RestReminder 추가
- 빌드 검증: `next build` 성공 (1,265페이지, 오류 0)
- 프로덕션 배포: gichul.jttax.co.kr 반영 완료

### 260406 (27차 — Sprint 17: UX 리디자인 + 체류시간 강화)
- **Supabase 마이그레이션**: `migration_v3_engagement.sql` 실행 완료 (streak_freezes 3개 컬럼)
- **Vercel 환경변수**: VAPID_PRIVATE_KEY, PUSH_API_KEY, CRON_SECRET, SUPABASE_SERVICE_KEY 설정 완료
- **홈 리디자인**: 정적 카테고리 트리 → 컴팩트 히어로 + 4아이콘 그리드(OX퀴즈/타이머/오답노트/검색) + 3링크 퀵 프랙티스(1분퀴즈/최근기출/랜덤10문) + 접이식 CategoryTree
- **CategoryTree 컴포넌트**: 과목별 문제 접이식 아코디언, 법령별 확장, 토픽 칩 + 전체 풀기 링크
- **★ 등급 배지 제거**: CategoryTree에서 오해 소지 있는 maxGrade 표시 제거
- **Progressive Disclosure**: QuestionView 7개 섹션 → 접이식 아코디언 (기본: 선지별 분석만 열림, 오답 시 학습가이드 자동 열림)
- **세션 요약 개선**: SessionSummary + 타이머 결과에 "다음에 할 것" 자동 추천 (틀린 문항 복습 CTA, 맥락 기반 다음 활동)
- **1분 퀴즈**: `app/quick/page.tsx` — OX 5문항 60초 제한, 미니멀 UI, 자동 진행
- **오늘의 학습 플랜**: `DailyStudyPlan.tsx` — 3단계 순차 학습 (복습→약점→실전), localStorage 추적
- **뽀모도로 타이머**: `StudyTimer.tsx` — 25분 집중/5분 휴식, 플로팅 위젯, 일일 누적 시간
- **OX 드릴 → OX 퀴즈**: 앱 전체 8+ 파일에서 명칭 변경
- 빌드 검증: `next build` 성공 (1,265페이지, 오류 0)
- 프로덕션 배포: gichul.jttax.co.kr 반영 완료

### 260406 (26차 — Sprint 16: 깊이+사회성)
- **적응형 난이도**: `lib/adaptiveDifficulty.ts` — OX 드릴에서 최근 정답률 기반 난이도 자동 조절 (>85%: 어렵게, <50%: 쉽게), 3구간 인터리빙
- **학습 맵**: `hooks/useTopicMastery.ts` + `TopicMasteryMap.tsx` — 과목×토픽 히트맵 (미시도/빨강/노랑/초록/금색), 마이페이지에 배치
- **퍼센타일**: `PeerBenchmark.tsx` — 긍정적 사회비교만 (평균 이상: 순위 표시, 이하: 자기 대비 진행률), 주간 풀이량 추적
- **푸시 알림**: `lib/pushMessages.ts` 메시지 템플릿 + `/api/push` 수동 발송 + `/api/cron/push-morning` (어제 오답 복습) + `/api/cron/push-evening` (스트릭 위험) Vercel Cron
- web-push 설치, Supabase 마이그레이션 SQL 작성 (`migration_v3_engagement.sql`)
- 빌드 검증: `next build` 성공 (1,261+α 페이지, 오류 0)

### 260406 (25차 — Sprint 15 보완: 퀘스트 진행률 연동)
- **퀘스트 트래커**: `lib/questTracker.ts` — 오늘의 누적 풀이 통계를 localStorage에 저장하고 dailyQuest와 동기화
- **연동 포인트**: OX(`trackOX`), QuestionView(`trackSolve`), Timer(`trackSolve`+`trackTimerComplete`)
- **DailyQuestCard 실시간 갱신**: window focus 이벤트로 다른 페이지 풀이 후 홈 복귀 시 자동 반영
- 빌드 검증: `next build` 성공 (1,261페이지, 오류 0)
- 브라우저 테스트: OX 2문항 풀이 → 3개 퀘스트 모두 current 값 증가 확인

### 260406 (24차 — Sprint 15: 핵심 참여 루프)
- **세션 내 모멘텀**: OX 드릴 연속 정답 시 시각 피드백 (3연속: 웜 글로우, 5연속: 불꽃 모드 배너, 10연속: 펄스 애니메이션+링)
- **스트릭 프리즈**: `lib/streak.ts` — 자동 사용 (이틀 미접속 시 차감), 7일 연속 시 주 1회 획득 (최대 3개), `StreakBanner` 방패 표시
- **스마트 추천 엔진**: QuestionView에 "한 문제 더?" 섹션 — `related_questions` 기반 다음 문항 즉시 제안
- **데일리 퀘스트**: `lib/dailyQuest.ts` — 날짜 기반 시드로 매일 3개 퀘스트 (쉬움/보통/어려움), localStorage 기반 진행 추적, `DailyQuestCard.tsx` 홈 표시
- 빌드 검증: `next build` 성공 (1,261페이지, 오류 0)

### 260406 (23차 — Sprint 14: Sticky App Phase 1)
- **포커스 모드**: OX/타이머 진행 중 Header+BottomNav 숨김 (`appStore.isFocusMode`, 컴포넌트 언마운트 시 자동 해제)
- **미완성 업무 홈 화면**: Zeigarnik 효과 활용 — OX 이어풀기, 타이머 결과, 어제 틀린 문항, 약점 과목 카드 (`HomeEngagement.tsx` 리팩토링, `useStudyContext.ts` 신규)
- **클리프행어 세션 요약**: OX 완료 시 과목별 오답 열린 루프 + 복습 유도 (`SessionSummary.tsx` 신규, OX completion 교체)
- **1문제만! CTA**: 홈 상단 원탭 버튼 → 랜덤 문항 즉시 진입 (`QuickStartCTA.tsx` 신규)
- 심리학 프레임워크: Hook Model, BJ Fogg, SDT, Flow, 손실 회피, Zeigarnik, 사회비교, 가변비율 강화
- 빌드 검증: `next build` 성공 (1,261페이지, 오류 0)

### 260406 (22차 — Sprint 13: 검색 고도화)
- **Header 검색 아이콘**: 모든 페이지에서 검색 진입 가능 (`Header.tsx`)
- **디바운스 훅**: `useDebounce(200ms)` 적용, Fuse 검색 성능 개선 (`hooks/useDebounce.ts`)
- **매치 하이라이팅**: Fuse.js `includeMatches` + `highlightText()` 헬퍼, `<mark>` 태그 래핑
- **검색 결과 필터**: 세목(국세/지방세), 출제연도(2015~2025), 난이도(1~5) 필터 칩 UI
- **결과 카드 강화**: 난이도 바(5단계), 정답률 색상코딩(green/amber/red), 국세/지방세 배지
- **더보기 페이지네이션**: Fuse limit 100, 화면 20건씩 점진 로딩
- **최근 검색**: localStorage 기반, 최대 8건, 개별/전체 삭제, 추천 검색어
- **코드 품질 반영**: 연도필터 유효성(from>to 자동보정), 접근성(aria-label), 모바일 삭제버튼 가시성
- 빌드: 2회 성공, TypeScript 에러 0, 1,261 페이지 생성
- ✅ 브라우저 실기 테스트 완료 (검색/하이라이팅/필터/최근검색/카드강화 모두 확인)
- 배포 예정: Vercel production

### 260406 (21차 — Sprint 12: 피드백 시스템 구축)
- **피드백 수집 시스템 구축**:
  - Supabase `feedback` 테이블 설계 (migration_feedback.sql)
  - 플로팅 피드백 버튼 (`components/feedback/FeedbackButton.tsx`)
  - 카테고리: 버그/기능요청/UI/기타, 페이지URL·기기정보 자동 캡처
  - 바텀시트 UI, 완료 애니메이션, 로그인/비로그인 모두 지원
  - RLS: 누구나 INSERT, 읽기는 service_role만
- **Claude용 피드백 CLI** (`scripts/feedback-cli.sh`):
  - `list`: 미처리 피드백 조회
  - `all`: 전체 피드백 조회 (최근 50건)
  - `resolve <id> "메모"`: 해결 처리
  - `wontfix <id> "사유"`: 미반영 처리
- **AGENTS.md 피드백 워크플로우 추가**:
  - 세션 시작 시 자동으로 미처리 피드백 확인
  - 판단 기준: 버그→즉시수정, 기능→사용자 확인, 범위밖→wontfix
- **OX 드릴 국세/지방세 필터** 추가 (Sprint 11 누락분)
- ⚠️ **TODO**: Supabase Dashboard에서 migration_feedback.sql 실행 + .env.feedback 설정 필요
- 배포: Vercel production

### 260406 (20차 — Sprint 11: 국세/지방세 필터 + 공유 개선)
- **국세/지방세 분류 필터 전면 적용**:
  - 국세(8법): 국세기본법, 국세징수법, 법인세법, 부가가치세법, 상속세 및 증여세법, 소득세법, 조세법 총론, 종합부동산세법
  - 지방세(4법): 지방세기본법, 지방세법, 지방세징수법, 지방세특례제한법
  - `practice/page.tsx`: 전체/국세/지방세 탭 UI, 랜덤·최근·전체 모드 모두 적용
  - `timer/page.tsx`: 셋업 화면에 스코프 선택 추가, 랜덤 출제 시 필터 적용
  - `ox/page.tsx`: 시작 전 스코프 선택 화면 추가, 문항 수 표시, 세션 복원 시 스코프 유지
- **공유 텍스트 개선** (`QuestionView.tsx`):
  - 정답률별 챌린지 메시지 (≤40%: 킬러 문항, ≤60%: 절반은 틀리는, >60%: 일반)
  - 정오 결과 포함: "나는 맞혔다! 너는?"
  - URL 별도 파라미터로 분리 (Web Share API)
- **OG 이미지 개선** (`opengraph-image.tsx`):
  - CTA 배너 추가 — 정답률별 색상 (빨강/주황/보라)
  - 챌린지 텍스트: "이 문제 맞힐 수 있어?" / "절반은 틀리는 문항"
  - 배경 그래디언트에 보라색 추가
- **OG 메타데이터 개선** (`page.tsx`):
  - 정답률 기반 후킹 description
  - OG title: "이 문제 맞힐 수 있어? | JT기출"
- 배포: Vercel production

### 260406 (19차 — Sprint 10: 해설 검수 + 타이머 UX + 데이터 정제)
- **해설 검수 50문항 완료** (3개 병렬 에이전트):
  - 그룹1 (17문항 no 21~364): 전체 통과
  - 그룹2 (17문항 no 406~701): 전체 통과, 텍스트 아티팩트 2건 발견
  - 그룹3 (16문항 no 767~1259): 전체 통과
  - verdict 일치 50/50, 필드 완성 50/50
- **PDF 추출 아티팩트 일괄 정제**: 전체 1,245문항 스캔 → 73건 제거 (시험지 페이지 표시 "세법개론 라 책형 1쪽" 등)
- **타이머 결과 복원 수정**: 결과 화면 → 문항 상세 → 뒤로가기 시 결과 화면 자동 복원 (sessionStorage 활용)
  - `from=timer` 브레드크럼 지원 추가 ("홈 > 타이머 결과 > #번호")
  - "다시 도전" 시 sessionStorage 클리어
- 배포: Vercel production

### 260406 (18차 — Sprint 9: 베타 피드백 반영 + UX 개선)
- **JT 로고 아이콘 적용**: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico 모두 공식 JT 로고로 교체
- **OG 공유 이미지 로고 적용**: 홈(`app/opengraph-image.tsx`) + 문항별(`app/question/[no]/opengraph-image.tsx`) — base64 인코딩 방식
- **manifest.json 아이콘 분리**: `"purpose": "any maskable"` → 별도 `"any"` + `"maskable"` 엔트리 (Android PWA 설치 조건)
- **브레드크럼 버그 수정**: 이전/다음 이동 시 쿼리 파라미터(`from`, `law`, `topic`, `filter`) 유실 → `navQuery` 변수로 전체 보존
- **오답노트 브레드크럼**: `from=review` 지원 추가
- **하단 네비게이션 "랜덤" 버튼**: 6탭 (홈/문항/랜덤/OX/타이머/MY), `useSearchParams`로 문항↔랜덤 active 구분
- **접근성**: `maximumScale: 1` → `5` (핀치줌 허용), `opacity-60` → `text-muted-foreground`
- 배포: Vercel production

### 260406 (17차 — Sprint 8: 베타 준비 + 검수 샘플 + 코드 정리)
- **Lighthouse 크로스 검증**:
  - 데스크톱: Performance 98 / Accessibility 96 / Best Practices 100 / SEO 100
  - 문항 페이지 모바일: Performance 96 / Accessibility 96 / SEO 92
  - **전 환경, 전 페이지 90+ 달성**
- **PWA 설정 검증**: SW 정상 서빙, manifest 정상, HTTPS+HSTS, 설치 요건 충족
- **해설 검수 샘플**: `해설검수_샘플50문항.md` — 12과목 균등 배분 50문항, 검수 체크리스트 포함
- **베타 초대 페이지** (`app/beta/page.tsx`):
  - 주요 기능 소개 (5종)
  - 바로 시작 퀵링크 4종
  - 피드백 폼 (별점 5점 + 텍스트, localStorage 저장)
  - URL: gichul.jttax.co.kr/beta
- **코드 정리**: 미사용 기본 파일 5개 삭제 (file/globe/next/vercel/window.svg)
- **빌드 테스트**: PASS (TypeScript 오류 0)
- **Vercel 프로덕션 배포**: 완료

### 260406 (16차 — Sprint 7: Lighthouse 90+ 달성 + OG 이미지 + 접근성)
- **Lighthouse 측정 결과** (모바일):
  - Performance: **98** / Accessibility: **96** / Best Practices: **100** / SEO: **100**
  - Core Web Vitals: FCP 1.2s, LCP 1.9s, TBT 120ms, CLS 0.033
  - **마스터플랜 목표 "Lighthouse 90+" 전 항목 달성**
- **접근성 수정**:
  - `app/layout.tsx` — viewport maximumScale 1→5 (핀치 줌 허용, WCAG 준수)
  - `app/page.tsx` — opacity-60 → text-muted-foreground (색상 대비 개선)
- **OG 이미지 동적 생성** (next/og ImageResponse):
  - `app/opengraph-image.tsx` — 홈 OG 이미지 (다크 그라데이션, 브랜드명, 설명)
  - `app/question/[no]/opengraph-image.tsx` — 문항별 동적 OG (과목/시험/난이도바/정답률)
  - SNS 공유 시 자동 생성 이미지 표시 (카카오톡, 페이스북, 트위터)
- **빌드 테스트**: PASS (1,260페이지, TypeScript 오류 0)
- **Vercel 프로덕션 배포**: 완료
- 다음: 베타 초대 준비

### 260406 (15차 — Sprint 6: PWA 오프라인 + SEO 강화 + 배포)
- **PWA Service Worker 오프라인 캐시 강화** (`app/sw.ts`):
  - 문항 데이터 청크: CacheFirst 전략 (7일 만료, 최대 20엔트리) — 오프라인 문항 풀기 지원
  - exam_index.json: NetworkFirst 전략 (24시간 만료) — 업데이트 반영하면서 오프라인 폴백
  - Serwist RuntimeCaching의 `matcher` 프로퍼티 사용 (urlPattern 아님)
- **SEO 메타태그 강화**:
  - `app/layout.tsx` — OG url/siteName/locale, Twitter card, canonical URL 추가
  - `app/question/[no]/page.tsx` — generateMetadata 대폭 강화: 과목/중분류/시험구분/연도/난이도/정답률 포함, OG article 타입
  - `app/sitemap.ts` — 타이머/검색 페이지 추가 (기존 3→5 정적 페이지)
- **manifest.json 보강**: lang, categories(education), scope, id, shortcuts 3종 (OX/타이머/랜덤)
- **빌드 테스트**: PASS (1,259페이지, TypeScript 오류 0)
- **Vercel 프로덕션 배포**: 완료
- 다음: 베타 초대 / Lighthouse 측정 / OG 이미지

### 260406 (14차 — Sprint 5: 성능 수정 + VAPID 키 + 배포)
- **P2 성능 수정**: localStorage → IndexedDB 캐시 마이그레이션
  - `lib/cache.ts` (NEW) — IndexedDB 래퍼 (cacheGet/cacheSet/cleanupLocalStorage)
  - `lib/questions.ts` — loadChunk()의 localStorage 캐시를 IndexedDB로 교체
  - 앱 시작 시 기존 localStorage 청크 캐시 자동 정리 (cleanupLocalStorage)
  - 효과: localStorage 5MB 제한 해소, IndexedDB는 수백 MB까지 저장 가능
- **VAPID 키 생성 및 설정**:
  - web-push로 VAPID 키 페어 생성
  - Public key: Vercel production 환경변수 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 설정
  - Private key: 푸시 알림 서버 구축 시 사용 (현재 클라이언트 구독만 가능)
- **빌드 테스트**: PASS (1,259페이지, TypeScript 오류 0)
- **Vercel 프로덕션 배포**: 완료



### 260406 (13차 — v2 Sprint 4: 학습 통계 + 함정필터 + QA 버그 수정)
- **학습 통계 강화**:
  - `components/stats/LawAccuracyChart.tsx` — 과목별 정답률 바 차트 + 취약 단원 Top 5
  - 마이페이지에 과목별 정답률 섹션 추가 (BarChart3 아이콘)
  - 취약 단원: 3문항 이상 풀고 정답률 60% 미만인 단원 경고 표시
- **함정유형 필터**: practice 페이지에 함정유형(8종) 필터 토글 추가
  - 클릭 시 유형 패널 오픈 → 선택 시 해당 함정이 포함된 문항만 표시
- **가상 수험생 QA 시뮬레이션**: 5명 전원 CONDITIONAL PASS
  - P0 버그 3건 발견 + 즉시 수정:
    1. **복수정답 처리** (#1122, #1163): `정답` 필드가 배열인 문항 → `isCorrectAnswer()` 유틸 생성, QuestionView/Timer/Review 전체 적용
    2. **스트릭 신규 사용자**: `lib/streak.ts` update → upsert로 변경
    3. **함정유형 필터 UX**: 첫 클릭 시 자동 적용 → 패널 오픈 후 선택 방식으로 개선
  - P1 이슈 (데이터): 선지 analysis 빈값 23문항, law_ref 누락 37선지 — 데이터 원본 문제
  - 타입 수정: `types/question.ts` 정답 필드 `number | number[]`
- **신규 파일**: `lib/answer.ts` (isCorrectAnswer, formatAnswer)
- **빌드 테스트**: PASS (1,259페이지, TypeScript 오류 0)
- **Vercel 프로덕션 배포**: 완료
- 다음: VAPID 키 생성 → 베타 초대

### 260406 (12차 — v2 Sprint 3: 오답노트 + 타이머 + 네비게이션 개편)
- **오답노트 페이지** (`app/review/page.tsx`):
  - Supabase에서 오답 기록 자동 수집 (solve_records.is_correct = false)
  - 문항별 오답 횟수 집계 + 반복 오답 강조 (3회 이상 경고 아이콘)
  - 정렬 3종 (최신순/오답횟수순/과목별) + 통계 요약 (오답문항/반복오답/취약과목)
  - 문항 클릭 → /question/[no]로 이동하여 재풀기
- **타이머 모드** (`app/timer/page.tsx`):
  - 4가지 프리셋: 미니(5문/5분), 하프(10문/12분), 실전(20문/25분), 풀세트(40문/50분)
  - 실시간 카운트다운 타이머 + 일시정지 + 잔여시간 프로그레스바
  - 문항 번호 인디케이터 (응답여부 색상 구분, 클릭으로 이동)
  - 시간 초과 시 자동 제출, 제출 시 풀이 기록 저장 (mode: "timer")
  - 결과 화면: 정답률/정답수/소요시간 + 문항별 O/X 리뷰 리스트
  - BadgeToast 연동 (뱃지 획득 시 알림)
- **네비게이션 개편**:
  - BottomNav 5탭: 홈/문항/OX/**타이머**/MY (검색→타이머로 교체)
  - 홈 퀵스타트 5열: OX/최근/랜덤/**타이머**/**오답** (3→5 확장)
  - 마이페이지 메뉴: 타이머 모드/오답노트/검색 링크 추가
- **빌드 테스트**: PASS (1,259페이지, TypeScript 오류 0)
- **Vercel 프로덕션 배포**: 완료
- 다음: VAPID 키 생성 → 학습 통계 강화 → 가상 수험생 QA

### 260406 (11차 — v2 Sprint 2: 스트릭 + 뱃지 + 푸시 인프라)
- **스트릭 시스템 구현**:
  - lib/streak.ts — KST 기반 연속 학습일 계산 (오늘/어제 비교, currentStreak/maxStreak/totalSolveDays)
  - hooks/useStreak.ts — 스트릭 로드/업데이트 훅
  - components/engagement/StreakBanner.tsx — 전체/컴팩트 모드 스트릭 배너 (불꽃 아이콘, 주간 프로그레스바)
  - components/engagement/HomeEngagement.tsx — 서버 컴포넌트(홈)에서 클라이언트 스트릭 표시
- **뱃지 시스템 구현**:
  - lib/badges.ts — 10종 뱃지 정의 (첫 풀이, 10/50/100/500문, 3/7/30일 스트릭, OX 100, 정답률 80%)
  - hooks/useBadges.ts — 뱃지 로드/달성 체크/부여 훅
  - components/engagement/BadgeGrid.tsx — 5열 뱃지 컬렉션 그리드 (획득/미획득 구분)
  - components/engagement/BadgeToast.tsx — 뱃지 획득 애니메이션 토스트 (4초 자동 닫힘)
- **통합 연동**:
  - useSolveRecord.ts — saveSolve/saveOX 시 자동으로 스트릭 업데이트 + 뱃지 체크
  - QuestionView.tsx + ox/page.tsx — BadgeToast 연동
  - mypage/page.tsx — 스트릭 배너 + 뱃지 컬렉션(showAll) + 푸시 알림 토글
  - app/page.tsx — HomeEngagement로 홈에 스트릭 표시
- **푸시 알림 인프라**:
  - app/sw.ts — push/notificationclick 이벤트 핸들러 추가 (ServiceWorkerGlobalScope)
  - hooks/usePush.ts — 구독/해제 훅 (VAPID, push_subscriptions DB 연동)
  - mypage — 학습 알림 켜기/끄기 토글 UI
- **JT 로고 변경**: 공식 CI 로고(logo_symbol.png) → Header + Login에 적용 (다크모드 invert)
- **DB 마이그레이션 스크립트**: supabase/migration_v2.sql (user_profiles 컬럼 추가 + user_badges + push_subscriptions)
- **빌드 테스트**: PASS (1,257페이지, TypeScript 오류 0)
- **Vercel 프로덕션 배포**: 완료 (gichul.jttax.co.kr)
- **⚠️ 필수**: migration_v2.sql 아직 미실행 — Supabase SQL Editor에서 실행 필요
- 다음: migration 실행 → 스트릭/뱃지 실동작 확인 → VAPID 키 생성

### 260406 (10차 — v2 디자인 업그레이드 Sprint 1 완료)
- **디자인 시스템 v2 구축**:
  - globals.css: 16개 CSS 변수 기반 테마 (indigo-600 프라이머리, 다크모드 완전 지원)
  - @theme inline으로 Tailwind 4 토큰 연결 (primary, success, danger, warning, info 등)
  - glassmorphism (.glass), gradient-hero, 커스텀 스크롤바, selection 스타일
  - 다크모드 전환 시 부드러운 150ms transition
- **framer-motion 설치** (~40KB gzip) — 선택지 탭, 해설 진입, OX 카드 슬라이드 애니메이션
- **Header 리디자인**: JT 로고 박스 + glassmorphism + 다크모드 토글 (Moon/Sun)
- **BottomNav 리디자인**: lucide 아이콘 5종 + 플로팅 스타일 (rounded-2xl + shadow-float) + 활성 인디케이터
- **홈 페이지 리디자인**: gradient-hero 배너 + lucide 아이콘 빠른시작 카드 + 카테고리 트리 시각 개선
- **문항 풀기 UX 업그레이드**:
  - 난이도 바 (5칸 컬러바), 선택지 whileTap 애니메이션
  - 해설 AnimatePresence 슬라이드, 아이콘 섹션 헤더 (Target, Lightbulb, AlertTriangle, BookOpen)
  - 학습 가이드 primary-light 배경 + 구조화 레이블
- **OX 드릴 UX 업그레이드**: AnimatePresence 카드 슬라이드, motion 프로그레스바, 완료 화면 개선
- **마이페이지 리디자인**: 프로필 카드 + 아이콘 통계 카드 (motion scale) + 메뉴 링크 스타일
- **로그인 페이지 리디자인**: JT 로고 박스 중앙 배치 + primary 포커스 링 + 새 디자인 토큰
- **practice/search 페이지**: 새 디자인 시스템 적용 (border-primary, rounded-xl, lucide 아이콘)
- **신규 파일**:
  - hooks/useTheme.ts — 다크모드 훅 (light/dark/system, localStorage 저장)
  - components/navigation/Header.tsx — 새 Header 컴포넌트 (로고+다크모드+auth)
  - layout.tsx — FOUC 방지 인라인 스크립트, suppressHydrationWarning
- **빌드 테스트**: PASS (1,257페이지, TypeScript 오류 0, 30초 컴파일)
- 다음: Vercel 프로덕션 배포 → 브라우저 실 확인

### 260406 (9차 — 카카오 로그인 E2E 완료)
- **카카오 로그인 E2E 성공**:
  - 카카오 버튼 → 카카오 계정 선택 → Supabase 인증 → /mypage 리다이렉트
  - 로그인된 사용자: 제이티 세무회계 (jjuntax@daum.net)
- **해결한 문제들**:
  1. `Database error saving new user` — handle_new_user() 트리거가 auth.users INSERT 실패 유발. 트리거 제거 + 앱에서 ensureProfile() 처리로 전환
  2. PKCE code_verifier 스토리지 문제 — implicit flow로 전환 (토큰이 URL hash로 직접 전달)
  3. Redirect URL 미등록 — Supabase URL Configuration에 `https://gichul.jttax.co.kr/auth/callback` 추가
- **코드 변경**:
  - lib/supabase.ts — flowType: 'implicit'
  - app/auth/callback/page.tsx — implicit flow 대응 (onAuthStateChange + getSession + error 처리)
  - components/auth/AuthListener.tsx — 전역 auth 감지 (루트 레이아웃에 추가)
  - hooks/useAuth.ts — ensureProfile() 추가 (트리거 대신 앱에서 프로필 자동 생성)
  - app/layout.tsx — AuthListener 컴포넌트 추가
- **Supabase 변경** (대시보드에서 수행):
  - DROP TRIGGER on_auth_user_created (handle_new_user 제거)
  - Redirect URLs에 `https://gichul.jttax.co.kr/auth/callback` 추가
- 테스트: 카카오 로그인 → /mypage 도착, 사용자명+이메일 표시 확인
- 다음: 로그아웃 테스트, 풀이 기록 저장 테스트

### 260406 (8차 — 카카오 비즈 앱 전환 + 이메일 동의항목 완료)
- **비즈 앱 전환 완료**:
  - 사업자번호 699-10-01720 (제이티 세무회계, 대표자 이현준) 등록
  - 비즈 앱 전환 성공 (본인인증 불필요 — 사업자번호만으로 완료)
  - 앱 아이콘 등록 (icon-192.png)
- **이메일 동의항목 활성화 완료**:
  - account_email: "선택 동의"로 설정
  - 동의 목적: "서비스 관련 알림 및 계정 복구"
  - KOE205 에러 원인 해결 (Supabase 기본 scope의 account_email이 이제 유효)
- **코드 수정**:
  - useAuth.ts — 명시적 scopes 파라미터 제거 (Supabase 기본 scope 사용으로 변경)
  - 이유: account_email이 활성화되어 Supabase 기본 scope가 정상 작동
- **빌드 테스트**: PASS (1,245+ 페이지 정적 생성, 오류 0)
- **Vercel 배포**: `vercel --prod` 완료
- **E2E 테스트**: 카카오 계정 선택 화면 정상 표시 확인 (KOE006 해결)
- **Redirect URI 등록**: 앱 > 플랫폼 키 > REST API 키 > 로그인 리다이렉트 URI에 Supabase 콜백 URL 등록
- 다음: 사용자가 카카오 계정 선택 → 로그인 완료 최종 확인

### 260405 (7차 — 카카오 로그인 설정 + 로그인 UI)
- **로그인/마이페이지 UI 완성**:
  - app/login/page.tsx — 카카오 로그인 + 이메일 로그인/회원가입 폼
  - app/mypage/page.tsx — 학습 통계 대시보드 (인증 필요)
  - app/auth/callback/route.ts — OAuth 콜백 핸들러
  - components/navigation/HeaderAuth.tsx — 헤더 로그인 버튼/유저 아바타
  - BottomNav에 MY 탭 추가 (5탭)
- **Supabase Kakao provider 설정 완료**:
  - REST API Key: e19cf8aef30fd43e5d1a6d83e8856bdd
  - Client Secret: TgDL05lMsb4P1OLn7cfR0SeeEgc2Fkrv
  - "Allow users without an email" 활성화
  - Kakao provider: Enabled 확인
- **카카오 개발자 콘솔 설정 완료**:
  - 카카오 로그인: ON, OpenID Connect: ON (이전에 설정됨)
  - 리다이렉트 URI: `https://xddaqkymeactyfqqfcuv.supabase.co/auth/v1/callback` 등록
  - 웹 도메인: `https://gichul.jttax.co.kr` 등록 (기본 도메인)
  - 동의항목: 닉네임(필수), 프로필사진(선택) 설정
- **코드 수정**:
  - useAuth.ts — redirectTo를 `/auth/callback`으로 수정
  - useAuth.ts — scopes에 `profile_nickname profile_image` 명시
  - next.config.ts — `turbopack: {}` 추가 (Next.js 16 빌드 호환)
- **미해결: KOE205 에러**:
  - Supabase가 기본 scope에 `account_email`을 포함 → 카카오에서 거부
  - **해결 필요: 카카오 비즈 앱 전환** (사업자 등록 or 본인인증 필요)
  - 비즈 앱 전환 후 이메일 동의항목을 "필수 동의"로 설정하면 해결
- **비즈 앱 전환 절차** (사용자 직접 수행):
  1. https://developers.kakao.com/console/app/1423766/config 접속
  2. "앱 기본 정보 > 수정" → 앱 아이콘 등록 (필수)
  3. "비즈니스 정보" 섹션 → "비즈 앱 전환" 클릭
  4. 사업자 번호 입력 (제이티세무회계) 또는 개인 본인인증
  5. 전환 완료 후 동의항목에서 이메일을 "필수 동의"로 변경
  6. gichul.jttax.co.kr/login에서 카카오 로그인 테스트
- 빌드/배포: PASS (Vercel 프로덕션 배포 완료)
- 다음: 비즈 앱 전환 → 이메일 동의항목 → 카카오 로그인 최종 테스트

### 260405 (6차 — Vercel 배포 + Supabase 연결)
- **Vercel 프로덕션 배포 완료**:
  - Vercel CLI로 직접 배포 (GitHub 불필요)
  - 빌드 성공: 1,254페이지 정적 생성, TypeScript 오류 0
  - 프로덕션 URL: https://jt-gichul.vercel.app
  - 커스텀 도메인: https://gichul.jttax.co.kr (가비아 DNS A레코드 설정)
- **Supabase 프로젝트 연결 완료**:
  - 프로젝트: xddaqkymeactyfqqfcuv (ap-northeast-2)
  - SQL 에디터로 3테이블 생성: solve_records, ox_records, user_profiles + RLS 정책
  - API 호출로 테이블 존재 확인 (3테이블 모두 count=0 정상 응답)
  - Vercel 환경변수 설정: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
  - 환경변수 적용된 프로덕션 재배포 완료
- 테스트: Supabase API 직접 호출 3테이블 정상 확인, 빌드 PASS
- 다음: 카카오 OAuth 설정 + 로그인 UI + 실사용 테스트

### 260405 (5차 — 전수조사 + UX 개선)
- **전수조사 결과 8개 개선 항목 구현**:
  - BottomNav 4탭(홈/문항/OX/검색) 하단 고정 네비게이션
  - 브레드크럼 + 뒤로가기 컨텍스트 보존 (practice + question 페이지)
  - 스켈레톤 로딩 + 에러 상태(재시도) + 빈 상태 처리
  - 정렬 5종(기본/최신순/난이도↓/난이도↑/낮은정답률순)
  - /search 페이지 신규 (Fuse.js 퍼지 검색, 6필드, 최대 30건)
  - 공유 버튼 (Web Share API + 클립보드 폴백)
  - 성능 최적화: loadAllQuestions() 메모리 캐시 (practice/OX/search 공유)
  - useSolveRecord 연결 (QuestionView + OX, Supabase 미설정 시 조용히 무시)
- **가상 수험생 QA 발견 버그 3건 수정**:
  - no 갭(966~985) 이전/다음 에러 → prevNo/nextNo props 방식으로 갭 건너뛰기
  - 지방세 근거법령 빈 박스 → 조건부 렌더링 (공란 시 섹션 숨김)
  - "정답률↑" 라벨 모호 → "낮은정답률순"으로 명확화
- **Supabase null-safe 리팩토링**: getSupabase() 팩토리 패턴, 빈 URL 시 빌드 에러 방지
- 빌드 테스트 PASS (1,254페이지, TypeScript 오류 0)
- 브라우저 테스트 PASS (홈/문항목록/문항풀기+해설/검색/OX 모두 정상)
- 가상 수험생 QA: 5명 중 4명 CONDITIONAL PASS, 1명 FAIL→버그수정 후 재검증 필요
- 산출물: BottomNav, search/page.tsx, QuestionView 개선, practice 개선, lib/questions.ts 캐시, supabase null-safe
- 다음: Vercel 배포 + Supabase 연결 + exam_index.json 동기화

### 260405 (4차 — Phase 3 완료)
- **Phase 3 완료** (PWA + SEO + 런칭 준비):
  - serwist 9.5.7 설치 + Service Worker (app/sw.ts)
  - manifest.json + PWA 아이콘 (192/512px)
  - layout.tsx에 manifest, appleWebApp 메타 추가 + 깨진 문자 수정
  - next.config.ts — withSerwist 설정 (webpack 모드 빌드)
  - SEO: app/sitemap.ts (1,248 URL), app/robots.ts
  - package.json — build 스크립트 webpack 모드 설정
  - 빌드 테스트 PASS (1,253페이지, 경고 0)
  - 가상 수험생 QA PASS (5명 전원)
- 테스트: npm run build 성공 (webpack + serwist + SSG)
- 산출물: app/sw.ts, manifest.json, icons/, sitemap.ts, robots.ts
- 다음: Vercel 배포 + Supabase 프로젝트 연결

### 260405 (3차 — Phase 2 완료)
- **Phase 2 완료** (OX 드릴 + 인증 인프라):
  - app/ox/page.tsx — OX 드릴 (4,339문항 랜덤 셔플, O/X 버튼, 키보드 단축키)
    - 실시간 스코어 (정답/오답/정답률)
    - 근거조문 표시, 원문 문항 링크
    - 키보드: O=맞다, X=틀리다, Enter/→=다음
  - lib/supabase.ts — Supabase 클라이언트
  - supabase/schema.sql — DB 스키마 (user_profiles, solve_records, ox_records + RLS)
  - hooks/useAuth.ts — 인증 훅 (카카오 OAuth + 이메일/비밀번호)
  - hooks/useSolveRecord.ts — 풀이 기록 저장 훅
  - 빌드 테스트 PASS (1,251페이지 정적 생성)
  - 브라우저 테스트 PASS (OX 드릴 정상 동작 확인)
- 테스트: npm run build 성공, OX 드릴 브라우저 실동작 확인
- 산출물: app/ox/page.tsx, lib/supabase.ts, supabase/schema.sql, hooks/useAuth.ts, hooks/useSolveRecord.ts
- 다음: Phase 3 — PWA + SEO + 최종 검증 + 런칭

### 260405 (2차 — Phase 0 + Phase 1 완료)
- **Phase 0 완료**:
  - Next.js 16.2.2 + TypeScript + Tailwind 4 + shadcn/ui 프로젝트 생성
  - shadcn 컴포넌트 7종 설치 (Button, Card, Badge, Tabs, Dialog, ScrollArea, Separator)
  - exam_questions_v3.json → 7청크 분할 (200문항×6 + 45문항×1)
  - SHA-256 전수 검증 통과 (1,245문항 × 모든 필드 완전 일치)
  - exam_index.json 이식
  - TypeScript 인터페이스 정의 (Question, Analysis, ChoiceAnalysis, ExamIndex 등)
  - 라우팅: / → /practice → /question/[no]
  - 빌드 테스트 PASS
  - 가상 수험생 QA PASS (5명 전원)
- **Phase 1 완료** (킬러 피처):
  - lib/questions.ts — 청크 기반 데이터 로딩 유틸리티
  - stores/appStore.ts — Zustand 상태관리
  - types/question.ts — ExamIndex, TopicEntry 타입 추가
  - app/page.tsx — exam_index.json 동적 트리 렌더링 (12개 법, 93소분류)
  - app/practice/page.tsx — 문항 목록 (법별/소분류별/랜덤/최근 필터)
  - app/question/[no]/page.tsx — SSG 1,245페이지 정적 생성
  - app/question/[no]/QuestionView.tsx — 문항 풀기 + 단원별기출문제급 해설
    - 선지별 O/X 판정 + 근거조문 + 함정유형(8종) + 함정설명
    - 출제의도 + 변별포인트
    - 학습가이드 (출제자가 묻는 것, 공부법, 자주 하는 실수, 우선순위)
    - 근거법령 + 키워드 태그 + 관련 문항 링크
  - 빌드 테스트 PASS (1,250페이지 정적 생성 60초)
  - 브라우저 테스트 PASS (홈/목록/문항풀기/해설 모두 정상)
  - 가상 수험생 QA PASS (5명 전원)
- 테스트: npm run build 성공, 브라우저 실동작 확인 (dev 서버)
- 산출물:
  - lib/questions.ts, stores/appStore.ts
  - app/page.tsx, app/practice/page.tsx
  - app/question/[no]/page.tsx, app/question/[no]/QuestionView.tsx
- 다음: Phase 2 — OX 드릴 (/ox) + Supabase Auth (카카오+이메일)

### 260405 (1차 — 마스터플랜)
- 완료: 마스터플랜 확정 (3회 반복 리서치 → 수험생 퍼스트 최종안)
- 결정사항:
  - MVP = 완전 무료 (유료는 추후)
  - 세법 먼저 (1,245문항 검증 데이터)
  - 단원별기출문제급 풀해설
  - 앱+웹 동시 (PWA)
  - 가상 수험생 QA로 완벽해진 후 오픈
  - 과목 확장: v1 세법 → v1.1 회계 → v2 행정법/행정학 → v3 국어/영어/한국사
- 완료: 프로젝트 폴더 생성 + CLAUDE.md + PROGRESS.md
