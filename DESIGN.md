# JT기출 — DESIGN.md

> AI 에이전트가 UI 코드를 작성할 때 참조하는 디자인 규칙서.
> awesome-design-md 9-섹션 포맷 기반.

---

## 1. Visual Theme

**한줄 정의**: 차분한 인디고 + 글래스모피즘. 수험생이 오래 보아도 피로하지 않은 학습 도구.

| 속성 | 값 |
|------|-----|
| 톤 | Professional & Calm — 학원 앱이 아닌 "개인 과외 노트" 느낌 |
| 밀도 | 모바일 퍼스트, 정보 밀도 중간. 카드 사이 여백 넉넉히 |
| 깊이 | 글래스모피즘 헤더/네비게이션, 카드는 미세 그림자 |
| 다크모드 | 완전 지원. Slate 계열 배경(#0f172a). 밤 공부 최적화 |

---

## 2. Colors

### Primary Palette
| Token | Light | Dark | 용도 |
|-------|-------|------|------|
| `--primary` | `#4f46e5` (Indigo 600) | `#818cf8` (Indigo 400) | CTA 버튼, 액티브 상태, 링크 |
| `--primary-hover` | `#4338ca` | `#a5b4fc` | 호버 |
| `--primary-light` | `#eef2ff` | `#1e1b4b` | 선택된 카드 배경, 뱃지 배경 |
| `--primary-muted` | `#c7d2fe` | `#3730a3` | 텍스트 선택, 비활성 강조 |

### Surfaces
| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#f8fafc` | `#0f172a` |
| `--foreground` | `#0f172a` | `#f1f5f9` |
| `--card` | `#ffffff` | `#1e293b` |
| `--card-foreground` | `#0f172a` | `#f1f5f9` |
| `--muted` | `#f1f5f9` | `#1e293b` |
| `--muted-foreground` | `#64748b` | `#94a3b8` |
| `--border` | `#e2e8f0` | `#334155` |

### Semantic (정답/오답/경고/정보)
| Token | Light | Dark | 용도 |
|-------|-------|------|------|
| `--success` / `--success-light` | `#059669` / `#ecfdf5` | `#34d399` / `#064e3b` | 정답, 마스터, 완료 |
| `--danger` / `--danger-light` | `#dc2626` / `#fef2f2` | `#f87171` / `#7f1d1d` | 오답, 삭제, 위험 |
| `--warning` / `--warning-light` | `#d97706` / `#fffbeb` | `#fbbf24` / `#78350f` | 복습 필요, 주의 |
| `--info` / `--info-light` | `#2563eb` / `#eff6ff` | `#60a5fa` / `#1e3a5f` | 힌트, 부가 정보 |

### 규칙
- Tailwind 하드코딩 색상 (`text-blue-500`, `bg-red-100` 등) 사용 금지
- 항상 시맨틱 토큰 사용 (`text-primary`, `bg-danger-light` 등)
- `globals.css`의 `@theme inline` 블록에서 Tailwind v4 매핑 정의

---

## 3. Typography

| 요소 | 폰트 | 크기 | 굵기 | 색상 |
|------|------|------|------|------|
| **본문** | Geist Sans | `text-sm` (14px) | normal | `foreground` |
| **제목 (페이지)** | Geist Sans | `text-lg` ~ `text-xl` | `font-bold` | `foreground` |
| **제목 (카드)** | Geist Sans | `text-base` | `font-semibold` | `foreground` |
| **라벨/캡션** | Geist Sans | `text-xs` (12px) | `font-medium` | `muted-foreground` |
| **네비 라벨** | Geist Sans | `text-[10px]` | `font-medium` | `muted-foreground` / `primary` |
| **코드/조문번호** | Geist Mono | `text-xs` | `font-mono` | `foreground` |
| **숫자 (통계)** | Geist Sans | `text-2xl` ~ `text-3xl` | `font-bold` | `primary` or semantic |

### 규칙
- 폰트 사이즈 4단계만: `text-xs`, `text-sm`, `text-base`, `text-lg`~`text-xl`
- `text-[10px]`은 네비게이션 라벨에만 허용
- 줄 간격: Tailwind 기본 (`leading-normal`). 본문은 `leading-relaxed` 허용

---

## 4. Components

### Card
```
rounded-xl border border-border bg-card shadow-sm
padding: p-3 (소형) | px-4 py-3 (중형) | p-6 (대형/shadcn Card)
```
- 카드 안의 아이콘 컨테이너: `h-9 w-9 rounded-xl` + 시맨틱 라이트 배경
- 카드 내부 간격: `gap-1.5` (아이콘+텍스트) / `gap-2` (요소 간)
- shadcn `Card` 컴포넌트: `components/ui/card.tsx` (CardHeader, CardTitle, CardContent, CardFooter)

### Button (shadcn/ui — `components/ui/button.tsx`)
| Variant | 용도 |
|---------|------|
| `default` (primary) | 주요 CTA — "풀기 시작", "저장" |
| `outline` | 보조 액션 — "건너뛰기", "다음에" |
| `ghost` | 아이콘 버튼, 인라인 액션 |
| `link` | 텍스트 링크 |
| `destructive` | 삭제, 초기화 |

Size: `xs` / `sm` / `default` / `lg` / `icon` / `icon-xs` / `icon-sm` / `icon-lg`

### Badge (`components/ui/badge.tsx`)
- `rounded-full` 기본
- 시맨틱 색상: 정답=success, 오답=danger, 법명=primary, 함정유형=warning
- Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`

### Interactive States
- 호버: `hover:bg-muted` (고스트) / `hover:bg-primary-hover` (primary)
- 포커스: `focus-visible:ring-[3px] focus-visible:ring-ring/50`
- 액티브 네비: `text-primary` + `scale-110` + 상단 도트 인디케이터
- 트랜지션: `transition-colors` 기본, 150ms cubic-bezier(0.4, 0, 0.2, 1) (글로벌)

---

## 5. Layout

### Page Structure
```
[Header: h-14, glass, sticky top, z-50]
  └─ max-w-2xl centered, px-4

[Main: max-w-2xl, px-4 py-6 pb-24]
  └─ sections: space-y-6

[Footer: border-t border-border, bg-card, text-xs muted-foreground]

[BottomNav: fixed bottom, glass, rounded-2xl, z-50]
  └─ max-w-md centered, safe-area-bottom
```

### Spacing System
| 위치 | 값 |
|------|-----|
| 아이콘+텍스트 | `gap-1.5` (6px) |
| 그리드 갭 | `gap-2` (8px) ~ `gap-3` (12px) |
| 페이지 좌우 패딩 | `px-4` (16px) |
| 섹션 간 | `space-y-6` (24px) |
| 하단 네비 여백 | `pb-24` (96px) |

### Grid Patterns
- 메인 퀵 액션: `grid-cols-4 gap-2`
- 설정/프로필: `grid-cols-3 gap-2`
- 카테고리: `grid-cols-2 gap-3`

### Layout Constants (`globals.css`)
```css
--header-height: 3.5rem;
--bottom-nav-height: 4rem;
--max-width: 40rem;    /* 640px */
--radius: 0.75rem;
```

---

## 6. Depth & Elevation

| 레벨 | 토큰 | 용도 |
|------|------|------|
| 0 | 없음 | 배경, 인라인 요소 |
| 1 | `shadow-sm` | 카드 기본 |
| 2 | `shadow` | 호버된 카드 |
| 3 | `shadow-md` | 드롭다운, 팝오버 |
| 4 | `shadow-lg` | 모달, 바텀시트 |
| 5 | `shadow-float` | 토스트, 플로팅 버튼 |

### Glassmorphism (`.glass`)
```css
background: rgba(255, 255, 255, 0.8);      /* dark: rgba(15, 23, 42, 0.85) */
backdrop-filter: blur(12px) saturate(180%);
```
- **헤더, 하단 네비게이션에만 사용**
- 카드나 모달에는 사용하지 않음

### Hero Gradient (`.gradient-hero`)
```css
background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%);
/* dark: #3730a3 → #5b21b6 → #1e40af */
```

---

## 7. Don'ts

| 금지 | 이유 |
|------|------|
| Tailwind 하드코딩 색상 | 다크모드 깨짐. 항상 CSS 토큰 사용 |
| `rounded-sm`, `rounded-md` 카드 | 카드는 `rounded-xl`, 버튼은 `rounded-md`(shadcn 기본). 혼재 금지 |
| `.gradient-hero` 외 그라데이션 | 히어로 섹션 전용 |
| 3줄 이상 텍스트 카드 | 모바일에서 스크롤 유발. 2줄 이내 or 접기 |
| 과도한 애니메이션 | 학습 집중 방해. 진입/퇴장만 Framer Motion |
| 감정적 이모지/일러스트 | "과외 선생님" 톤. 팩트 중심, 건조. 아이콘(Lucide)만 |
| `!important` | 글로벌 CSS 오염. `[data-no-transition]` 제외 금지 |
| 커스텀 스크롤바 변경 | 4px thin 스크롤바 유지 |

---

## 8. Responsive

| Breakpoint | 변화 |
|-----------|------|
| 기본 (mobile) | `max-w-2xl`, `px-4`, `grid-cols-2~4` |
| `sm:` (640px) | 거의 변화 없음 — 모바일 최적화 앱 |
| `md:` (768px) | 센터 정렬, 양쪽 여백 증가 |
| `lg:` 이상 | 사용하지 않음 |

### Touch Target
- 최소 44x44px (`h-10 w-10` 이상)
- 선지 버튼: 전체 너비, `py-3` 이상
- 하단 네비: 아이콘 영역 충분한 패딩

### PWA
- `safe-area-inset-bottom` 대응 (`.safe-area-bottom`)
- 테마 컬러: `#4f46e5`
- Apple Web App capable

---

## 9. Agent Prompt Guide

### 새 페이지 생성 시
```tsx
// 1. 컨테이너: space-y-6
<div className="space-y-6">
  {/* 2. 섹션 헤더 */}
  <h1 className="text-lg font-bold">페이지 제목</h1>

  {/* 3. 카드 그리드 */}
  <div className="grid grid-cols-2 gap-3">
    <div className="rounded-xl border border-border bg-card p-3">
      ...
    </div>
  </div>
</div>
```

### 아이콘 카드 패턴
```tsx
<div className="rounded-xl border border-border bg-card p-4 shadow-sm">
  <div className="flex items-center gap-2">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light">
      <IconName className="h-4 w-4 text-primary" />
    </div>
    <div>
      <p className="text-sm font-semibold">제목</p>
      <p className="text-xs text-muted-foreground">설명</p>
    </div>
  </div>
</div>
```

### 아이콘 규칙
- 라이브러리: `lucide-react` only
- 크기: `h-4 w-4` (인라인) / `h-5 w-5` (네비) / `h-3.5 w-3.5` (뱃지 내)
- strokeWidth: 기본 2, 강조 2.5

### 애니메이션 규칙
- 페이지 진입: `motion.div` + `initial={{ opacity: 0, y: 10 }}` + `animate={{ opacity: 1, y: 0 }}`
- 리스트 아이템: `transition={{ delay: index * 0.05 }}`
- 토스트/모달: `AnimatePresence` + exit 애니메이션
- 프로그레스 바: `transition-all duration-500`
- **금지**: 반복 애니메이션(pulse, bounce), 과도한 3D 효과

### shadcn/ui 컴포넌트 경로
```
components/ui/button.tsx   — Button (cva variants)
components/ui/card.tsx     — Card, CardHeader, CardTitle, CardContent, CardFooter
components/ui/badge.tsx    — Badge (cva variants)
components/ui/tabs.tsx     — Tabs
components/ui/dialog.tsx   — Dialog (모달)
components/ui/scroll-area.tsx
components/ui/separator.tsx
```
