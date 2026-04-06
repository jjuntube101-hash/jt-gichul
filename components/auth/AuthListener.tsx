"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * 전역 Auth 리스너 — Supabase 클라이언트를 초기화하여
 * URL hash의 토큰을 어떤 페이지에서든 감지.
 */
export default function AuthListener() {
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // getSession()이 URL hash 토큰 자동 감지를 트리거
    supabase.auth.getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {});
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
