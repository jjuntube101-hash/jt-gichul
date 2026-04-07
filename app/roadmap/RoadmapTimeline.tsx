"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Lock,
  Target,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { loadAllQuestions } from "@/lib/questions";
import {
  getRoadmap,
  getCurrentWeek,
  getWeekProgress,
  getWeekPracticeHref,
  type RoadmapConfig,
  type WeekProgress,
  type SubjectType,
} from "@/lib/roadmap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeekState {
  progress: WeekProgress;
  status: "done" | "current" | "future";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoadmapTimeline() {
  const { user, loading: authLoading } = useAuth();
  const [roadmap, setRoadmap] = useState<RoadmapConfig | null>(null);
  const [weekStates, setWeekStates] = useState<WeekState[]>([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [examTarget, setExamTarget] = useState<"9급" | "7급" | "회계" | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { data: profile } = await supabase
          .from("user_study_profiles")
          .select("exam_target, exam_date, onboarding_completed, updated_at")
          .eq("user_id", user!.id)
          .single();

        if (!profile?.onboarding_completed || !profile.exam_target) {
          return;
        }

        const target = profile.exam_target as "9급" | "7급" | "회계";
        setExamTarget(target);

        // 회계는 accounting subject, 세법은 exam_target으로 분기
        const isAccounting = target === "회계";
        const roadmapTarget = isAccounting ? "9급" : target; // getRoadmap의 첫 인자
        const subject: SubjectType = isAccounting ? "accounting" : "tax";
        const rm = getRoadmap(roadmapTarget, subject);
        setRoadmap(rm);

        const cw = getCurrentWeek(profile.updated_at, rm.totalWeeks, profile.exam_date);
        setCurrentWeek(cw);
        setExpandedWeek(cw >= 1 && cw <= rm.totalWeeks ? cw : null);

        // 풀이 기록
        const { data: solveRecords } = await supabase
          .from("solve_records")
          .select("question_no")
          .eq("user_id", user!.id);

        const solvedNos = new Set(
          (solveRecords ?? []).map(
            (r: { question_no: number }) => r.question_no,
          ),
        );

        const allQ = await loadAllQuestions();
        const mapped = allQ.map((q) => ({
          no: q.no,
          대분류: q.대분류,
          소분류: q.소분류,
          직급: q.직급,
        }));

        const states: WeekState[] = rm.weeks.map((week) => {
          const progress = getWeekProgress(week, roadmapTarget, solvedNos, mapped);
          let status: "done" | "current" | "future";
          if (week.week < cw) {
            status = "done";
          } else if (week.week === cw) {
            status = "current";
          } else {
            status = "future";
          }
          return { progress, status };
        });

        setWeekStates(states);
      } catch (err) {
        console.error("[RoadmapTimeline] load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, authLoading]);

  const toggleWeek = useCallback((weekNum: number) => {
    setExpandedWeek((prev) => (prev === weekNum ? null : weekNum));
  }, []);

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">
          로그인이 필요합니다
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          학습 로드맵을 사용하려면 먼저 로그인해 주세요.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white"
        >
          로그인
        </Link>
      </div>
    );
  }

  if (!roadmap || !examTarget) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Target className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">
          온보딩을 완료해 주세요
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          시험 목표를 설정하면 맞춤 로드맵이 생성됩니다.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            {examTarget} {roadmap.totalWeeks}주 커리큘럼
          </p>
          <p className="text-[11px] text-muted-foreground">
            현재 {currentWeek <= roadmap.totalWeeks ? `${currentWeek}주차` : "완료"}
          </p>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="relative pl-4">
        {roadmap.weeks.map((week, idx) => {
          const ws = weekStates[idx];
          if (!ws) return null;

          const isExpanded = expandedWeek === week.week;
          const isDone = ws.status === "done";
          const isCurrent = ws.status === "current";
          const isFuture = ws.status === "future";

          // 노드 색상
          const nodeClasses = isDone
            ? "bg-success text-white"
            : isCurrent
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground";

          // 연결선
          const lineClasses = isDone
            ? "bg-success/40"
            : isCurrent
              ? "bg-primary/30"
              : "bg-border";

          return (
            <div key={week.week} className="relative">
              {/* 연결선 */}
              {idx < roadmap.weeks.length - 1 && (
                <div
                  className={`absolute left-[9px] top-[32px] w-[2px] ${lineClasses}`}
                  style={{ height: isExpanded ? "calc(100% - 8px)" : "calc(100% - 8px)" }}
                />
              )}

              {/* 주차 헤더 */}
              <button
                type="button"
                onClick={() => toggleWeek(week.week)}
                className={`relative z-10 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  isCurrent
                    ? "border border-primary/30 bg-primary/5"
                    : isDone
                      ? "hover:bg-muted/50"
                      : "opacity-60 hover:opacity-80"
                }`}
              >
                {/* 노드 */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${nodeClasses}`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : week.week}
                </div>

                {/* 제목 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isCurrent
                          ? "text-foreground"
                          : isDone
                            ? "text-muted-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {week.week}주차: {week.title}
                    </span>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-white">
                        NOW
                      </span>
                    )}
                  </div>

                  {/* 미니 프로그레스 */}
                  {(isDone || isCurrent) && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? "bg-success" : "bg-primary"
                          }`}
                          style={{ width: `${ws.progress.rate}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {ws.progress.rate}%
                      </span>
                    </div>
                  )}
                </div>

                {/* 토글 아이콘 */}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* 확장 내용 */}
              {isExpanded && (
                <div className="ml-8 mt-1 mb-2 space-y-3 rounded-xl border border-border bg-card p-4">
                  {/* 핵심 포인트 */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      핵심 포인트
                    </p>
                    <p className="mt-0.5 text-xs text-foreground leading-relaxed">
                      {week.focus}
                    </p>
                  </div>

                  {/* 학습 법률 */}
                  {week.laws.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        학습 과목
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {week.laws.map((law) => (
                          <span
                            key={law}
                            className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
                          >
                            {law}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 토픽 */}
                  {week.topics.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        세부 토픽
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {week.topics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 진행률 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {ws.progress.solved}/{ws.progress.total} 문항
                      </span>
                      <span
                        className={`font-bold ${
                          ws.progress.rate >= 80
                            ? "text-success"
                            : ws.progress.rate >= 50
                              ? "text-primary"
                              : "text-warning"
                        }`}
                      >
                        {ws.progress.rate}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ws.progress.rate >= 80
                            ? "bg-success"
                            : ws.progress.rate >= 50
                              ? "bg-primary"
                              : "bg-warning"
                        }`}
                        style={{ width: `${ws.progress.rate}%` }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href={getWeekPracticeHref(week)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {isDone ? "복습하기" : "문제 풀기"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
