"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { loadStreak, updateStreak, type StreakData } from "@/lib/streak";

const DEFAULT: StreakData = {
  currentStreak: 0,
  maxStreak: 0,
  lastSolveDate: null,
  totalSolveDays: 0,
  solvedToday: false,
  streakFreezes: 0,
  freezeUsedToday: false,
};

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStreak(DEFAULT);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    loadStreak(supabase, user.id)
      .then(setStreak)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const recordSolve = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const updated = await updateStreak(supabase, user.id);
    setStreak(updated);
    return updated;
  }, [user]);

  return { streak, loading, recordSolve };
}
