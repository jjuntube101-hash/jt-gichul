"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

export default function PremiumGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const [code, setCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loading = authLoading || premiumLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground text-sm">
          로딩 중...
        </div>
      </div>
    );
  }

  // 로그인 안 됨
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-bold text-foreground">
          수강생 전용 공간입니다
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          이현준 세무사의 강의를 수강 중이시라면
          <br />
          로그인 후 수강 코드를 입력해주세요.
        </p>
        <a
          href="/login"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover transition-colors"
        >
          로그인하기
        </a>
      </div>
    );
  }

  // 로그인 됐지만 premium 아님
  if (!isPremium) {
    async function handleEnroll() {
      if (!code.trim() || enrolling) return;
      setEnrolling(true);
      setError("");

      try {
        const supabase = getSupabase();
        const session = supabase
          ? (await supabase.auth.getSession()).data.session
          : null;
        const token = session?.access_token;
        if (!token) {
          setError("인증 정보가 없습니다. 다시 로그인해주세요.");
          setEnrolling(false);
          return;
        }

        const res = await fetch("/api/enroll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: code.trim() }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "오류가 발생했습니다.");
          setEnrolling(false);
          return;
        }

        setSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
        setEnrolling(false);
      }
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-5">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-bold text-foreground">
          수강생 전용 공간입니다
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          이현준 세무사의 강의를 수강 중이시라면
          <br />
          수강 코드를 입력해주세요.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="JT-XXXX"
            maxLength={7}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleEnroll}
            disabled={!code.trim() || enrolling || success}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrolling ? "확인 중..." : success ? "등록 완료!" : "확인"}
          </button>
        </div>

        {error && (
          <p className="text-xs font-medium text-danger">{error}</p>
        )}
        {success && (
          <p className="text-xs font-medium text-success">
            수강생으로 등록되었습니다. 페이지를 새로고침합니다...
          </p>
        )}
      </div>
    );
  }

  // Premium 사용자 → 강의실 콘텐츠 표시
  return <>{children}</>;
}
