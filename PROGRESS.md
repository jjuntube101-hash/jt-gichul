# JT기출 진행기록

## 현재 상태
- 진행 중: Phase 0~3 + 전수조사 개선 완료 — 배포 준비 단계
- 다음 할 일: Supabase 프로젝트 생성 + 환경변수 설정 + Vercel 배포
- 남은 이슈: exam_index.json 카운트 동기화(1,225→1,245), OX→원문 복귀 시 진행 소실

## 작업 이력

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
