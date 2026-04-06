// SM-2 간이 간격 반복(Spaced Repetition) 알고리즘
// localStorage 기반, KST 날짜 사용

export interface ReviewCard {
  questionNo: number;
  nextReviewDate: string; // YYYY-MM-DD
  intervalDays: number; // 1, 3, 7, 14, 30...
  easeFactor: number; // starts 2.5
  repetitionCount: number;
  lastReviewDate: string;
}

export interface ReviewSchedule {
  cards: ReviewCard[];
  lastUpdated: string;
}

const STORAGE_KEY = "jt_review_schedule";

/** 오늘 날짜 (KST) */
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 날짜에 일수를 더한 YYYY-MM-DD 반환 (KST 기준) */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 빈 스케줄 생성 */
function emptySchedule(): ReviewSchedule {
  return { cards: [], lastUpdated: todayKST() };
}

/** localStorage에서 복습 스케줄 불러오기 */
export function loadReviewSchedule(): ReviewSchedule {
  if (typeof window === "undefined") return emptySchedule();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySchedule();
    const parsed = JSON.parse(raw) as ReviewSchedule;
    if (!Array.isArray(parsed.cards)) return emptySchedule();
    return parsed;
  } catch {
    return emptySchedule();
  }
}

/** localStorage에 복습 스케줄 저장 */
function saveSchedule(schedule: ReviewSchedule): void {
  if (typeof window === "undefined") return;
  schedule.lastUpdated = todayKST();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

/** 틀린 문제를 복습 스케줄에 추가 (이미 있으면 리셋) */
export function addToReview(questionNo: number): void {
  const schedule = loadReviewSchedule();
  const today = todayKST();

  const existing = schedule.cards.find((c) => c.questionNo === questionNo);
  if (existing) {
    // 이미 있으면 리셋
    existing.intervalDays = 1;
    existing.easeFactor = 2.5;
    existing.repetitionCount = 0;
    existing.nextReviewDate = addDays(today, 1);
    existing.lastReviewDate = today;
  } else {
    schedule.cards.push({
      questionNo,
      nextReviewDate: addDays(today, 1),
      intervalDays: 1,
      easeFactor: 2.5,
      repetitionCount: 0,
      lastReviewDate: today,
    });
  }

  saveSchedule(schedule);
}

/** 오늘 복습할 카드 목록 (nextReviewDate <= 오늘) */
export function getTodayReviewCards(): ReviewCard[] {
  const schedule = loadReviewSchedule();
  const today = todayKST();
  return schedule.cards.filter((c) => c.nextReviewDate <= today);
}

/** 앞으로 N일 이내에 복습할 카드 목록 (오늘 포함하지 않음) */
export function getUpcomingCards(days: number): ReviewCard[] {
  const today = todayKST();
  const futureDate = addDays(today, days);
  const schedule = loadReviewSchedule();

  return schedule.cards.filter(
    (c) => c.nextReviewDate > today && c.nextReviewDate <= futureDate
  );
}

/** SM-2 알고리즘으로 복습 결과 반영 */
export function markReviewed(questionNo: number, isCorrect: boolean): void {
  const schedule = loadReviewSchedule();
  const card = schedule.cards.find((c) => c.questionNo === questionNo);
  if (!card) return;

  const today = todayKST();
  card.lastReviewDate = today;

  if (isCorrect) {
    // 정답: 간격 확대, 난이도 상승
    card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
    card.repetitionCount += 1;
    card.easeFactor = Math.min(3.0, card.easeFactor + 0.1);
  } else {
    // 오답: 리셋
    card.intervalDays = 1;
    card.repetitionCount = 0;
    card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
  }

  card.nextReviewDate = addDays(today, card.intervalDays);
  saveSchedule(schedule);
}

/** 복습 통계 */
export function getReviewStats(): {
  todayDue: number;
  totalCards: number;
  masteredCards: number;
} {
  const schedule = loadReviewSchedule();
  const today = todayKST();

  return {
    todayDue: schedule.cards.filter((c) => c.nextReviewDate <= today).length,
    totalCards: schedule.cards.length,
    masteredCards: schedule.cards.filter((c) => c.intervalDays >= 30).length,
  };
}
