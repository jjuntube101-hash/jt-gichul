"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Target,
  BookOpen,
  TrendingDown,
  BarChart3,
  Lock,
} from "lucide-react";
import { useUserStage } from "@/hooks/useUserStage";
import { useAuth } from "@/hooks/useAuth";
import { useTopicMastery } from "@/hooks/useTopicMastery";
import { getSupabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// NewUserBanner — 신규 유저 (<10문항)
// ---------------------------------------------------------------------------

function NewUserBanner({
  displayName,
  solveCount,
}: {
  displayName: string;
  solveCount: number;
}) {
  const goal = 10;
  const pct = Math.min(Math.round((solveCount / goal) * 100), 100);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
          <Target className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-card-foreground">
            {displayName}님, 첫 목표: {goal}문항
          </p>

          {/* 프로그레스 바 */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {solveCount}/{goal}
            </span>
          </div>

          <Link
            href="/practice?filter=random"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            다음 문제 풀기
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// RegularUserCard — 일반 유저 (10~500)
// ---------------------------------------------------------------------------

function RegularUserCard({ solveCount }: { solveCount: number }) {
  // 간단한 오늘의 할 일: 복습 3 + 신규 5 (고정, 추후 동적 변경 가능)
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-light text-success">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-card-foreground">
            오늘의 할 일
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            <li>복습 3문항 + 신규 5문항</li>
            <li className="tabular-nums">
              누적 {solveCount.toLocaleString()}문항 완료
            </li>
          </ul>

          {/* 로드맵 카드 placeholder */}
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            로드맵 — Sprint 20에서 활성화
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PowerUserCard — 파워 유저 (500+)
// ---------------------------------------------------------------------------

function PowerUserCard({ solveCount }: { solveCount: number }) {
  const { data: masteryData, loading: masteryLoading } = useTopicMastery();

  // 약점 토픽: 정확도 낮은 순 상위 3개 (최소 3문항 이상 풀어본 것)
  const weakTopics = masteryData
    .flatMap((law) => law.topics)
    .filter((t) => t.total >= 3 && t.level !== "gold" && t.level !== "none")
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return (
    <section className="space-y-3">
      {/* 상단: 요약 + 로드맵 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-light text-warning">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-card-foreground">
              누적 {solveCount.toLocaleString()}문항
            </p>

            {/* 로드맵 placeholder */}
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              로드맵 — Sprint 20에서 활성화
            </div>

            {/* AI 브리핑 placeholder */}
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              AI 브리핑 — Sprint 21에서 활성화
            </div>
          </div>
        </div>
      </div>

      {/* 약점 토픽 */}
      {!masteryLoading && weakTopics.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-light text-danger">
              <TrendingDown className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-card-foreground">
                약점 토픽
              </p>
              <ul className="mt-1.5 space-y-1">
                {weakTopics.map((t) => (
                  <li
                    key={`${t.law}-${t.topic}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-card-foreground">
                      {t.law} &middot; {t.topic}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.accuracy}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// StageHome — 메인 래퍼
// ---------------------------------------------------------------------------

export default function StageHome() {
  const { stage, solveCount, loading } = useUserStage();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");

  // display_name 조회 (new 단계에서만 필요)
  useEffect(() => {
    if (!user || stage !== "new") return;

    const supabase = getSupabase();
    if (!supabase) return;

    supabase
      .from("user_study_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          setDisplayName(data.display_name);
        } else {
          // display_name 없으면 이메일 앞부분 사용
          setDisplayName(user.email?.split("@")[0] ?? "수험생");
        }
      });
  }, [user, stage]);

  if (loading) return null;
  if (stage === "anonymous") return null;

  return (
    <>
      {stage === "new" && (
        <NewUserBanner displayName={displayName} solveCount={solveCount} />
      )}
      {stage === "regular" && <RegularUserCard solveCount={solveCount} />}
      {stage === "power" && <PowerUserCard solveCount={solveCount} />}
    </>
  );
}
