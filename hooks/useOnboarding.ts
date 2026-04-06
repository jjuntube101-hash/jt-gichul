"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

interface OnboardingState {
  needsOnboarding: boolean;
  loading: boolean;
  markComplete: () => Promise<void>;
  markSkipped: () => Promise<void>;
}

export function useOnboarding(): OnboardingState {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from("user_study_profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data || !data.onboarding_completed) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
        setLoading(false);
      });
  }, [user, authLoading]);

  const markDone = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from("user_study_profiles")
      .upsert(
        { user_id: user.id, onboarding_completed: true },
        { onConflict: "user_id" },
      );

    if (error) {
      console.warn("[useOnboarding] upsert failed:", error.message);
      return;
    }
    setNeedsOnboarding(false);
  }, [user]);

  return {
    needsOnboarding,
    loading: authLoading || loading,
    markComplete: markDone,
    markSkipped: markDone,
  };
}
