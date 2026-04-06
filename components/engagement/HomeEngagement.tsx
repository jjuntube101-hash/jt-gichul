"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { useStudyContext } from "@/hooks/useStudyContext";
import StreakBanner from "./StreakBanner";
import { CircleDot, AlertTriangle, Target, ChevronRight, Clock } from "lucide-react";

export default function HomeEngagement() {
  const { user, loading: authLoading } = useAuth();
  const { streak, loading: streakLoading } = useStreak();
  const { resumeOX, resumeTimer, yesterdayWrong, weakestLaw, loading: ctxLoading } = useStudyContext();

  if (authLoading || !user) return null;

  const loading = streakLoading || ctxLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasCards = resumeOX || resumeTimer || yesterdayWrong.length > 0 || weakestLaw;

  return (
    <div className="space-y-3">
      {/* 스트릭 배너 */}
      <StreakBanner streak={streak} />

      {/* 미완성 업무 카드들 */}
      {hasCards && (
        <div className="space-y-2">
          {/* OX 이어서 풀기 */}
          {resumeOX && (
            <Link href="/ox">
              <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-light p-3.5 transition-all hover:border-success/50 hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <CircleDot className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-card-foreground">OX 퀴즈 이어서</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {resumeOX.currentIndex}/{resumeOX.total}문항 · 정답률 {resumeOX.accuracy}%
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-success shrink-0" />
              </div>
            </Link>
          )}

          {/* Timer 결과 보기 */}
          {resumeTimer && (
            <Link href="/timer">
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-light p-3.5 transition-all hover:border-primary/50 hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-card-foreground">타이머 결과 확인</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {resumeTimer.questionsCount}문항 테스트 · {resumeTimer.answeredCount}문항 응답
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
              </div>
            </Link>
          )}

          {/* 어제 틀린 문항 */}
          {yesterdayWrong.length > 0 && (
            <Link href="/review">
              <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-light p-3.5 transition-all hover:border-danger/50 hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-card-foreground">어제 틀린 문항 복습</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {yesterdayWrong.map(w => `${w.law} ${w.count}문`).join(" · ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-danger shrink-0" />
              </div>
            </Link>
          )}

          {/* 약점 공략 */}
          {weakestLaw && (
            <Link href={`/practice?law=${encodeURIComponent(weakestLaw.law)}`}>
              <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-light p-3.5 transition-all hover:border-warning/50 hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                  <Target className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-card-foreground">약점 공략: {weakestLaw.law}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    정답률 {weakestLaw.accuracy}% · {weakestLaw.total}문항 풀이
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-warning shrink-0" />
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
