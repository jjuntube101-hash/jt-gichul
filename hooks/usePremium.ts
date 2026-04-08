"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getSupabase } from "@/lib/supabase";

interface PremiumState {
  isPremium: boolean;
  expiresAt: string | null;
  loading: boolean;
}

/**
 * Premium 상태 확인 훅
 * - user_profiles.is_premium + premium_expires_at 체크
 * - 만료된 경우 isPremium = false
 */
export function usePremium(): PremiumState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    expiresAt: null,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ isPremium: false, expiresAt: null, loading: false });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setState({ isPremium: false, expiresAt: null, loading: false });
      return;
    }

    supabase
      .from("user_profiles")
      .select("is_premium, premium_expires_at")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setState({ isPremium: false, expiresAt: null, loading: false });
          return;
        }

        const now = new Date();
        const expiresAt = data.premium_expires_at;
        const isExpired = expiresAt ? new Date(expiresAt) < now : false;
        const isPremium = data.is_premium === true && !isExpired;

        setState({ isPremium, expiresAt, loading: false });
      });
  }, [user, authLoading]);

  return state;
}
