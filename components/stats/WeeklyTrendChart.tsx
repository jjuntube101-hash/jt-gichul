"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeekData {
  weekLabel: string; // "4/1~4/7"
  solved: number;
  correct: number;
  accuracy: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 최근 N주의 시작/끝 날짜 계산 (KST 기준, 월~일 기준) */
function getRecentWeeks(count: number): { start: string; end: string; label: string }[] {
  const weeks: { start: string; end: string; label: string }[] = [];
  const now = new Date();
  // KST
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  for (let i = 0; i < count; i++) {
    const endDate = new Date(kst);
    endDate.setDate(endDate.getDate() - i * 7);
    // 이번 주 일요일
    const dayOfWeek = endDate.getDay(); // 0=일 ~ 6=토
    const sun = new Date(endDate);
    sun.setDate(endDate.getDate() - dayOfWeek);
    // 이번 주 월요일
    const mon = new Date(sun);
    mon.setDate(sun.getDate() - 6);

    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    weeks.push({
      start: mon.toISOString().slice(0, 10),
      end: sun.toISOString().slice(0, 10),
      label: `${fmt(mon)}~${fmt(sun)}`,
    });
  }

  return weeks.reverse();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeeklyTrendChart() {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const supabase = getSupabase();
      if (!supabase) return;

      const recentWeeks = getRecentWeeks(4);
      const oldest = recentWeeks[0].start;

      const { data: records } = await supabase
        .from("solve_records")
        .select("is_correct, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", `${oldest}T00:00:00`);

      if (!records) {
        setLoading(false);
        return;
      }

      const weekData: WeekData[] = recentWeeks.map((w) => {
        const weekRecords = records.filter((r) => {
          const d = r.created_at.slice(0, 10);
          return d >= w.start && d <= w.end;
        });
        const solved = weekRecords.length;
        const correct = weekRecords.filter((r) => r.is_correct).length;
        return {
          weekLabel: w.label,
          solved,
          correct,
          accuracy: solved > 0 ? Math.round((correct / solved) * 100) : 0,
        };
      });

      setWeeks(weekData);
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-muted mb-3" />
        <div className="h-24 rounded bg-muted" />
      </div>
    );
  }

  if (weeks.length === 0 || weeks.every((w) => w.solved === 0)) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground">아직 주간 데이터가 부족합니다.</p>
      </div>
    );
  }

  const maxSolved = Math.max(...weeks.map((w) => w.solved), 1);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;

  const solvedDiff = lastWeek ? thisWeek.solved - lastWeek.solved : 0;
  const accDiff = lastWeek && lastWeek.accuracy > 0 ? thisWeek.accuracy - lastWeek.accuracy : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* 주간 비교 요약 */}
      {lastWeek && lastWeek.solved > 0 && (
        <div className="flex gap-3">
          <CompareChip
            label="풀이량"
            diff={solvedDiff}
            unit="문항"
            positive={solvedDiff > 0}
          />
          <CompareChip
            label="정답률"
            diff={accDiff}
            unit="%p"
            positive={accDiff > 0}
          />
        </div>
      )}

      {/* 바 차트 */}
      <div className="space-y-2">
        {weeks.map((w, i) => {
          const isThisWeek = i === weeks.length - 1;
          const barWidth = w.solved > 0 ? Math.max((w.solved / maxSolved) * 100, 8) : 0;

          return (
            <div key={w.weekLabel} className="flex items-center gap-3">
              <span className={`w-20 shrink-0 text-[10px] text-right ${isThisWeek ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {isThisWeek ? "이번 주" : w.weekLabel}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden">
                  {w.solved > 0 && (
                    <div
                      className={`h-full rounded-md transition-all duration-500 flex items-center px-1.5 ${
                        isThisWeek ? "bg-primary" : "bg-primary/40"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    >
                      <span className="text-[9px] font-bold text-white whitespace-nowrap">
                        {w.solved}
                      </span>
                    </div>
                  )}
                </div>
                <span className={`w-10 text-right text-[10px] font-medium ${
                  w.accuracy >= 70 ? "text-success" : w.accuracy >= 50 ? "text-warning" : w.accuracy > 0 ? "text-danger" : "text-muted-foreground"
                }`}>
                  {w.solved > 0 ? `${w.accuracy}%` : "-"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex justify-end gap-4 text-[9px] text-muted-foreground">
        <span>막대: 풀이 수</span>
        <span>숫자: 정답률</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CompareChip({ label, diff, unit, positive }: {
  label: string;
  diff: number;
  unit: string;
  positive: boolean;
}) {
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-muted-foreground";
  const bg = diff > 0 ? "bg-success-light" : diff < 0 ? "bg-danger-light" : "bg-muted";

  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${bg}`}>
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-bold ${color}`}>
        {diff > 0 ? "+" : ""}{diff}{unit}
      </span>
    </div>
  );
}
