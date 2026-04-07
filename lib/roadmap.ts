/**
 * 학습 로드맵 데이터 + 로직
 *
 * 9급 12주 / 7급 16주 커리큘럼.
 * exam_index.json의 법률명·소분류를 기반으로 주차별 학습 범위를 정의하고,
 * 풀이 기록(Supabase solve_records)과 대조해 진행률을 계산한다.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoadmapWeek {
  week: number;
  title: string;
  laws: string[];
  topics: string[];
  focus: string;
  targetQuestions: number;
}

export interface RoadmapConfig {
  totalWeeks: number;
  weeks: RoadmapWeek[];
}

export interface WeekProgress {
  total: number;
  solved: number;
  rate: number; // 0~100
}

// ---------------------------------------------------------------------------
// exam_index.json에서 사용하는 법률명 상수
// (practice page 라우팅에도 동일하게 쓰임)
// ---------------------------------------------------------------------------

const LAW = {
  국세기본법: "국세기본법",
  소득세법: "소득세법",
  법인세법: "법인세법",
  부가가치세법: "부가가치세법",
  상증세법: "상속세 및 증여세법",
  국세징수법: "국세징수법",
  조세범처벌법: "조세법 총론", // exam_index에 별도 없으므로 총론과 매핑
  지방세법: "지방세법",
  지방세기본법: "지방세기본법",
  지방세특례제한법: "지방세특례제한법",
  지방세징수법: "지방세징수법",
  개별소비세법: "종합부동산세법", // exam_index에 개별소비세 없음; 종부세로 대체
} as const;

// ---------------------------------------------------------------------------
// 9급 커리큘럼 (12주)
// ---------------------------------------------------------------------------

const ROADMAP_9: RoadmapWeek[] = [
  {
    week: 1,
    title: "국세기본법 (1)",
    laws: [LAW.국세기본법],
    topics: ["총칙", "과세", "납세의무", "납세의무의 확장", "국세 부과와 세법 적용"],
    focus: "세법의 기초 골격 — 과세요건·납세의무 성립과 확정",
    targetQuestions: 45,
  },
  {
    week: 2,
    title: "국세기본법 (2)",
    laws: [LAW.국세기본법],
    topics: [
      "납세자의 권리",
      "심사와 심판",
      "국세환급금과 국세환급가산금",
      "국세와 일반채권의 관계",
      "보칙",
    ],
    focus: "납세자 권리·불복·환급 — 절차법 핵심",
    targetQuestions: 40,
  },
  {
    week: 3,
    title: "소득세법 (1)",
    laws: [LAW.소득세법],
    topics: ["총칙", "금융소득", "근로소득", "사업소득"],
    focus: "소득세 체계 + 종합소득 4대 소득",
    targetQuestions: 40,
  },
  {
    week: 4,
    title: "소득세법 (2)",
    laws: [LAW.소득세법],
    topics: ["연금소득 및 기타소득", "소득금액 계산의 특례", "종합소득세의 계산"],
    focus: "소득금액 계산 + 세액 산출",
    targetQuestions: 35,
  },
  {
    week: 5,
    title: "소득세법 (3)",
    laws: [LAW.소득세법],
    topics: ["양도소득세", "퇴직소득세", "납세절차"],
    focus: "양도소득세 집중 + 납세절차",
    targetQuestions: 25,
  },
  {
    week: 6,
    title: "법인세법 (1)",
    laws: [LAW.법인세법],
    topics: [
      "총칙",
      "법인세의 계산구조",
      "익금과 익금불산입",
      "손금과 손금불산입",
      "손익의 귀속시기",
    ],
    focus: "법인세 계산구조 + 익금·손금 판단",
    targetQuestions: 40,
  },
  {
    week: 7,
    title: "법인세법 (2)",
    laws: [LAW.법인세법],
    topics: [
      "감가상각비",
      "충당금과 준비금",
      "부당행위계산의 부인",
      "기업업무추진비와 기부금",
      "자산의 취득가액 및 자산·부채의 평가",
      "과세표준의 계산",
      "산출세액 및 차감납부세액의 계산",
      "지급이자 손금불산입",
      "의제배당",
      "법인세 납세절차",
      "기타 법인세",
      "연결납세제도",
      "합병 및 분할 등에 관한 특례",
    ],
    focus: "세무조정 핵심 + 기타항목 마무리",
    targetQuestions: 45,
  },
  {
    week: 8,
    title: "부가가치세법 (1)",
    laws: [LAW.부가가치세법],
    topics: ["총칙", "과세거래", "공급시기 및 공급장소", "영세율과 면세"],
    focus: "부가세 기본개념 + 과세거래 판단",
    targetQuestions: 35,
  },
  {
    week: 9,
    title: "부가가치세법 (2)",
    laws: [LAW.부가가치세법],
    topics: [
      "과세표준과 세액의 계산",
      "겸영사업자의 안분 계산",
      "신고와 납부 등",
      "결정·경정·징수와 환급",
      "간이과세",
    ],
    focus: "매입세액 공제·불공제 + 간이과세",
    targetQuestions: 45,
  },
  {
    week: 10,
    title: "상증세법 + 기타 국세",
    laws: [LAW.상증세법, LAW.국세징수법],
    topics: [
      "상속세",
      "증여세",
      "납세절차",
      "재산의 평가",
      "강제징수",
      "납부고지 등",
      "보칙",
      "총칙",
      "관련 법령 폐지",
    ],
    focus: "상속세·증여세 핵심 + 국세징수법 속성",
    targetQuestions: 50,
  },
  {
    week: 11,
    title: "지방세 (1) — 세목",
    laws: [LAW.지방세법],
    topics: [
      "취득세",
      "등록면허세",
      "재산세",
      "지방소득세",
      "주민세",
      "자동차세",
      "담배소비세",
      "지방교육세",
      "지방소비세",
      "지역자원시설세",
      "레저세",
    ],
    focus: "지방세법 각 세목 — 취득세·재산세 비중 높음",
    targetQuestions: 35,
  },
  {
    week: 12,
    title: "지방세 (2) — 절차법",
    laws: [LAW.지방세기본법, LAW.지방세특례제한법, LAW.지방세징수법],
    topics: [
      "총칙",
      "납세의무",
      "부과징수",
      "납세자권리",
      "불복",
      "신고",
      "가산세",
      "납세담보",
      "환급",
      "범칙",
      "감면",
      "총칙보칙",
      "징수",
      "체납처분",
    ],
    focus: "지방세 기본법·특례·징수법 — 절차·감면 집중",
    targetQuestions: 25,
  },
  {
    week: 13,
    title: "종합 복습 + 약점 보충",
    laws: [],
    topics: [],
    focus: "전 과목 모의고사 + 틀린 문항 집중 복습",
    targetQuestions: 50,
  },
];

// ---------------------------------------------------------------------------
// 7급 커리큘럼 (16주)
// ---------------------------------------------------------------------------

const ROADMAP_7: RoadmapWeek[] = [
  {
    week: 1,
    title: "국세기본법 (1)",
    laws: [LAW.국세기본법],
    topics: ["총칙", "과세", "납세의무", "납세의무의 확장", "국세 부과와 세법 적용"],
    focus: "과세요건·납세의무 — 7급 지분 높은 심화 논점",
    targetQuestions: 45,
  },
  {
    week: 2,
    title: "국세기본법 (2)",
    laws: [LAW.국세기본법],
    topics: [
      "납세자의 권리",
      "심사와 심판",
      "국세환급금과 국세환급가산금",
      "국세와 일반채권의 관계",
      "보칙",
    ],
    focus: "불복절차·환급·우선권 — 7급 빈출 심화",
    targetQuestions: 40,
  },
  {
    week: 3,
    title: "소득세법 (1)",
    laws: [LAW.소득세법],
    topics: ["총칙", "금융소득", "사업소득"],
    focus: "소득 분류 + 사업소득 필요경비 심화",
    targetQuestions: 30,
  },
  {
    week: 4,
    title: "소득세법 (2)",
    laws: [LAW.소득세법],
    topics: ["근로소득", "연금소득 및 기타소득", "소득금액 계산의 특례"],
    focus: "근로·연금·기타소득 + 결손금 이월공제",
    targetQuestions: 30,
  },
  {
    week: 5,
    title: "소득세법 (3)",
    laws: [LAW.소득세법],
    topics: ["종합소득세의 계산", "납세절차"],
    focus: "세액공제·감면 + 종합소득 확정신고",
    targetQuestions: 25,
  },
  {
    week: 6,
    title: "소득세법 (4)",
    laws: [LAW.소득세법],
    topics: ["양도소득세", "퇴직소득세"],
    focus: "양도소득세 비과세·감면·세율 심화",
    targetQuestions: 25,
  },
  {
    week: 7,
    title: "법인세법 (1)",
    laws: [LAW.법인세법],
    topics: [
      "총칙",
      "법인세의 계산구조",
      "익금과 익금불산입",
      "손금과 손금불산입",
    ],
    focus: "세무조정 기초 — 익금·손금 판단",
    targetQuestions: 35,
  },
  {
    week: 8,
    title: "법인세법 (2)",
    laws: [LAW.법인세법],
    topics: ["손익의 귀속시기", "감가상각비", "충당금과 준비금"],
    focus: "귀속시기 + 감가상각 + 충당금 심화",
    targetQuestions: 30,
  },
  {
    week: 9,
    title: "법인세법 (3)",
    laws: [LAW.법인세법],
    topics: [
      "부당행위계산의 부인",
      "기업업무추진비와 기부금",
      "자산의 취득가액 및 자산·부채의 평가",
      "지급이자 손금불산입",
      "의제배당",
      "과세표준의 계산",
      "산출세액 및 차감납부세액의 계산",
      "법인세 납세절차",
      "기타 법인세",
      "연결납세제도",
      "합병 및 분할 등에 관한 특례",
    ],
    focus: "부당행위계산 + 기타항목 마무리",
    targetQuestions: 40,
  },
  {
    week: 10,
    title: "부가가치세법 (1)",
    laws: [LAW.부가가치세법],
    topics: ["총칙", "과세거래", "공급시기 및 공급장소", "영세율과 면세"],
    focus: "부가세 기본 + 과세거래·영세율 판단",
    targetQuestions: 35,
  },
  {
    week: 11,
    title: "부가가치세법 (2)",
    laws: [LAW.부가가치세법],
    topics: [
      "과세표준과 세액의 계산",
      "겸영사업자의 안분 계산",
      "신고와 납부 등",
      "결정·경정·징수와 환급",
      "간이과세",
    ],
    focus: "매입세액 공제 심화 + 신고·환급",
    targetQuestions: 45,
  },
  {
    week: 12,
    title: "상속세 및 증여세법",
    laws: [LAW.상증세법],
    topics: ["상속세", "증여세", "납세절차", "재산의 평가"],
    focus: "상증세 전 범위 — 과세가액·세액공제",
    targetQuestions: 25,
  },
  {
    week: 13,
    title: "기타 국세",
    laws: [LAW.국세징수법],
    topics: [
      "강제징수",
      "납부고지 등",
      "보칙",
      "총칙",
      "관련 법령 폐지",
    ],
    focus: "국세징수법 핵심 — 체납처분·압류",
    targetQuestions: 35,
  },
  {
    week: 14,
    title: "지방세 (1) — 세목",
    laws: [LAW.지방세법],
    topics: [
      "취득세",
      "등록면허세",
      "재산세",
      "지방소득세",
      "주민세",
      "자동차세",
      "담배소비세",
      "지방교육세",
      "지방소비세",
      "지역자원시설세",
      "레저세",
    ],
    focus: "지방세법 각 세목 — 취득세·재산세 비중 높음",
    targetQuestions: 35,
  },
  {
    week: 15,
    title: "지방세 (2) — 절차법",
    laws: [LAW.지방세기본법, LAW.지방세특례제한법, LAW.지방세징수법],
    topics: [
      "총칙",
      "납세의무",
      "부과징수",
      "납세자권리",
      "불복",
      "신고",
      "가산세",
      "납세담보",
      "환급",
      "범칙",
      "감면",
      "총칙보칙",
      "징수",
      "체납처분",
    ],
    focus: "지방세 기본법·특례·징수법 — 절차·감면 심화",
    targetQuestions: 25,
  },
  {
    week: 16,
    title: "종합 복습 (1)",
    laws: [],
    topics: [],
    focus: "국세 전범위 모의고사 + 오답 분석",
    targetQuestions: 50,
  },
  {
    week: 17,
    title: "종합 복습 (2)",
    laws: [],
    topics: [],
    focus: "지방세 + 전범위 파이널 테스트",
    targetQuestions: 50,
  },
];

// ---------------------------------------------------------------------------
// 회계 커리큘럼 (8주, 9급 전용)
// ---------------------------------------------------------------------------

const ACC = {
  회계원리: "회계원리",
  재무회계자산: "재무회계-자산",
  재무회계부채자본: "재무회계-부채자본재무보고",
  원가관리회계: "원가관리회계",
  정부회계: "정부회계",
} as const;

const ROADMAP_ACCOUNTING: RoadmapWeek[] = [
  {
    week: 1,
    title: "회계원리",
    laws: [ACC.회계원리],
    topics: ["회계의기초", "복식부기", "개념체계", "회계순환과정"],
    focus: "복식부기·분개·시산표 — 회계의 뼈대",
    targetQuestions: 50,
  },
  {
    week: 2,
    title: "재무회계 — 자산 (1)",
    laws: [ACC.재무회계자산],
    topics: ["현금및현금성자산", "수취채권", "재고자산"],
    focus: "현금·채권·재고 — 유동자산 핵심",
    targetQuestions: 50,
  },
  {
    week: 3,
    title: "재무회계 — 자산 (2)",
    laws: [ACC.재무회계자산],
    topics: ["유형자산", "무형자산", "투자부동산", "금융자산"],
    focus: "유형·무형·금융자산 — 비유동자산 집중",
    targetQuestions: 50,
  },
  {
    week: 4,
    title: "재무회계 — 부채·자본",
    laws: [ACC.재무회계부채자본],
    topics: ["유동부채", "사채", "충당부채·우발부채", "자본", "리스"],
    focus: "사채·충당부채·자본 — 대차대조표 우측",
    targetQuestions: 45,
  },
  {
    week: 5,
    title: "재무회계 — 수익·재무보고",
    laws: [ACC.재무회계부채자본],
    topics: ["수익인식", "현금흐름표", "회계변경과오류수정", "재무제표분석", "주당이익", "법인세회계·특수"],
    focus: "수익인식·현금흐름표 — 고빈출 영역",
    targetQuestions: 45,
  },
  {
    week: 6,
    title: "원가관리회계 (1)",
    laws: [ACC.원가관리회계],
    topics: ["원가회계총론", "개별원가계산", "종합원가계산", "결합원가", "원가배분"],
    focus: "원가 계산 체계 — 개별·종합·결합",
    targetQuestions: 40,
  },
  {
    week: 7,
    title: "원가관리회계 (2) + 정부회계",
    laws: [ACC.원가관리회계, ACC.정부회계],
    topics: ["ABC", "CVP분석", "표준원가", "전부vs변동원가", "의사결정", "지방재무제표", "국가재무제표", "종합비교", "총론"],
    focus: "관리회계 의사결정 + 정부회계 전 범위",
    targetQuestions: 40,
  },
  {
    week: 8,
    title: "종합 복습 + 모의고사",
    laws: [],
    topics: [],
    focus: "전 범위 모의고사 + 약점 집중 복습",
    targetQuestions: 50,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SubjectType = "tax" | "accounting";

/**
 * 시험 목표 + 과목에 맞는 로드맵 반환
 */
export function getRoadmap(
  examTarget: "9급" | "7급",
  subject: SubjectType = "tax",
): RoadmapConfig {
  if (subject === "accounting") {
    return {
      totalWeeks: ROADMAP_ACCOUNTING.length,
      weeks: ROADMAP_ACCOUNTING,
    };
  }
  const weeks = examTarget === "9급" ? ROADMAP_9 : ROADMAP_7;
  return {
    totalWeeks: weeks.length,
    weeks,
  };
}

/**
 * 현재 주차 계산 (1-based).
 *
 * 시험일(examDate)이 있으면 시험일 역산:
 *   학습 시작일 = examDate - (totalWeeks * 7)일
 *   현재 주차 = (오늘 - 시작일) / 7 + 1
 *
 * 시험일이 없으면 startDate(온보딩 완료일)부터 순차 계산.
 *
 * 아직 시작 전이면 1(첫 주 표시), 마지막 주 이후면 totalWeeks.
 */
export function getCurrentWeek(
  startDate: string,
  totalWeeks: number,
  examDate?: string | null,
): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let start: Date;

  if (examDate && examDate.trim()) {
    const exam = new Date(examDate + "T00:00:00");
    // 유효한 날짜인지 확인
    if (isNaN(exam.getTime())) {
      start = new Date(startDate);
    } else {
      // 시험일 역산: 시험일에서 totalWeeks만큼 뒤로
      start = new Date(exam.getTime() - totalWeeks * 7 * 24 * 60 * 60 * 1000);
    }
  } else {
    start = new Date(startDate);
  }

  // startDate도 유효하지 않으면 1주차 반환
  if (isNaN(start.getTime())) return 1;
  start.setHours(0, 0, 0, 0);

  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return 1; // 시작 전이면 1주차 표시

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;

  return Math.min(Math.max(week, 1), totalWeeks);
}

/**
 * 해당 주차 토픽에 대한 풀이 진행률.
 *
 * solvedQuestionNos: 사용자가 풀어본 question no 집합
 * allQuestions: 전체 문제 목록 (대분류·소분류 매핑용)
 *
 * 종합 복습 주차(topics 빈 배열)에서는 전체 문항 대비 진행률을 표시한다.
 */
export function getWeekProgress(
  week: RoadmapWeek,
  examTarget: "9급" | "7급",
  solvedQuestionNos: Set<number>,
  allQuestions: { no: number; 대분류: string; 소분류: string; 직급: string }[],
): WeekProgress {
  // 종합 복습 주차
  if (week.topics.length === 0) {
    const gradeQuestions = allQuestions.filter(
      (q) => q.직급 === examTarget || q.직급 === "공통",
    );
    const total = Math.min(week.targetQuestions, gradeQuestions.length);
    const solved = gradeQuestions.filter((q) => solvedQuestionNos.has(q.no)).length;
    return {
      total,
      solved: Math.min(solved, total),
      rate: total > 0 ? Math.round((Math.min(solved, total) / total) * 100) : 0,
    };
  }

  // 특정 토픽 주차: 해당 토픽에 속하는 문항 필터링
  const topicSet = new Set(week.topics);
  const weekQuestions = allQuestions.filter(
    (q) => topicSet.has(q.소분류) && week.laws.includes(q.대분류),
  );
  const total = weekQuestions.length;
  const solved = weekQuestions.filter((q) => solvedQuestionNos.has(q.no)).length;

  return {
    total,
    solved,
    rate: total > 0 ? Math.round((solved / total) * 100) : 0,
  };
}

/**
 * 해당 주차의 첫 번째 법률 이름을 practice 라우트용 파라미터로 반환
 */
export function getWeekPracticeHref(week: RoadmapWeek): string {
  if (week.laws.length === 0) {
    return "/practice?filter=random";
  }
  return `/practice?law=${encodeURIComponent(week.laws[0])}`;
}
