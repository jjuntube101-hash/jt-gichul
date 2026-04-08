"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("로그인 처리 중...");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    // Implicit flow: Supabase JS가 URL hash의 access_token을 자동 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("로그인 성공!");
        router.replace("/mypage");
      }
    });

    // 이미 세션이 있는 경우
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/mypage");
      }
    });

    // URL에 error 파라미터가 있는 경우
    const params = new URLSearchParams(window.location.search);
    const errorDesc = params.get("error_description");
    if (errorDesc) {
      setStatus("로그인 실패: " + errorDesc);
      setTimeout(() => router.replace("/login"), 3000);
    }

    // 타임아웃
    const timeout = setTimeout(() => {
      setStatus("시간 초과");
      router.replace("/login");
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-slate-500">{status}</p>
    </div>
  );
}
