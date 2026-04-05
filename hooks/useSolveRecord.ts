"use client";

import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export function useSolveRecord() {
  const { user } = useAuth();

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

    if (error) console.error("풀이 기록 저장 실패:", error);
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

    if (error) console.error("OX 기록 저장 실패:", error);
    return data;
  };

  return { saveSolve, saveOX };
}
