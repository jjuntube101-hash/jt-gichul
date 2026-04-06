"use client";

import { Flame, Calendar, Shield } from "lucide-react";
import type { StreakData } from "@/lib/streak";

interface Props {
  streak: StreakData;
  compact?: boolean;
}

export default function StreakBanner({ streak, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Flame className={`h-4 w-4 ${streak.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        <span className={`font-bold ${streak.currentStreak > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
          {streak.currentStreak}
        </span>
        <span className="text-muted-foreground">일</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            streak.currentStreak > 0
              ? "bg-gradient-to-br from-orange-400 to-red-500"
              : "bg-muted"
          }`}>
            <Flame className={`h-6 w-6 ${streak.currentStreak > 0 ? "text-white" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${streak.currentStreak > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                {streak.currentStreak}
              </span>
              <span className="text-sm text-muted-foreground">일 연속</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {streak.solvedToday
                ? "오늘 학습 완료!"
                : streak.currentStreak > 0
                ? "오늘 문제를 풀어 스트릭을 이어가세요"
                : "문제를 풀고 스트릭을 시작하세요"}
            </p>
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>최고 {streak.maxStreak}일</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            총 {streak.totalSolveDays}일 학습
          </div>
          {streak.streakFreezes > 0 && (
            <div className="flex items-center justify-end gap-1 text-[10px] text-primary">
              <Shield className="h-3 w-3" />
              <span>프리즈 {streak.streakFreezes}개</span>
            </div>
          )}
        </div>
      </div>

      {/* 프리즈 사용 알림 */}
      {streak.freezeUsedToday && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary-light px-3 py-1.5 text-[10px] text-primary">
          <Shield className="h-3 w-3" />
          프리즈가 사용되어 스트릭이 유지되었어요!
        </div>
      )}

      {/* 이번 주 학습 인디케이터 */}
      {streak.currentStreak > 0 && (
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < Math.min(streak.currentStreak, 7)
                  ? "bg-gradient-to-r from-orange-400 to-red-500"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
