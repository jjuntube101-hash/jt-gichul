/**
 * 데일리 퀘스트 시스템
 * 매일 3개 퀘스트를 생성하고 진행률을 추적합니다.
 * 가변비율 강화 — 매일 다른 퀘스트 조합으로 예측 불가능한 보상
 */

export interface Quest {
  id: string;
  type: "easy" | "medium" | "hard";
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface DailyQuestState {
  date: string;
  quests: Quest[];
}

/** 오늘 날짜 (KST) */
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 날짜 기반 시드 해시 (일관된 랜덤) */
function dateHash(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// 퀘스트 풀 — 슬롯별로 다른 난이도
const EASY_QUESTS = [
  { title: "오늘 5문항 풀기", description: "아무 문항 5개를 풀어보세요", target: 5 },
  { title: "오늘 3문항 풀기", description: "간단하게 3문항만 풀어보세요", target: 3 },
  { title: "OX 10문항 풀기", description: "OX 퀴즈 10문항을 풀어보세요", target: 10 },
  { title: "오늘 7문항 풀기", description: "7문항을 풀어 학습을 시작하세요", target: 7 },
];

const MEDIUM_QUESTS = [
  { title: "3연속 정답", description: "연속으로 3문항을 맞혀보세요", target: 3 },
  { title: "정답률 70% 이상", description: "오늘 풀이 정답률 70% 달성", target: 70 },
  { title: "OX 20문항 풀기", description: "OX 퀴즈 20문항 도전", target: 20 },
  { title: "10문항 풀기", description: "오늘 총 10문항을 풀어보세요", target: 10 },
];

const HARD_QUESTS = [
  { title: "타이머 모드 도전", description: "타이머 테스트를 1회 완료하세요", target: 1 },
  { title: "정답률 80% 이상", description: "오늘 풀이 정답률 80% 달성", target: 80 },
  { title: "OX 50문항 돌파", description: "OX 퀴즈 50문항 이상 풀기", target: 50 },
  { title: "20문항 풀기", description: "오늘 총 20문항을 풀어보세요", target: 20 },
];

const STORAGE_KEY = "jt_daily_quest";

/** 오늘의 퀘스트 생성 또는 로드 */
export function loadDailyQuests(): DailyQuestState {
  const today = todayKST();

  // localStorage에서 복원
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state: DailyQuestState = JSON.parse(saved);
      if (state.date === today) return state;
    }
  } catch { /* ignore */ }

  // 새로운 퀘스트 생성 — 날짜 기반 시드로 일관된 선택
  const seed = dateHash(today);
  const easy = EASY_QUESTS[seed % EASY_QUESTS.length];
  const medium = MEDIUM_QUESTS[(seed >> 4) % MEDIUM_QUESTS.length];
  const hard = HARD_QUESTS[(seed >> 8) % HARD_QUESTS.length];

  const state: DailyQuestState = {
    date: today,
    quests: [
      { id: "easy", type: "easy", ...easy, current: 0, completed: false },
      { id: "medium", type: "medium", ...medium, current: 0, completed: false },
      { id: "hard", type: "hard", ...hard, current: 0, completed: false },
    ],
  };

  saveDailyQuests(state);
  return state;
}

/** 퀘스트 진행 상태 저장 */
export function saveDailyQuests(state: DailyQuestState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** 퀘스트 진행률 업데이트 */
export function updateQuestProgress(
  state: DailyQuestState,
  updates: {
    solveCount?: number;
    oxCount?: number;
    correctRate?: number;
    consecutiveCorrect?: number;
    timerCompleted?: boolean;
  }
): DailyQuestState {
  const { solveCount = 0, oxCount = 0, correctRate = 0, consecutiveCorrect = 0, timerCompleted = false } = updates;

  const newQuests = state.quests.map(q => {
    if (q.completed) return q;

    let current = q.current;

    // 퀘스트 타입별 매칭
    if (q.title.includes("문항 풀기") && !q.title.includes("OX")) {
      current = solveCount;
    } else if (q.title.includes("OX") && q.title.includes("문항")) {
      current = oxCount;
    } else if (q.title.includes("연속 정답")) {
      current = consecutiveCorrect;
    } else if (q.title.includes("정답률")) {
      current = correctRate;
    } else if (q.title.includes("타이머")) {
      current = timerCompleted ? 1 : 0;
    }

    const completed = current >= q.target;
    return { ...q, current, completed };
  });

  const newState = { ...state, quests: newQuests };
  saveDailyQuests(newState);
  return newState;
}
