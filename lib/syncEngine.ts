import { getSupabase } from "@/lib/supabase";
import {
  loadAnonSolves,
  loadAnonOX,
  clearAnonBuffer,
  hasAnonRecords,
} from "@/lib/anonSolveBuffer";

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

// ---------------------------------------------------------------------------
// migrateAnonRecords — 비로그인 풀이 기록을 DB로 마이그레이션
// ---------------------------------------------------------------------------

// 중복 마이그레이션 방지 플래그
let migrationInProgress = false;

export async function migrateAnonRecords(userId: string): Promise<number> {
  if (!hasAnonRecords()) return 0;
  if (migrationInProgress) return 0; // 동시 호출 방지

  const supabase = getSupabase();
  if (!supabase) return 0;

  migrationInProgress = true;
  let solvesFailed = false;
  let oxFailed = false;
  let migratedCount = 0;

  try {
    // 1. solve_records 마이그레이션
    const anonSolves = loadAnonSolves();
    if (anonSolves.length > 0) {
      const rows = anonSolves.map((s) => ({
        user_id: userId,
        question_no: s.questionNo,
        is_correct: s.isCorrect,
        selected_choice: s.selectedChoice,
        time_spent_ms: s.timeSpentMs,
        mode: s.mode,
        created_at: s.createdAt,
      }));

      // 50개씩 배치 insert
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("solve_records").insert(batch);
        if (error) {
          console.warn("[migrateAnonRecords] solve batch insert failed:", error.message);
          solvesFailed = true;
          break; // 실패 시 남은 배치 중단 (부분 삭제 방지)
        } else {
          migratedCount += batch.length;
        }
      }
    }

    // 2. ox_records 마이그레이션
    const anonOX = loadAnonOX();
    if (anonOX.length > 0) {
      const rows = anonOX.map((o) => ({
        user_id: userId,
        question_no: o.questionNo,
        ox_index: o.oxIndex,
        is_correct: o.isCorrect,
        created_at: o.createdAt,
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("ox_records").insert(batch);
        if (error) {
          console.warn("[migrateAnonRecords] ox batch insert failed:", error.message);
          oxFailed = true;
          break;
        } else {
          migratedCount += batch.length;
        }
      }
    }

    // 3. 전부 성공한 경우에만 버퍼 비우기 (부분 실패 시 보존)
    if (!solvesFailed && !oxFailed && migratedCount > 0) {
      clearAnonBuffer();
      console.log(`[migrateAnonRecords] ${migratedCount}건 마이그레이션 완료`);
    } else if (migratedCount > 0) {
      console.warn(`[migrateAnonRecords] 부분 성공 ${migratedCount}건 — 버퍼 보존 (재시도 대기)`);
    }
  } catch (err) {
    console.warn("[migrateAnonRecords] unexpected error:", err);
  } finally {
    migrationInProgress = false;
  }

  return migratedCount;
}
