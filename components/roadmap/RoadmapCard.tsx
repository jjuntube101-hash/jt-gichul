"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { loadAllQuestions } from "@/lib/questions";
import {
  getRoadmap,
  getCurrentWeek,
  getWeekProgress,
  getWeekPracticeHref,
  type WeekProgress,
  type RoadmapWeek,
} from "@/lib/roadmap";

interface StudyProfile {
  exam_target: "9급" | "7급";
  onboarding_completed: boolean;
  updated_at: string; // onboarding 완료 시점을 startDate로 사용
}

export default function RoadmapCard() {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<{
    week: RoadmapWeek;
    weekNum: number;
    totalWeeks: number;
    progress: WeekProgress;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const supabase = getSupabase();
        if (!supabase) return;

        // 온보딩 프로필 가져오기
        const { data: profile } = await supabase
          .from("user_study_profiles")
          .select("exam_target, onboarding_completed, updated_at")
          .eq("user_id", user!.id)
          .single();

        if (!profile || !profile.onboarding_completed || !profile.exam_target) {
          return;
        }

        const sp = profile as StudyProfile;
        const roadmap = getRoadmap(sp.exam_target);
        const currentWeek = getCurrentWeek(sp.updated_at, roadmap.totalWeeks);

        // 범위 밖이면 표시하지 않음
        if (currentWeek < 1 || currentWeek > roadmap.totalWeeks) return;

        const week = roadmap.weeks[currentWeek - 1];

        // 풀이 기록 가져오기
        const { data: solveRecords } = await supabase
          .from("solve_records")
          .select("question_no")
          .eq("user_id", user!.id);

        const solvedNos = new Set(
          (solveRecords ?? []).map((r: { question_no: number }) => r.question_no),
        );

        // 전체 문제 로드
        const allQ = await loadAllQuestions();
        const mapped = allQ.map((q) => ({
          no: q.no,
          대분류: q.대분류,
          소분류: q.소분류,
          직급: q.직급,
        }));

        const progress = getWeekProgress(week, sp.exam_target, solvedNos, mapped);

        setWeekData({
          week,
          weekNum: currentWeek,
          totalWeeks: roadmap.totalWeeks,
          progress,
        });
      } catch (err) {
        console.error("[RoadmapCard] load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // 로그인 안 했거나 데이터 없으면 렌더링 안 함
  if (!user || loading || !weekData) return null;

  const { week, weekNum, totalWeeks, progress } = weekData;
  const pct = progress.rate;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          이번 주 학습
        </h3>
        <span className="text-[10px] font-medium text-muted-foreground">
          {weekNum}/{totalWeeks}주차
        </span>
      </div>

      {/* 주차 제목 */}
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{weekNum}주차</span>
        {" — "}
        {week.title}
      </p>

      {/* 프로그레스 바 */}
      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {progress.solved}/{progress.total} 문항 완료
          </span>
          <span className="font-bold text-primary">{pct}%</span>
        </div>
      </div>

      {/* 핵심 포인트 */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {week.focus}
      </p>

      {/* CTA 버튼 */}
      <Link
        href={getWeekPracticeHref(week)}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        이번 주 문제 풀기
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>

      {/* 전체 로드맵 링크 */}
      <Link
        href="/roadmap"
        className="block text-center text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        전체 로드맵 보기
      </Link>
    </div>
  );
}
