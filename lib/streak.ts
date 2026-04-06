import type { SupabaseClient } from "@supabase/supabase-js";

export interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastSolveDate: string | null;
  totalSolveDays: number;
  solvedToday: boolean;
  streakFreezes: number;
  freezeUsedToday: boolean;
}

/** 오늘 날짜 (KST) */
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 어제 날짜 (KST) */
function yesterdayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 이틀 전 날짜 (KST) */
function twoDaysAgoKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 - 2 * 24 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 스트릭 데이터 로드 (프리즈 자동 사용 포함) */
export async function loadStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakData> {
  const { data } = await supabase
    .from("user_profiles")
    .select("last_solve_date, current_streak, max_streak, total_solve_days, streak_freezes, last_freeze_used_at")
    .eq("user_id", userId)
    .single();

  if (!data) {
    return { currentStreak: 0, maxStreak: 0, lastSolveDate: null, totalSolveDays: 0, solvedToday: false, streakFreezes: 0, freezeUsedToday: false };
  }

  const today = todayKST();
  const yesterday = yesterdayKST();
  const twoDaysAgo = twoDaysAgoKST();
  const last = data.last_solve_date;
  const freezes = data.streak_freezes ?? 0;
  const lastFreezeUsed = data.last_freeze_used_at;

  let currentStreak = data.current_streak ?? 0;
  let freezeUsedToday = lastFreezeUsed === today;

  // 스트릭이 끊겼는지 확인
  if (last && last !== today && last !== yesterday) {
    // 프리즈 자동 사용: 어제 안 풀었지만 그저께가 마지막이고, 프리즈가 있으면
    if (last === twoDaysAgo && freezes > 0 && !freezeUsedToday) {
      // 프리즈 사용 — 스트릭 유지, 프리즈 차감
      await supabase
        .from("user_profiles")
        .update({
          streak_freezes: freezes - 1,
          last_freeze_used_at: today, // 오늘 사용됨으로 기록 (재로드 시 배너 유지)
          last_solve_date: yesterday, // 어제 풀은 것처럼 처리
        })
        .eq("user_id", userId);

      return {
        currentStreak,
        maxStreak: data.max_streak ?? 0,
        lastSolveDate: yesterday,
        totalSolveDays: data.total_solve_days ?? 0,
        solvedToday: false,
        streakFreezes: freezes - 1,
        freezeUsedToday: true, // 오늘 프리즈 사용됨
      };
    }
    currentStreak = 0;
  }

  return {
    currentStreak,
    maxStreak: data.max_streak ?? 0,
    lastSolveDate: last,
    totalSolveDays: data.total_solve_days ?? 0,
    solvedToday: last === today,
    streakFreezes: freezes,
    freezeUsedToday,
  };
}

/** 이번 주 시작일 (월요일) */
function weekStartKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getDay();
  const diff = day === 0 ? 6 : day - 1; // 월요일 = 0
  kst.setDate(kst.getDate() - diff);
  return kst.toISOString().slice(0, 10);
}

/** 문제 풀이 후 스트릭 업데이트 */
export async function updateStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakData> {
  const today = todayKST();
  const yesterday = yesterdayKST();

  const { data } = await supabase
    .from("user_profiles")
    .select("last_solve_date, current_streak, max_streak, total_solve_days, streak_freezes, last_freeze_earned_at, last_freeze_used_at")
    .eq("user_id", userId)
    .single();

  const last = data?.last_solve_date;
  const prevStreak = data?.current_streak ?? 0;
  const prevMax = data?.max_streak ?? 0;
  const prevDays = data?.total_solve_days ?? 0;
  let freezes = data?.streak_freezes ?? 0;
  const lastFreezeEarned = data?.last_freeze_earned_at;

  // 이미 오늘 풀었으면 변경 없음
  if (last === today) {
    return {
      currentStreak: prevStreak,
      maxStreak: prevMax,
      lastSolveDate: last,
      totalSolveDays: prevDays,
      solvedToday: true,
      streakFreezes: freezes,
      freezeUsedToday: false,
    };
  }

  let newStreak: number;
  if (last === yesterday) {
    newStreak = prevStreak + 1;
  } else {
    newStreak = 1;
  }

  const newMax = Math.max(prevMax, newStreak);
  const newDays = prevDays + 1;

  // 주 1회 프리즈 획득: 7일 연속 달성 시 또는 이번 주에 아직 안 받았으면 + 3일 이상 연속
  const weekStart = weekStartKST();
  let newFreezeEarned = lastFreezeEarned;
  if (newStreak >= 7 && (!lastFreezeEarned || lastFreezeEarned < weekStart)) {
    freezes = Math.min(freezes + 1, 3); // 최대 3개
    newFreezeEarned = today;
  }

  await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      last_solve_date: today,
      current_streak: newStreak,
      max_streak: newMax,
      total_solve_days: newDays,
      streak_freezes: freezes,
      last_freeze_earned_at: newFreezeEarned,
    }, { onConflict: "user_id" });

  return {
    currentStreak: newStreak,
    maxStreak: newMax,
    lastSolveDate: today,
    totalSolveDays: newDays,
    solvedToday: true,
    streakFreezes: freezes,
    freezeUsedToday: false,
  };
}
