"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";
import { getReviewStats, getTodayReviewCards } from "@/lib/spacedRepetition";

export default function SpacedReviewCard() {
  const [stats, setStats] = useState<{ todayDue: number; totalCards: number; masteredCards: number } | null>(null);

  useEffect(() => {
    const s = getReviewStats();
    if (s.totalCards > 0) setStats(s);
  }, []);

  if (!stats || stats.todayDue === 0) return null;

  return (
    <Link href="/review?tab=spaced">
      <div className="flex items-center gap-3 rounded-xl border border-info/30 bg-info/5 p-3.5 transition-all hover:border-info/50 hover:shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10">
          <Brain className="h-5 w-5 text-info" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-card-foreground">오늘 복습할 문항</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {stats.todayDue}문항 복습 대기 · 총 {stats.totalCards}문항 관리 중
            {stats.masteredCards > 0 && ` · ${stats.masteredCards}문항 마스터`}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-info shrink-0" />
      </div>
    </Link>
  );
}
