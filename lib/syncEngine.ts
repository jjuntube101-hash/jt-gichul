import { getSupabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyLogData {
  logDate: string; // YYYY-MM-DD
  studySeconds: number;
  pomodoroSessions: number;
  solveCount: number;
  oxCount: number;
  correctCount: number;
  totalCount: number;
  planStepsCompleted: number;
}

export interface ReviewCardData {
  questionNo: number;
  nextReviewDate: string;
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
  lastReviewDate: string | null;
}

export interface UserSyncData {
  dailyLogs: DailyLogData[];
  reviewCards: ReviewCardData[];
}

// ---------------------------------------------------------------------------
// Helper: get current user ID from Supabase session
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------------------------------------------------------------------------
// Module-level debounce timer for daily log sync
// ---------------------------------------------------------------------------

let dailyLogTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDailyLog: { logDate: string; partial: Partial<DailyLogData> } | null = null;
const DAILY_LOG_DEBOUNCE_MS = 5_000;

// ---------------------------------------------------------------------------
// syncDailyLog — simplified: auto-resolves userId, accepts partial data
// ---------------------------------------------------------------------------

export function syncDailyLog(
  logDate: string,
  partial: Partial<DailyLogData>,
): void {
  if (pendingDailyLog && pendingDailyLog.logDate === logDate) {
    pendingDailyLog.partial = { ...pendingDailyLog.partial, ...partial };
  } else {
    pendingDailyLog = { logDate, partial };
  }
  if (dailyLogTimer) clearTimeout(dailyLogTimer);

  dailyLogTimer = setTimeout(async () => {
    dailyLogTimer = null;
    const pending = pendingDailyLog;
    if (!pending) return;
    pendingDailyLog = null;

    const userId = await getCurrentUserId();
    if (!userId) return;

    _syncDailyLogInternal(userId, {
      logDate: pending.logDate,
      studySeconds: pending.partial.studySeconds ?? 0,
      pomodoroSessions: pending.partial.pomodoroSessions ?? 0,
      solveCount: pending.partial.solveCount ?? 0,
      oxCount: pending.partial.oxCount ?? 0,
      correctCount: pending.partial.correctCount ?? 0,
      totalCount: pending.partial.totalCount ?? 0,
      planStepsCompleted: pending.partial.planStepsCompleted ?? 0,
    });
  }, DAILY_LOG_DEBOUNCE_MS);
}

// Internal: actual DB upsert
function _syncDailyLogInternal(userId: string, data: DailyLogData): void {
  const supabase = getSupabase();
  if (!supabase) return;

  supabase
    .from("daily_study_logs")
    .upsert(
      {
        user_id: userId,
        log_date: data.logDate,
        study_seconds: data.studySeconds,
        pomodoro_sessions: data.pomodoroSessions,
        solve_count: data.solveCount,
        ox_count: data.oxCount,
        correct_count: data.correctCount,
        total_count: data.totalCount,
        plan_steps_completed: data.planStepsCompleted,
      },
      { onConflict: "user_id,log_date" },
    )
    .then(({ error }) => {
      if (error) console.warn("[syncDailyLog] upsert failed:", error.message);
    });
}

// ---------------------------------------------------------------------------
// syncReviewCard — immediate upsert
// ---------------------------------------------------------------------------

export function syncReviewCard(userId: string, card: ReviewCardData): void {
  const supabase = getSupabase();
  if (!supabase) return;

  supabase
    .from("spaced_repetition_cards")
    .upsert(
      {
        user_id: userId,
        question_no: card.questionNo,
        next_review_date: card.nextReviewDate,
        interval_days: card.intervalDays,
        ease_factor: card.easeFactor,
        repetition_count: card.repetitionCount,
        last_review_date: card.lastReviewDate,
      },
      { onConflict: "user_id,question_no" },
    )
    .then(({ error }) => {
      if (error) console.warn("[syncReviewCard] upsert failed:", error.message);
    });
}

// ---------------------------------------------------------------------------
// removeSyncedCard — delete a card from DB
// ---------------------------------------------------------------------------

export function removeSyncedCard(userId: string, questionNo: number): void {
  const supabase = getSupabase();
  if (!supabase) return;

  supabase
    .from("spaced_repetition_cards")
    .delete()
    .eq("user_id", userId)
    .eq("question_no", questionNo)
    .then(({ error }) => {
      if (error) console.warn("[removeSyncedCard] delete failed:", error.message);
    });
}

// ---------------------------------------------------------------------------
// loadUserDataFromDB — cross-device sync on login
// ---------------------------------------------------------------------------

export async function loadUserDataFromDB(
  userId: string,
): Promise<UserSyncData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    // 최근 30일 daily logs + 전체 spaced repetition cards 병렬 조회
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD

    const [logsResult, cardsResult] = await Promise.all([
      supabase
        .from("daily_study_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", since)
        .order("log_date", { ascending: true }),
      supabase
        .from("spaced_repetition_cards")
        .select("*")
        .eq("user_id", userId),
    ]);

    if (logsResult.error) {
      console.warn("[loadUserDataFromDB] logs query failed:", logsResult.error.message);
    }
    if (cardsResult.error) {
      console.warn("[loadUserDataFromDB] cards query failed:", cardsResult.error.message);
    }

    const dailyLogs: DailyLogData[] = (logsResult.data ?? []).map((row) => ({
      logDate: row.log_date,
      studySeconds: row.study_seconds,
      pomodoroSessions: row.pomodoro_sessions,
      solveCount: row.solve_count,
      oxCount: row.ox_count,
      correctCount: row.correct_count,
      totalCount: row.total_count,
      planStepsCompleted: row.plan_steps_completed,
    }));

    const reviewCards: ReviewCardData[] = (cardsResult.data ?? []).map((row) => ({
      questionNo: row.question_no,
      nextReviewDate: row.next_review_date,
      intervalDays: row.interval_days,
      easeFactor: row.ease_factor,
      repetitionCount: row.repetition_count,
      lastReviewDate: row.last_review_date,
    }));

    return { dailyLogs, reviewCards };
  } catch (err) {
    console.warn("[loadUserDataFromDB] unexpected error:", err);
    return null;
  }
}
