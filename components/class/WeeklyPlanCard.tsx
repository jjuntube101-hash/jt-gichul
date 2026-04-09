"use client";

import { BookOpen, CheckCircle2 } from "lucide-react";
import type { WeekPlan } from "@/lib/dailyPlanEngine";

interface Props {
  plan: WeekPlan | null;
  loading?: boolean;
}

export default function WeeklyPlanCard({ plan, loading }: Props) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-4 h-36" aria-label="주간 플랜 로딩 중" />
    );
  }

  if (!plan) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            이번 주 ({plan.dateRange})
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Week {plan.weekNum}
          </span>
        </div>
      </div>

      {/* Subject rows */}
      <div className="space-y-2">
        {plan.subjects.map((s) => (
          <div key={s.subject} className="flex items-center gap-3 text-xs">
            <span className="font-bold text-foreground w-8 shrink-0">{s.label}</span>
            <div className="flex-1 min-w-0">
              <span className="text-foreground">{s.title}</span>
              {s.focus && (
                <span className="text-muted-foreground ml-1">— {s.focus}</span>
              )}
            </div>
            <div className="shrink-0 text-right">
              {s.type === 'mission' ? (
                <span
                  className={`font-medium ${
                    s.solvedCount >= s.targetQuestions
                      ? 'text-green-500'
                      : 'text-foreground'
                  }`}
                >
                  {s.solvedCount >= s.targetQuestions && (
                    <CheckCircle2 className="h-3 w-3 inline mr-0.5 -mt-0.5" />
                  )}
                  {s.solvedCount}/{s.targetQuestions}
                </span>
              ) : (
                <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">
                  가이드
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>주간 목표: {plan.weeklyGoal}문항</span>
          <span>{plan.weeklyProgress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={plan.weeklyProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`주간 진행률 ${plan.weeklyProgress}%`}>
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(100, plan.weeklyProgress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
