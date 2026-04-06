"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/** 프로필이 없으면 생성 (트리거 대신 앱에서 처리) */
async function ensureProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .single();
  if (!data) {
    await supabase.from("user_profiles").upsert({ user_id: userId });
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) ensureProfile(supabase, session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) ensureProfile(supabase, session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithKakao = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: new Error("Supabase not configured") };
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: new Error("Supabase not configured") };
    return supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return {
    user,
    loading,
    signInWithKakao,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
