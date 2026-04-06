"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BriefingResult {
  greeting: string;
  reviewAlert: string;
  yesterdaySummary: string;
  weekSummary: string;
  weakPoint: string;
  todayTask: string;
  generatedAt: string;
}

type BriefingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: BriefingResult; cached: boolean }
  | { status: "rate_limited"; data: BriefingResult | null }
  | { status: "error"; message: string };

const STORAGE_KEY = "jt_briefing_cache";

// ---------------------------------------------------------------------------
// localStorage 캐시
// ---------------------------------------------------------------------------

function getCachedBriefing(): BriefingResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date: string; data: BriefingResult };
    // 오늘 날짜와 동일하면 캐시 유효
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date === today && parsed.data) return parsed.data;
    return null;
  } catch {
    return null;
  }
}

function setCachedBriefing(data: BriefingResult) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, data }));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyBriefing() {
  const { user } = useAuth();
  const [state, setState] = useState<BriefingState>({ status: "idle" });

  const fetchBriefing = useCallback(async () => {
    if (!user) return;

    const supabase = getSupabase();
    if (!supabase) return;

    setState({ status: "loading" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setState({ status: "error", message: "인증 정보 없음" });
        return;
      }

      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (res.status === 429) {
        // 레이트리밋: 캐시된 브리핑 표시
        const cached = getCachedBriefing();
        setState({ status: "rate_limited", data: cached });
        return;
      }

      if (!res.ok) {
        setState({ status: "error", message: "브리핑 생성 실패" });
        return;
      }

      const json = await res.json();
      const briefing = json.data as BriefingResult;
      setCachedBriefing(briefing);
      setState({ status: "ok", data: briefing, cached: !!json.cached });
    } catch {
      setState({ status: "error", message: "네트워크 오류" });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // 로컬 캐시가 있으면 먼저 표시 후 백그라운드 갱신
    const cached = getCachedBriefing();
    if (cached) {
      setState({ status: "ok", data: cached, cached: true });
    }
    fetchBriefing();
  }, [user, fetchBriefing]);

  if (!user) return null;

  // --- Loading skeleton ---
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
          <div className="h-3 w-3/5 rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-card-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            오늘의 브리핑
          </div>
          <button
            onClick={fetchBriefing}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            재시도
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          브리핑을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  // --- Rate limited (no cached data) ---
  if (state.status === "rate_limited" && !state.data) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-card-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          오늘의 브리핑
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          오늘의 브리핑은 이미 확인했습니다. 내일 갱신됩니다.
        </p>
      </div>
    );
  }

  // --- Success / rate_limited with cache ---
  const briefing =
    state.status === "rate_limited" ? state.data! : state.data;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-bold text-card-foreground">
        <BarChart3 className="h-4 w-4 text-primary" />
        오늘의 브리핑
      </div>

      {/* Briefing lines */}
      <div className="mt-3 space-y-1 text-xs text-card-foreground leading-relaxed">
        <p className="font-semibold">{briefing.greeting}</p>
        {briefing.reviewAlert !== "복습 대기 없음." && (
          <p className="text-primary font-medium">{briefing.reviewAlert}</p>
        )}
        <p className="text-muted-foreground">{briefing.yesterdaySummary}</p>
        <p className="text-muted-foreground">{briefing.weekSummary}</p>
        <p className="text-muted-foreground">{briefing.weakPoint}</p>
      </div>

      {/* Divider + Today task */}
      <div className="mt-3 border-t border-border pt-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-card-foreground">
          {briefing.todayTask}
        </p>
        <Link
          href="/practice?filter=random"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
        >
          시작하기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
