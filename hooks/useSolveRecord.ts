"use client";

import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useStreak } from "./useStreak";
import { useBadges } from "./useBadges";

export function useSolveRecord() {
  const { user } = useAuth();
  const { streak, recordSolve } = useStreak();
  const { earnedIds, newBadges, checkAndAward, dismissNewBadges } = useBadges();

  const saveSolve = async (params: {
    questionNo: number;
    isCorrect: boolean;
    selectedChoice: number;
    timeSpentMs?: number;
    mode: "practice" | "ox" | "timer";
  }) => {
    if (!user) return null;
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase.from("solve_records").insert({
      user_id: user.id,
      question_no: params.questionNo,
      is_correct: params.isCorrect,
      selected_choice: params.selectedChoice,
      time_spent_ms: params.timeSpentMs ?? 0,
      mode: params.mode,
    });

    if (error) {
      console.error("풀이 기록 저장 실패:", error);
      return data;
    }

    // 스트릭 업데이트
    const updatedStreak = await recordSolve();

    // 뱃지 체크 (통계 간이 조회)
    try {
      const [solveRes, oxRes] = await Promise.all([
        supabase.from("solve_records").select("is_correct").eq("user_id", user.id),
        supabase.from("ox_records").select("is_correct").eq("user_id", user.id),
      ]);
      const solves = solveRes.data ?? [];
      const oxes = oxRes.data ?? [];

      await checkAndAward({
        totalSolved: solves.length,
        correctCount: solves.filter((s) => s.is_correct).length,
        oxTotal: oxes.length,
        currentStreak: updatedStreak?.currentStreak ?? streak.currentStreak,
        maxStreak: updatedStreak?.maxStreak ?? streak.maxStreak,
      });
    } catch {
      // 뱃지 체크 실패 무시
    }

    return data;
  };

  const saveOX = async (params: {
    questionNo: number;
    oxIndex: number;
    isCorrect: boolean;
  }) => {
    if (!user) return null;
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase.from("ox_records").insert({
      user_id: user.id,
      question_no: params.questionNo,
      ox_index: params.oxIndex,
      is_correct: params.isCorrect,
    });

    if (error) {
      console.error("OX 기록 저장 실패:", error);
      return data;
    }

    // 스트릭 업데이트
    const updatedStreak = await recordSolve();

    // 뱃지 체크
    try {
      const [solveRes, oxRes] = await Promise.all([
        supabase.from("solve_records").select("is_correct").eq("user_id", user.id),
        supabase.from("ox_records").select("is_correct").eq("user_id", user.id),
      ]);
      const solves = solveRes.data ?? [];
      const oxes = oxRes.data ?? [];

      await checkAndAward({
        totalSolved: solves.length,
        correctCount: solves.filter((s) => s.is_correct).length,
        oxTotal: oxes.length,
        currentStreak: updatedStreak?.currentStreak ?? streak.currentStreak,
        maxStreak: updatedStreak?.maxStreak ?? streak.maxStreak,
      });
    } catch {
      // 뱃지 체크 실패 무시
    }

    return data;
  };

  return { saveSolve, saveOX, streak, newBadges, earnedIds, dismissNewBadges };
}
