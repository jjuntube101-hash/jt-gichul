"use client";

import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useState } from "react";
import type { MonthPlan } from "@/lib/dailyPlanEngine";

interface Props {
  plan: MonthPlan | null;
  loading?: boolean;
}

export default function MonthlyPlanCard({ plan, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-4 h-24" aria-label="월간 플랜 로딩 중" />
    );
  }

  if (!plan) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full p-4 flex items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${plan.month} 월간 플랜 ${expanded ? '접기' : '펼치기'}`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            {plan.month}
          </span>
          {plan.daysUntilExam !== null && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              D-{plan.daysUntilExam}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!expanded && (
        <div className="px-4 pb-3 -mt-1">
          <div className="text-xs text-muted-foreground space-y-0.5">
            {plan.subjects.slice(0, 4).map((s) => (
              <div key={s.subject} className="flex items-center gap-2">
                <span className="font-medium text-foreground w-8">{s.label}</span>
                <span className="truncate">{s.topicsOverview}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {plan.subjects.map((s) => (
            <div key={s.subject} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {s.stage}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  목표 {s.targetQuestions}문항
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{s.topicsOverview}</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.label} 진행률 ${s.progress}%`}>
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, s.progress)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
