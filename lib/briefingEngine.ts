/**
 * 오늘의 브리핑 엔진
 * - collectBriefingData: Supabase에서 개인 데이터 병렬 수집
 * - generateBriefing: 순수 함수, 텍스트 생성 (AI 호출 없이 로직)
 */

import { createClient } from '@supabase/supabase-js';
import { getRoadmap, getCurrentWeek } from '@/lib/curriculum';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BriefingData {
  displayName: string;
  examTarget: '9급' | '7급';
  examDate: string | null;
  examName: string | null;
  weakSubjects: string[];
  dailyGoalMinutes: number;

  yesterdayLog: {
    solveCount: number;
    correctCount: number;
    totalCount: number;
    studySeconds: number;
  } | null;

  weekLogs: {
    solveCount: number;
    correctCount: number;
    totalCount: number;
    studySeconds: number;
  }[];

  pendingReviewCount: number;

  weakTopics: { topic: string; accuracy: number; total: number }[];

  currentWeek: number;
  weekTitle: string;
  weekProgress: number; // 0~100
}

export interface BriefingResult {
  greeting: string;
  reviewAlert: string;
  yesterdaySummary: string;
  weekSummary: string;
  weakPoint: string;
  todayTask: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 미설정');
  return createClient(url, key);
}

/** KST 기준 오늘 (YYYY-MM-DD) */
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 어제 */
function yesterdayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - 1);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 이번 주 월요일 */
function weekStartKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  kst.setUTCDate(kst.getUTCDate() - diff);
  return kst.toISOString().slice(0, 10);
}

/** D-day 계산 (양수: 남은 일수, 0: 당일, 음수: 지남) */
function calcDday(examDate: string): number {
  const exam = new Date(examDate + 'T00:00:00+09:00');
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kstNow.setUTCHours(0, 0, 0, 0);
  return Math.ceil((exam.getTime() - kstNow.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// collectBriefingData
// ---------------------------------------------------------------------------

export async function collectBriefingData(userId: string): Promise<BriefingData> {
  const sb = getServiceSupabase();
  const today = todayKST();
  const yesterday = yesterdayKST();
  const weekStart = weekStartKST();

  // 병렬 쿼리
  const [profileRes, yesterdayLogRes, weekLogsRes, pendingReviewRes, solveStatsRes] =
    await Promise.all([
      // 1) 프로필
      sb
        .from('user_study_profiles')
        .select('display_name, exam_target, exam_name, exam_date, daily_study_goal_minutes, weak_subjects, onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle(),

      // 2) 어제 학습 로그
      sb
        .from('daily_study_logs')
        .select('solve_count, correct_count, total_count, study_seconds')
        .eq('user_id', userId)
        .eq('log_date', yesterday)
        .single(),

      // 3) 이번 주 학습 로그
      sb
        .from('daily_study_logs')
        .select('solve_count, correct_count, total_count, study_seconds')
        .eq('user_id', userId)
        .gte('log_date', weekStart)
        .lte('log_date', today)
        .order('log_date', { ascending: true }),

      // 4) 복습 대기 카드 수
      sb
        .from('spaced_repetition_cards')
        .select('question_no', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lte('next_review_date', today),

      // 5) 약점 토픽: solve_records에서 소분류별 정답률
      sb.rpc('get_weak_topics', { p_user_id: userId }).then((res) => {
        // RPC가 없을 수 있으므로 fallback 처리
        if (res.error) return { data: null, error: res.error };
        return res;
      }),
    ]);

  const profile = profileRes.data;
  const examTarget = (profile?.exam_target as '9급' | '7급') ?? '9급';

  // 약점 토픽 — RPC 실패 시 빈 배열
  let weakTopics: { topic: string; accuracy: number; total: number }[] = [];
  if (solveStatsRes.data && Array.isArray(solveStatsRes.data)) {
    weakTopics = solveStatsRes.data
      .filter((r: { total: number }) => r.total >= 3)
      .sort((a: { accuracy: number }, b: { accuracy: number }) => a.accuracy - b.accuracy)
      .slice(0, 5);
  }

  // 로드맵 주차 계산
  const roadmap = getRoadmap(examTarget);
  // onboarding 완료일 기준으로 현재 주차 계산
  // profile.created_at이 없으므로 updated_at이나 onboarding 시점을 알 수 없음
  // → exam_date에서 역산하거나, 간단히 현재 주차를 1로 설정
  let currentWeek = 1;
  let weekTitle = roadmap.weeks[0]?.title ?? '';
  let weekProgress = 0;

  if (profile?.exam_date) {
    const dday = calcDday(profile.exam_date);
    const totalDays = roadmap.totalWeeks * 7;
    const elapsedDays = totalDays - dday;
    if (elapsedDays > 0) {
      currentWeek = Math.min(Math.floor(elapsedDays / 7) + 1, roadmap.totalWeeks);
    }
    const weekData = roadmap.weeks[currentWeek - 1];
    if (weekData) {
      weekTitle = weekData.title;
      // 이번 주 풀이 수 / 목표 문항 수
      const weekSolveCount = (weekLogsRes.data ?? []).reduce(
        (sum: number, l: { solve_count: number }) => sum + (l.solve_count ?? 0),
        0,
      );
      weekProgress = weekData.targetQuestions > 0
        ? Math.min(Math.round((weekSolveCount / weekData.targetQuestions) * 100), 100)
        : 0;
    }
  }

  return {
    displayName: profile?.display_name ?? '수험생',
    examTarget,
    examDate: profile?.exam_date ?? null,
    examName: profile?.exam_name ?? null,
    weakSubjects: profile?.weak_subjects ?? [],
    dailyGoalMinutes: profile?.daily_study_goal_minutes ?? 30,

    yesterdayLog: yesterdayLogRes.data
      ? {
          solveCount: yesterdayLogRes.data.solve_count ?? 0,
          correctCount: yesterdayLogRes.data.correct_count ?? 0,
          totalCount: yesterdayLogRes.data.total_count ?? 0,
          studySeconds: yesterdayLogRes.data.study_seconds ?? 0,
        }
      : null,

    weekLogs: (weekLogsRes.data ?? []).map((l) => ({
      solveCount: l.solve_count ?? 0,
      correctCount: l.correct_count ?? 0,
      totalCount: l.total_count ?? 0,
      studySeconds: l.study_seconds ?? 0,
    })),

    pendingReviewCount: pendingReviewRes.count ?? 0,
    weakTopics,
    currentWeek,
    weekTitle,
    weekProgress,
  };
}

// ---------------------------------------------------------------------------
// generateBriefing (순수 함수)
// ---------------------------------------------------------------------------

export function generateBriefing(data: BriefingData): BriefingResult {
  const now = new Date().toISOString();

  // --- greeting ---
  let greeting: string;
  if (data.examDate) {
    const dday = calcDday(data.examDate);
    const examLabel = data.examName ?? `${data.examTarget} 시험`;
    if (dday > 0) {
      greeting = `D-${dday}. ${examLabel}.`;
    } else if (dday === 0) {
      greeting = `D-Day. ${examLabel} 당일.`;
    } else {
      greeting = `${examLabel} 종료. 복습 모드.`;
    }
  } else {
    greeting = `${data.examTarget} 준비 중.`;
  }

  // --- reviewAlert ---
  const reviewAlert =
    data.pendingReviewCount > 0
      ? `복습 ${data.pendingReviewCount}문항 대기.`
      : '복습 대기 없음.';

  // --- yesterdaySummary ---
  let yesterdaySummary: string;
  if (data.yesterdayLog && data.yesterdayLog.totalCount > 0) {
    const { correctCount, totalCount, studySeconds } = data.yesterdayLog;
    const pct = Math.round((correctCount / totalCount) * 100);
    const mins = Math.round(studySeconds / 60);
    yesterdaySummary = `어제: ${correctCount}/${totalCount} (${pct}%)`;
    if (mins > 0) {
      yesterdaySummary += `, ${mins}분 학습.`;
    } else {
      yesterdaySummary += '.';
    }
  } else {
    yesterdaySummary = '어제: 학습 기록 없음.';
  }

  // --- weekSummary ---
  const weekSolve = data.weekLogs.reduce((s, l) => s + l.solveCount, 0);
  const weekCorrect = data.weekLogs.reduce((s, l) => s + l.correctCount, 0);
  const weekTotal = data.weekLogs.reduce((s, l) => s + l.totalCount, 0);
  const weekStudyMins = Math.round(
    data.weekLogs.reduce((s, l) => s + l.studySeconds, 0) / 60,
  );

  let weekSummary: string;
  if (weekTotal > 0) {
    const weekPct = Math.round((weekCorrect / weekTotal) * 100);
    weekSummary = `이번 주: ${weekSolve}문항 풀이, 정답률 ${weekPct}%, ${weekStudyMins}분.`;
  } else {
    weekSummary = '이번 주: 아직 학습 기록 없음.';
  }

  // 로드맵 진행 상태 추가
  if (data.weekTitle) {
    weekSummary += ` [${data.currentWeek}주차: ${data.weekTitle}, ${data.weekProgress}%]`;
  }

  // --- weakPoint ---
  let weakPoint: string;
  if (data.weakTopics.length > 0) {
    const items = data.weakTopics
      .slice(0, 3)
      .map((t) => `${t.topic}(${t.accuracy}%)`)
      .join(', ');
    weakPoint = `약점: ${items}.`;
  } else if (data.weakSubjects.length > 0) {
    weakPoint = `자가진단 약점: ${data.weakSubjects.join(', ')}.`;
  } else {
    weakPoint = '약점 데이터 부족. 문제를 더 풀어보세요.';
  }

  // --- todayTask ---
  const reviewPart = data.pendingReviewCount > 0 ? `복습 ${data.pendingReviewCount}` : '';
  const newPart = '신규 5';
  const parts = [reviewPart, newPart].filter(Boolean);
  const todayTask = `오늘 할 일: ${parts.join(' + ')}.`;

  return {
    greeting,
    reviewAlert,
    yesterdaySummary,
    weekSummary,
    weakPoint,
    todayTask,
    generatedAt: now,
  };
}
