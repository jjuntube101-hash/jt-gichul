"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getSupabase } from "@/lib/supabase";

export type UserStage = "anonymous" | "new" | "regular" | "power";

interface UserStageResult {
  stage: UserStage;
  solveCount: number;
  loading: boolean;
}

/**
 * 유저 단계 판별 훅.
 *
 * anonymous: 비로그인
 * new:       로그인 + 풀이 10문항 미만
 * regular:   10~500 문항
 * power:     500+ 문항
 */
export function useUserStage(): UserStageResult {
  const { user, loading: authLoading } = useAuth();
  const [solveCount, setSolveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setSolveCount(0);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // solve_records + ox_records 합산
    Promise.all([
      supabase
        .from("solve_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("ox_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ])
      .then(([solveRes, oxRes]) => {
        const total = (solveRes.count ?? 0) + (oxRes.count ?? 0);
        setSolveCount(total);
      })
      .catch(() => {
        // 조회 실패 시 0으로 유지
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, authLoading]);

  const stage: UserStage = !user
    ? "anonymous"
    : solveCount >= 500
      ? "power"
      : solveCount >= 10
        ? "regular"
        : "new";

  return { stage, solveCount, loading: authLoading || loading };
}
