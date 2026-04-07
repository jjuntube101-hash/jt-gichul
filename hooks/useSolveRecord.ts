"use client";

import { getSupabase } from "@/lib/supabase";
import { bufferAnonSolve, bufferAnonOX } from "@/lib/anonSolveBuffer";
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
    // 비로그인: localStorage 버퍼에 저장
    if (!user) {
      bufferAnonSolve({
        questionNo: params.questionNo,
        isCorrect: params.isCorrect,
        selectedChoice: params.selectedChoice,
        timeSpentMs: params.timeSpentMs ?? 0,
        mode: params.mode,
      });
      return null;
    }
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
      // DB 실패 시 로컬 버퍼에 백업 (다음 로그인 시 재시도)
      bufferAnonSolve({
        questionNo: params.questionNo,
        isCorrect: params.isCorrect,
        selectedChoice: params.selectedChoice,
        timeSpentMs: params.timeSpentMs ?? 0,
        mode: params.mode,
      });
      return data;
    }

    // 스트릭 업데이트
    const updatedStreak = await recordSolve();

    // 뱃지 체크 (count 쿼리로 최적화 — 전체 데이터 다운로드 방지)
    try {
      const [solveTotal, solveCorrect, oxTotal] = await Promise.all([
        supabase.from("solve_records").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("solve_records").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_correct", true),
        supabase.from("ox_records").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      await checkAndAward({
        totalSolved: solveTotal.count ?? 0,
        correctCount: solveCorrect.count ?? 0,
        oxTotal: oxTotal.count ?? 0,
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
    // 비로그인: localStorage 버퍼에 저장
    if (!user) {
      bufferAnonOX({
        questionNo: params.questionNo,
        oxIndex: params.oxIndex,
        isCorrect: params.isCorrect,
      });
      return null;
    }
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
      // DB 실패 시 로컬 버퍼에 백업
      bufferAnonOX({
        questionNo: params.questionNo,
        oxIndex: params.oxIndex,
        isCorrect: params.isCorrect,
      });
      return data;
    }

    // 스트릭 업데이트
    const updatedStreak = await recordSolve();

    // 뱃지 체크 (count 쿼리로 최적화)
    try {
      const [solveTotal, solveCorrect, oxTotalRes] = await Promise.all([
        supabase.from("solve_records").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("solve_records").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_correct", true),
        supabase.from("ox_records").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      await checkAndAward({
        totalSolved: solveTotal.count ?? 0,
        correctCount: solveCorrect.count ?? 0,
        oxTotal: oxTotalRes.count ?? 0,
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
