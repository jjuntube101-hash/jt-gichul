/**
 * 퀘스트 진행률 트래커
 * 오늘의 누적 풀이 통계를 localStorage에 저장하고
 * dailyQuest의 updateQuestProgress와 동기화합니다.
 */

import { loadDailyQuests, updateQuestProgress } from "./dailyQuest";
import { addToReview } from "./spacedRepetition";
import { syncDailyLog } from "./syncEngine";

const STATS_KEY = "jt_daily_stats";

interface DailyStats {
  date: string;
  solveCount: number; // 전체 풀이 수 (OX 포함)
  oxCount: number; // OX 전용 카운트
  correctCount: number;
  totalCount: number;
  maxConsecutiveCorrect: number;
  timerCompleted: boolean;
}

function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function loadTodayStats(): DailyStats {
  const today = todayKST();
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      const stats: DailyStats = JSON.parse(saved);
      if (stats.date === today) return stats;
    }
  } catch { /* ignore */ }
  return {
    date: today,
    solveCount: 0,
    oxCount: 0,
    correctCount: 0,
    totalCount: 0,
    maxConsecutiveCorrect: 0,
    timerCompleted: false,
  };
}

function saveTodayStats(stats: DailyStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

function syncQuests(stats: DailyStats): void {
  const questState = loadDailyQuests();
  const correctRate =
    stats.totalCount > 0
      ? Math.round((stats.correctCount / stats.totalCount) * 100)
      : 0;
  updateQuestProgress(questState, {
    solveCount: stats.solveCount,
    oxCount: stats.oxCount,
    correctRate,
    consecutiveCorrect: stats.maxConsecutiveCorrect,
    timerCompleted: stats.timerCompleted,
  });

  // DB 동기화 (로그인 유저만, fire-and-forget)
  syncDailyLog(stats.date, {
    solveCount: stats.solveCount,
    oxCount: stats.oxCount,
    correctCount: stats.correctCount,
    totalCount: stats.totalCount,
  });
}

/** practice/timer 모드 풀이 기록 */
export function trackSolve(isCorrect: boolean, questionNo?: number): void {
  const stats = loadTodayStats();
  stats.solveCount++;
  stats.totalCount++;
  if (isCorrect) stats.correctCount++;
  else if (questionNo) addToReview(questionNo);
  saveTodayStats(stats);
  syncQuests(stats);
}

/** OX 드릴 풀이 기록. currentStreak = 현재 연속 정답 수 */
export function trackOX(isCorrect: boolean, currentStreak: number): void {
  const stats = loadTodayStats();
  stats.oxCount++;
  stats.solveCount++;
  stats.totalCount++;
  if (isCorrect) stats.correctCount++;
  stats.maxConsecutiveCorrect = Math.max(
    stats.maxConsecutiveCorrect,
    currentStreak
  );
  saveTodayStats(stats);
  syncQuests(stats);
}

/** 타이머 모드 완료 */
export function trackTimerComplete(): void {
  const stats = loadTodayStats();
  stats.timerCompleted = true;
  saveTodayStats(stats);
  syncQuests(stats);
}
