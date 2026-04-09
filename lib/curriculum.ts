/**
 * 커리큘럼 시스템 — 학습 로드맵 데이터 + 로직
 *
 * roadmap.ts를 대체하는 확장 버전.
 * 과목별(tax/accounting/korean/english/constitution/economics) 커리큘럼을 제공하며,
 * 기존 getRoadmap / getCurrentWeek / getWeekProgress / getWeekPracticeHref API를
 * 하위 호환성을 유지하며 그대로 제공한다.
 *
 * 데이터는 이 파일에 하드코딩 (Next.js 서버 컴포넌트에서 public/ fetch 불가).
 * public/data/curriculum/*.json 은 향후 관리자 편집용 미러.
 */

import type { SubjectType } from '@/types/question';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CurriculumWeek {
  week: number;
  title: string;
  laws: string[];           // for tax/accounting - maps to exam_index 대분류
  topics: string[];         // maps to exam_index 소분류
  focus: string;
  targetQuestions: number;
  lectureRef?: string;      // optional reference like "이훈엽 올인원1 1~8강"
}

export interface CurriculumStage {
  name: string;             // '기본이론', '심화', '문풀', '파이널'
  weeks: CurriculumWeek[];
}

export interface CurriculumData {
  subject: SubjectType;
  examTarget: '9급' | '7급';
  totalWeeks: number;
  source: string;
  stages: CurriculumStage[];
}

export interface CurriculumPreset {
  id: string;           // e.g. 'hackers_tax_9'
  subject: SubjectType;
  examTarget: '9급' | '7급';
  academy: string;      // '해커스', '공단기', '넥스트', '직접설정'
  teacher: string;      // '이현준', '이훈엽', etc.
  label: string;        // 사용자에게 보여줄 이름: '해커스 이현준 세법'
  totalWeeks: number;
  stages: CurriculumStage[];
}

export interface WeekProgress {
  total: number;
  solved: number;
  rate: number; // 0~100
}

export interface MonthPlan {
  month: string;
  weeks: CurriculumWeek[];
  stage: string;
}

export interface WeekPlan {
  weekNum: number;
  subjects: CurriculumWeek;
}

// Backward compat aliases
export type RoadmapWeek = CurriculumWeek;
export type RoadmapConfig = { totalWeeks: number; weeks: CurriculumWeek[] };

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

const ACC = {
  회계원리: "회계원리",
  재무회계자산: "재무회계-자산",
  재무회계부채자본: "재무회계-부채자본재무보고",
  원가관리회계: "원가관리회계",
  정부회계: "정부회계",
} as const;

// ---------------------------------------------------------------------------
// 세법 9급 커리큘럼 (12주 + 복습 1주 = 13주)
// ---------------------------------------------------------------------------

const TAX_9_WEEKS: CurriculumWeek[] = [
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
// 세법 7급 커리큘럼 (16주 + 복습 1주 = 17주)
// ---------------------------------------------------------------------------

const TAX_7_WEEKS: CurriculumWeek[] = [
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

const ACCOUNTING_9_WEEKS: CurriculumWeek[] = [
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
// 국어 9급 커리큘럼 (12주)
// ---------------------------------------------------------------------------

const KOREAN_9_WEEKS: CurriculumWeek[] = [
  // 문법 (4주)
  { week: 1, title: "국어 문법 (1)", laws: [], topics: ["음운론", "형태론"], focus: "음운 체계·변동, 형태소·단어 구조", targetQuestions: 30 },
  { week: 2, title: "국어 문법 (2)", laws: [], topics: ["통사론", "의미론"], focus: "문장 구조·호응, 의미 관계", targetQuestions: 30 },
  { week: 3, title: "국어 문법 (3)", laws: [], topics: ["맞춤법", "표준어규정"], focus: "한글 맞춤법·표준어 규정 핵심", targetQuestions: 30 },
  { week: 4, title: "국어 문법 (4)", laws: [], topics: ["외래어표기법", "로마자표기법", "언어예절"], focus: "외래어·로마자 표기 + 높임법·언어예절", targetQuestions: 25 },
  // 문학 (3주)
  { week: 5, title: "고전문학", laws: [], topics: ["고전시가", "고전산문"], focus: "향가·고려가요·시조·가사·고전소설", targetQuestions: 30 },
  { week: 6, title: "현대문학 (1)", laws: [], topics: ["현대시"], focus: "현대시 감상·표현기법·주요 작품", targetQuestions: 30 },
  { week: 7, title: "현대문학 (2)", laws: [], topics: ["현대소설", "현대수필·희곡"], focus: "현대소설·수필·희곡 분석", targetQuestions: 30 },
  // 비문학/독해 (3주)
  { week: 8, title: "비문학 독해 (1)", laws: [], topics: ["독해원리", "글의구조"], focus: "중심내용 파악·글의 전개 방식", targetQuestions: 30 },
  { week: 9, title: "비문학 독해 (2)", laws: [], topics: ["추론", "비판적읽기"], focus: "추론·비판적 읽기·논리적 오류", targetQuestions: 30 },
  { week: 10, title: "비문학 독해 (3)", laws: [], topics: ["실용문", "논증"], focus: "실용문 분석·논증 구조", targetQuestions: 25 },
  // 어휘/한자 (2주)
  { week: 11, title: "어휘·한자 (1)", laws: [], topics: ["어휘", "관용표현"], focus: "어휘력·관용 표현·속담·고사성어", targetQuestions: 30 },
  { week: 12, title: "어휘·한자 (2)", laws: [], topics: ["한자", "한자성어"], focus: "한자 음훈·한자 성어 집중", targetQuestions: 30 },
];

// ---------------------------------------------------------------------------
// 영어 9급 커리큘럼 (12주)
// ---------------------------------------------------------------------------

const ENGLISH_9_WEEKS: CurriculumWeek[] = [
  // 어휘 (2주)
  { week: 1, title: "어휘 (1)", laws: [], topics: ["기본어휘", "동의어·반의어"], focus: "빈출 어휘 500 + 동의어·반의어", targetQuestions: 30 },
  { week: 2, title: "어휘 (2)", laws: [], topics: ["숙어", "생활영어"], focus: "빈출 숙어·관용표현 + 생활영어", targetQuestions: 30 },
  // 문법 (4주)
  { week: 3, title: "영문법 (1)", laws: [], topics: ["동사시제", "조동사"], focus: "시제·조동사 체계", targetQuestions: 30 },
  { week: 4, title: "영문법 (2)", laws: [], topics: ["준동사", "접속사"], focus: "부정사·동명사·분사 + 접속사", targetQuestions: 30 },
  { week: 5, title: "영문법 (3)", laws: [], topics: ["관계사", "가정법"], focus: "관계대명사·관계부사 + 가정법", targetQuestions: 30 },
  { week: 6, title: "영문법 (4)", laws: [], topics: ["일치·화법", "특수구문"], focus: "수일치·화법전환·도치·강조", targetQuestions: 25 },
  // 구문독해 (3주)
  { week: 7, title: "구문독해 (1)", laws: [], topics: ["주어·동사파악", "수식구조"], focus: "긴 문장 구조 분석 — 주어·동사 찾기", targetQuestions: 30 },
  { week: 8, title: "구문독해 (2)", laws: [], topics: ["삽입·도치구문", "병렬구조"], focus: "삽입·도치·병렬 구문 해석", targetQuestions: 30 },
  { week: 9, title: "구문독해 (3)", laws: [], topics: ["복합문해석", "의미단위끊기"], focus: "복합문 해석 + 의미 단위 끊어 읽기", targetQuestions: 25 },
  // 독해 (3주)
  { week: 10, title: "독해 (1)", laws: [], topics: ["주제·요지", "제목추론"], focus: "주제·요지·제목 추론 유형", targetQuestions: 30 },
  { week: 11, title: "독해 (2)", laws: [], topics: ["빈칸추론", "문장삽입"], focus: "빈칸 완성·문장 삽입·순서 배열", targetQuestions: 30 },
  { week: 12, title: "독해 (3)", laws: [], topics: ["내용일치", "실용문독해"], focus: "내용 일치·불일치 + 실용문 독해", targetQuestions: 30 },
];

// ---------------------------------------------------------------------------
// 헌법 7급 커리큘럼 (12주)
// ---------------------------------------------------------------------------

const CONSTITUTION_7_WEEKS: CurriculumWeek[] = [
  // 헌법총론 (3주)
  { week: 1, title: "헌법총론 (1)", laws: [], topics: ["헌법일반", "대한민국헌법총설"], focus: "헌법의 의의·분류·해석, 헌법 전문·기본원리", targetQuestions: 30 },
  { week: 2, title: "헌법총론 (2)", laws: [], topics: ["국민주권", "민주주의", "법치주의"], focus: "국민주권·민주주의·법치주의·사회국가 원리", targetQuestions: 30 },
  { week: 3, title: "헌법총론 (3)", laws: [], topics: ["정당제도", "선거제도", "지방자치"], focus: "정당·선거·지방자치 제도", targetQuestions: 30 },
  // 기본권론 (5주)
  { week: 4, title: "기본권 총론", laws: [], topics: ["기본권총론", "기본권주체", "기본권제한"], focus: "기본권의 주체·효력·제한·침해구제", targetQuestions: 35 },
  { week: 5, title: "자유권적 기본권 (1)", laws: [], topics: ["인간존엄", "평등권", "신체자유"], focus: "인간 존엄·평등권·신체의 자유", targetQuestions: 35 },
  { week: 6, title: "자유권적 기본권 (2)", laws: [], topics: ["정신적자유", "경제적자유"], focus: "양심·종교·표현의 자유 + 재산권·직업의 자유", targetQuestions: 35 },
  { week: 7, title: "사회권·참정권·청구권", laws: [], topics: ["사회권", "참정권", "청구권"], focus: "사회적 기본권·참정권·청구권적 기본권", targetQuestions: 30 },
  { week: 8, title: "기본권 판례 집중", laws: [], topics: ["기본권판례", "헌재결정례"], focus: "주요 헌재 결정례 분석 — 위헌·합헌·한정 결정", targetQuestions: 30 },
  // 통치구조론 (3주)
  { week: 9, title: "국회", laws: [], topics: ["국회구성", "국회운영", "입법과정"], focus: "국회 구성·운영·입법권·재정권", targetQuestions: 30 },
  { week: 10, title: "대통령·행정부", laws: [], topics: ["대통령", "행정부", "감사원"], focus: "대통령 권한·행정부 조직·감사원", targetQuestions: 30 },
  { week: 11, title: "법원·헌법재판소", laws: [], topics: ["법원", "사법권"], focus: "법원 조직·사법권 독립·재판 유형", targetQuestions: 30 },
  // 헌법재판소 (1주)
  { week: 12, title: "헌법재판소", laws: [], topics: ["헌법재판소", "위헌심사", "헌법소원"], focus: "헌법재판소 권한 — 위헌법률심판·헌법소원·권한쟁의", targetQuestions: 35 },
];

// ---------------------------------------------------------------------------
// 경제학 7급 커리큘럼 (16주)
// ---------------------------------------------------------------------------

const ECONOMICS_7_WEEKS: CurriculumWeek[] = [
  // 미시경제학 (8주)
  { week: 1, title: "경제학 기초·수요공급", laws: [], topics: ["경제학기초", "수요공급"], focus: "경제학 방법론 + 수요·공급 모형", targetQuestions: 30 },
  { week: 2, title: "탄력성·소비자이론 (1)", laws: [], topics: ["탄력성", "소비자선택"], focus: "가격탄력성 + 효용이론·무차별곡선", targetQuestions: 30 },
  { week: 3, title: "소비자이론 (2)", laws: [], topics: ["소득효과", "대체효과", "현시선호"], focus: "소득·대체 효과 + 현시선호이론", targetQuestions: 25 },
  { week: 4, title: "생산자이론", laws: [], topics: ["생산함수", "비용이론"], focus: "생산함수·비용곡선·이윤극대화", targetQuestions: 30 },
  { week: 5, title: "완전경쟁·독점", laws: [], topics: ["완전경쟁", "독점"], focus: "완전경쟁 시장 + 독점 이론", targetQuestions: 30 },
  { week: 6, title: "불완전경쟁·게임이론", laws: [], topics: ["독점적경쟁", "과점", "게임이론"], focus: "독점적 경쟁·과점·내쉬 균형", targetQuestions: 30 },
  { week: 7, title: "요소시장·소득분배", laws: [], topics: ["요소시장", "소득분배"], focus: "노동시장·자본시장·소득분배 이론", targetQuestions: 25 },
  { week: 8, title: "시장실패·공공경제", laws: [], topics: ["외부성", "공공재", "정보비대칭"], focus: "외부성·공공재·정보 비대칭·정부 실패", targetQuestions: 30 },
  // 거시경제학 (6주)
  { week: 9, title: "거시경제 기초·국민소득", laws: [], topics: ["GDP", "국민소득"], focus: "GDP 개념·측정 + 국민소득 결정이론", targetQuestions: 30 },
  { week: 10, title: "소비·투자·화폐시장", laws: [], topics: ["소비함수", "투자이론", "화폐시장"], focus: "소비·투자 이론 + 화폐 수요·공급", targetQuestions: 30 },
  { week: 11, title: "IS-LM 모형", laws: [], topics: ["IS곡선", "LM곡선", "재정정책", "금융정책"], focus: "IS-LM 균형 + 재정·금융정책 효과", targetQuestions: 30 },
  { week: 12, title: "AD-AS 모형·인플레이션", laws: [], topics: ["총수요", "총공급", "인플레이션"], focus: "총수요-총공급 + 필립스 곡선", targetQuestions: 30 },
  { week: 13, title: "실업·경기변동·성장", laws: [], topics: ["실업", "경기변동", "경제성장"], focus: "실업 이론·경기변동·솔로우 성장 모형", targetQuestions: 25 },
  { week: 14, title: "거시경제 학파·기대", laws: [], topics: ["거시학파", "합리적기대"], focus: "고전학파·케인즈·통화주의·새고전·새케인즈", targetQuestions: 25 },
  // 국제경제학 (2주)
  { week: 15, title: "국제무역", laws: [], topics: ["비교우위", "무역정책", "무역이론"], focus: "비교우위·헥셔-올린 + 관세·비관세장벽", targetQuestions: 25 },
  { week: 16, title: "국제금융·환율", laws: [], topics: ["환율", "국제수지", "개방거시"], focus: "환율결정·국제수지·먼델-플레밍 모형", targetQuestions: 25 },
];

// ---------------------------------------------------------------------------
// Curriculum builders
// ---------------------------------------------------------------------------

function wrapInStages(weeks: CurriculumWeek[], stageConfig: { name: string; from: number; to: number }[]): CurriculumStage[] {
  return stageConfig.map(({ name, from, to }) => ({
    name,
    weeks: weeks.filter(w => w.week >= from && w.week <= to),
  }));
}

const TAX_9_CURRICULUM: CurriculumData = {
  subject: 'tax',
  examTarget: '9급',
  totalWeeks: TAX_9_WEEKS.length,
  source: '플레이스홀더 — 강사 제공 커리큘럼으로 교체 예정',
  stages: wrapInStages(TAX_9_WEEKS, [
    { name: '기본이론', from: 1, to: 9 },
    { name: '심화', from: 10, to: 12 },
    { name: '파이널', from: 13, to: 13 },
  ]),
};

const TAX_7_CURRICULUM: CurriculumData = {
  subject: 'tax',
  examTarget: '7급',
  totalWeeks: TAX_7_WEEKS.length,
  source: '플레이스홀더 — 강사 제공 커리큘럼으로 교체 예정',
  stages: wrapInStages(TAX_7_WEEKS, [
    { name: '기본이론', from: 1, to: 11 },
    { name: '심화', from: 12, to: 15 },
    { name: '파이널', from: 16, to: 17 },
  ]),
};

const ACCOUNTING_9_CURRICULUM: CurriculumData = {
  subject: 'accounting',
  examTarget: '9급',
  totalWeeks: ACCOUNTING_9_WEEKS.length,
  source: '플레이스홀더 — 강사 제공 커리큘럼으로 교체 예정',
  stages: wrapInStages(ACCOUNTING_9_WEEKS, [
    { name: '기본이론', from: 1, to: 5 },
    { name: '심화', from: 6, to: 7 },
    { name: '파이널', from: 8, to: 8 },
  ]),
};

const KOREAN_9_CURRICULUM: CurriculumData = {
  subject: 'korean',
  examTarget: '9급',
  totalWeeks: KOREAN_9_WEEKS.length,
  source: '플레이스홀더 — 학원 조사 기반 일반 커리큘럼',
  stages: wrapInStages(KOREAN_9_WEEKS, [
    { name: '문법', from: 1, to: 4 },
    { name: '문학', from: 5, to: 7 },
    { name: '비문학/독해', from: 8, to: 10 },
    { name: '어휘/한자', from: 11, to: 12 },
  ]),
};

const ENGLISH_9_CURRICULUM: CurriculumData = {
  subject: 'english',
  examTarget: '9급',
  totalWeeks: ENGLISH_9_WEEKS.length,
  source: '플레이스홀더 — 학원 조사 기반 일반 커리큘럼',
  stages: wrapInStages(ENGLISH_9_WEEKS, [
    { name: '어휘', from: 1, to: 2 },
    { name: '문법', from: 3, to: 6 },
    { name: '구문독해', from: 7, to: 9 },
    { name: '독해', from: 10, to: 12 },
  ]),
};

const CONSTITUTION_7_CURRICULUM: CurriculumData = {
  subject: 'constitution',
  examTarget: '7급',
  totalWeeks: CONSTITUTION_7_WEEKS.length,
  source: '플레이스홀더 — 학원 조사 기반 일반 커리큘럼',
  stages: wrapInStages(CONSTITUTION_7_WEEKS, [
    { name: '헌법총론', from: 1, to: 3 },
    { name: '기본권론', from: 4, to: 8 },
    { name: '통치구조론', from: 9, to: 11 },
    { name: '헌법재판소', from: 12, to: 12 },
  ]),
};

const ECONOMICS_7_CURRICULUM: CurriculumData = {
  subject: 'economics',
  examTarget: '7급',
  totalWeeks: ECONOMICS_7_WEEKS.length,
  source: '플레이스홀더 — 학원 조사 기반 일반 커리큘럼',
  stages: wrapInStages(ECONOMICS_7_WEEKS, [
    { name: '미시경제학', from: 1, to: 8 },
    { name: '거시경제학', from: 9, to: 14 },
    { name: '국제경제학', from: 15, to: 16 },
  ]),
};

// ---------------------------------------------------------------------------
// 프리셋 배열 — 학원/강사별 커리큘럼 선택 시스템
// ---------------------------------------------------------------------------

export const CURRICULUM_PRESETS: CurriculumPreset[] = [
  // 세법 9급 — 기본(이훈엽 기반)
  {
    id: 'default_tax_9',
    subject: 'tax',
    examTarget: '9급',
    academy: '기본',
    teacher: '공통',
    label: '세법 9급 기본 커리큘럼',
    totalWeeks: 13,
    stages: [{ name: '기본이론+문풀', weeks: TAX_9_WEEKS }],
  },
  // 세법 7급
  {
    id: 'default_tax_7',
    subject: 'tax',
    examTarget: '7급',
    academy: '기본',
    teacher: '공통',
    label: '세법 7급 기본 커리큘럼',
    totalWeeks: 17,
    stages: [{ name: '기본이론+문풀', weeks: TAX_7_WEEKS }],
  },
  // 회계 9급
  {
    id: 'default_accounting_9',
    subject: 'accounting',
    examTarget: '9급',
    academy: '기본',
    teacher: '공통',
    label: '회계학 9급 기본 커리큘럼',
    totalWeeks: 8,
    stages: [{ name: '기본이론+문풀', weeks: ACCOUNTING_9_WEEKS }],
  },
  // 회계 7급 (9급과 동일 커리큘럼)
  {
    id: 'default_accounting_7',
    subject: 'accounting',
    examTarget: '7급',
    academy: '기본',
    teacher: '공통',
    label: '회계학 7급 기본 커리큘럼',
    totalWeeks: 8,
    stages: [{ name: '기본이론+문풀', weeks: ACCOUNTING_9_WEEKS }],
  },
  // 국어 9급
  {
    id: 'default_korean_9',
    subject: 'korean',
    examTarget: '9급',
    academy: '기본',
    teacher: '공통',
    label: '국어 9급 기본 커리큘럼',
    totalWeeks: 12,
    stages: KOREAN_9_CURRICULUM.stages,
  },
  // 영어 9급
  {
    id: 'default_english_9',
    subject: 'english',
    examTarget: '9급',
    academy: '기본',
    teacher: '공통',
    label: '영어 9급 기본 커리큘럼',
    totalWeeks: 12,
    stages: ENGLISH_9_CURRICULUM.stages,
  },
  // 헌법 7급
  {
    id: 'default_constitution_7',
    subject: 'constitution',
    examTarget: '7급',
    academy: '기본',
    teacher: '공통',
    label: '헌법 7급 기본 커리큘럼',
    totalWeeks: 12,
    stages: CONSTITUTION_7_CURRICULUM.stages,
  },
  // 경제학 7급
  {
    id: 'default_economics_7',
    subject: 'economics',
    examTarget: '7급',
    academy: '기본',
    teacher: '공통',
    label: '경제학 7급 기본 커리큘럼',
    totalWeeks: 16,
    stages: ECONOMICS_7_CURRICULUM.stages,
  },
];

// ---------------------------------------------------------------------------
// Lookup map
// ---------------------------------------------------------------------------

// @deprecated — use getPresetById instead
const CURRICULUM_MAP: Record<string, CurriculumData> = {
  'tax_9급': TAX_9_CURRICULUM,
  'tax_7급': TAX_7_CURRICULUM,
  'accounting_9급': ACCOUNTING_9_CURRICULUM,
  'korean_9급': KOREAN_9_CURRICULUM,
  'english_9급': ENGLISH_9_CURRICULUM,
  'constitution_7급': CONSTITUTION_7_CURRICULUM,
  'economics_7급': ECONOMICS_7_CURRICULUM,
};

// ---------------------------------------------------------------------------
// Public API — New
// ---------------------------------------------------------------------------

/** 특정 과목+등급에 사용 가능한 프리셋 목록 */
export function getPresetsForSubject(subject: SubjectType, examTarget: '9급' | '7급'): CurriculumPreset[] {
  return CURRICULUM_PRESETS.filter(p => p.subject === subject && p.examTarget === examTarget);
}

/** 프리셋 ID로 조회 */
export function getPresetById(presetId: string): CurriculumPreset | null {
  return CURRICULUM_PRESETS.find(p => p.id === presetId) ?? null;
}

/** 특정 과목+등급의 기본 프리셋 ID */
export function getDefaultPresetId(subject: SubjectType, examTarget: '9급' | '7급'): string {
  return `default_${subject}_${examTarget === '9급' ? '9' : '7'}`;
}

/** 프리셋에서 CurriculumData로 변환 */
export function presetToCurriculumData(preset: CurriculumPreset): CurriculumData {
  return {
    subject: preset.subject,
    examTarget: preset.examTarget,
    totalWeeks: preset.totalWeeks,
    source: `${preset.academy} ${preset.teacher}`,
    stages: preset.stages,
  };
}

/**
 * 과목 + 시험등급에 맞는 커리큘럼 반환.
 * 매칭 데이터가 없으면 null.
 */
export function getCurriculum(subject: SubjectType, examTarget: '9급' | '7급'): CurriculumData | null {
  const presetId = getDefaultPresetId(subject, examTarget);
  const preset = getPresetById(presetId);
  if (!preset) return null;
  return presetToCurriculumData(preset);
}

/**
 * 현재 주차 주변 ~4주(같은 달) 반환
 */
export function getMonthPlan(curriculum: CurriculumData, currentWeek: number): MonthPlan {
  const allWeeks = curriculum.stages.flatMap(s => s.weeks);

  // currentWeek 기준 +-1주 포함하여 4주 블록 계산
  const blockStart = Math.max(1, currentWeek - 1);
  const blockEnd = Math.min(curriculum.totalWeeks, blockStart + 3);
  const weeks = allWeeks.filter(w => w.week >= blockStart && w.week <= blockEnd);

  // 해당 주차가 속하는 stage 이름 찾기
  let stage = '';
  for (const s of curriculum.stages) {
    if (s.weeks.some(w => w.week === currentWeek)) {
      stage = s.name;
      break;
    }
  }

  const monthNum = Math.ceil(currentWeek / 4);
  const month = `${monthNum}개월차`;

  return { month, weeks, stage };
}

/**
 * 특정 주차의 CurriculumWeek 반환
 */
export function getWeekPlan(curriculum: CurriculumData, weekNum: number): CurriculumWeek | null {
  for (const stage of curriculum.stages) {
    const found = stage.weeks.find(w => w.week === weekNum);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API — Backward compat (from roadmap.ts)
// ---------------------------------------------------------------------------

/**
 * 시험 목표 + 과목에 맞는 로드맵 반환 (하위 호환)
 */
export function getRoadmap(
  examTarget: '9급' | '7급',
  subject: SubjectType = 'tax',
): RoadmapConfig {
  const data = getCurriculum(subject, examTarget);
  if (!data) {
    // fallback for subjects without matching examTarget
    return { totalWeeks: 0, weeks: [] };
  }
  const allWeeks = data.stages.flatMap(s => s.weeks);
  return { totalWeeks: data.totalWeeks, weeks: allWeeks };
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
  examTarget: '9급' | '7급',
  solvedQuestionNos: Set<number>,
  allQuestions: { no: number; 대분류: string; 소분류: string; 직급: string }[],
): WeekProgress {
  // 종합 복습 주차
  if (week.topics.length === 0) {
    const gradeQuestions = allQuestions.filter(
      (q) => q.직급 === examTarget || q.직급 === '공통',
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
    return '/practice?filter=random';
  }
  return `/practice?law=${encodeURIComponent(week.laws[0])}`;
}
