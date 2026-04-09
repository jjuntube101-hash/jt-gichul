"use client";

import { Star, Check, ChevronRight, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DailyPlan } from "@/lib/dailyPlanEngine";

interface Props {
  plan: DailyPlan | null;
  loading?: boolean;
}

export default function DailyPlanCard({ plan, loading }: Props) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border-2 border-primary/20 bg-card p-4 h-48" />
    );
  }

  if (!plan) return null;

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-bold text-foreground">오늘의 미션</span>
        </div>
        <div className="flex items-center gap-2">
          {plan.streak > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
              <Flame className="h-3 w-3" />
              {plan.streak}일째
            </span>
          )}
        </div>
      </div>

      {/* Subject missions */}
      <div className="space-y-2">
        {plan.subjects.map((s) => (
          <div
            key={s.subject}
            className={`flex items-center gap-3 text-xs p-2 rounded-lg transition-colors ${
              s.completed
                ? 'bg-green-50 dark:bg-green-950/30'
                : 'bg-muted/50'
            }`}
          >
            {/* Status icon */}
            <div className="shrink-0">
              {s.completed ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : s.type === 'mission' ? (
                <Star className="h-4 w-4 text-yellow-500" />
              ) : (
                <div className="h-4 w-4 rounded-sm border-2 border-muted-foreground/30" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-foreground">{s.label}</span>
                {s.type === 'mission' && s.mission && (
                  <span className="text-muted-foreground">
                    {s.mission.questionNos.length}문항
                  </span>
                )}
                {s.type === 'guide' && (
                  <span className="text-muted-foreground">{s.studyMinutes}분</span>
                )}
              </div>
              {s.type === 'mission' && s.mission && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  약점 {s.mission.breakdown.weak} + 이번주 {s.mission.breakdown.thisWeek} + 복습{' '}
                  {s.mission.breakdown.review} + 도전 {s.mission.breakdown.challenge}
                </div>
              )}
              {s.type === 'guide' && s.guide && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {s.guide.topic}
                </div>
              )}
            </div>

            {/* Action */}
            <div className="shrink-0">
              {s.type === 'mission' && !s.completed && (
                <button
                  className="flex items-center gap-0.5 text-primary font-medium text-[10px] bg-primary/10 px-2 py-1 rounded-md"
                  onClick={() => {
                    if (s.mission?.questionNos.length) {
                      router.push(
                        `/practice?mode=mission&nos=${s.mission.questionNos.join(',')}`,
                      );
                    }
                  }}
                >
                  풀기
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
              {s.completed && (
                <span className="text-[10px] text-green-500 font-medium">완료</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>오늘 진행률</span>
          <span>{plan.completionRate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              plan.completionRate >= 100 ? 'bg-green-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, plan.completionRate)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
