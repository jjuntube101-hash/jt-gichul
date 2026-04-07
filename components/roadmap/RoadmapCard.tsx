"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, ChevronDown, Settings2 } from "lucide-react";
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
  type RoadmapConfig,
} from "@/lib/roadmap";

const SELECTED_WEEK_KEY = "jt_selected_week";

interface StudyProfile {
  exam_target: "9급" | "7급";
  exam_date: string | null;
  onboarding_completed: boolean;
  updated_at: string;
}

/** localStorage에서 사용자가 선택한 주차 불러오기 */
function getSavedWeek(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SELECTED_WEEK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 만료 체크: 같은 주인지 (월요일 기준)
    if (parsed.savedAt) {
      const saved = new Date(parsed.savedAt);
      const now = new Date();
      const dayDiff = Math.floor((now.getTime() - saved.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff > 7) return null; // 1주 지나면 리셋
    }
    return typeof parsed.week === "number" ? parsed.week : null;
  } catch {
    return null;
  }
}

function saveSelectedWeek(week: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SELECTED_WEEK_KEY,
    JSON.stringify({ week, savedAt: new Date().toISOString() }),
  );
}

export default function RoadmapCard() {
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<RoadmapConfig | null>(null);
  const [examTarget, setExamTarget] = useState<"9급" | "7급">("9급");
  const [suggestedWeek, setSuggestedWeek] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [weekProgress, setWeekProgress] = useState<WeekProgress | null>(null);
  const [showPicker, setShowPicker] = useState(false);
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

        const { data: profile } = await supabase
          .from("user_study_profiles")
          .select("exam_target, exam_date, onboarding_completed, updated_at")
          .eq("user_id", user!.id)
          .single();

        if (!profile?.onboarding_completed || !profile.exam_target) return;

        const sp = profile as StudyProfile;
        const rm = getRoadmap(sp.exam_target);
        const suggested = getCurrentWeek(sp.updated_at, rm.totalWeeks, sp.exam_date);

        setRoadmap(rm);
        setExamTarget(sp.exam_target);
        setSuggestedWeek(suggested);

        // 사용자 선택 주차 or 자동 추천 주차
        const saved = getSavedWeek();
        const weekNum = saved && saved >= 1 && saved <= rm.totalWeeks ? saved : suggested;
        setSelectedWeek(weekNum);

        // 풀이 기록 + 진행률
        const { data: solveRecords } = await supabase
          .from("solve_records")
          .select("question_no")
          .eq("user_id", user!.id);

        const solvedNos = new Set(
          (solveRecords ?? []).map((r: { question_no: number }) => r.question_no),
        );

        const allQ = await loadAllQuestions();
        const mapped = allQ.map((q) => ({
          no: q.no,
          대분류: q.대분류,
          소분류: q.소분류,
          직급: q.직급,
        }));

        const week = rm.weeks[weekNum - 1];
        if (week) {
          setWeekProgress(getWeekProgress(week, sp.exam_target, solvedNos, mapped));
        }
      } catch (err) {
        console.error("[RoadmapCard] load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // 주차 변경 핸들러
  const handleWeekChange = async (weekNum: number) => {
    if (!roadmap) return;
    setSelectedWeek(weekNum);
    saveSelectedWeek(weekNum);
    setShowPicker(false);

    // 진행률 재계산 (간단히 — 이미 로드된 데이터 없으므로 null로 표시)
    setWeekProgress(null);

    try {
      const supabase = getSupabase();
      if (!supabase || !user) return;

      const { data: solveRecords } = await supabase
        .from("solve_records")
        .select("question_no")
        .eq("user_id", user.id);

      const solvedNos = new Set(
        (solveRecords ?? []).map((r: { question_no: number }) => r.question_no),
      );

      const allQ = await loadAllQuestions();
      const mapped = allQ.map((q) => ({
        no: q.no,
        대분류: q.대분류,
        소분류: q.소분류,
        직급: q.직급,
      }));

      const week = roadmap.weeks[weekNum - 1];
      if (week) {
        setWeekProgress(getWeekProgress(week, examTarget, solvedNos, mapped));
      }
    } catch {
      // 진행률 계산 실패 무시
    }
  };

  if (!user || loading || !roadmap) return null;

  const week = roadmap.weeks[selectedWeek - 1];
  if (!week) return null;

  const pct = weekProgress?.rate ?? 0;
  const isUserSelected = selectedWeek !== suggestedWeek;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          이번 주 학습
        </h3>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <Settings2 className="h-3 w-3" />
          {selectedWeek}/{roadmap.totalWeeks}주차
          <ChevronDown className={`h-3 w-3 transition-transform ${showPicker ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* 주차 선택 패널 */}
      {showPicker && (
        <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground">
            학습 범위를 직접 선택하세요
          </p>
          <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
            {roadmap.weeks.map((w) => (
              <button
                key={w.week}
                onClick={() => handleWeekChange(w.week)}
                className={`rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  w.week === selectedWeek
                    ? "bg-primary text-white"
                    : w.week === suggestedWeek
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {w.week}주
              </button>
            ))}
          </div>
          {isUserSelected && (
            <button
              onClick={() => handleWeekChange(suggestedWeek)}
              className="text-[10px] text-primary hover:underline"
            >
              추천 주차({suggestedWeek}주차)로 돌아가기
            </button>
          )}
        </div>
      )}

      {/* 주차 제목 */}
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{selectedWeek}주차</span>
        {" — "}
        {week.title}
        {isUserSelected && (
          <span className="ml-1.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
            직접 선택
          </span>
        )}
      </p>

      {/* 프로그레스 바 */}
      {weekProgress && (
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {weekProgress.solved}/{weekProgress.total} 문항 완료
            </span>
            <span className="font-bold text-primary">{pct}%</span>
          </div>
        </div>
      )}

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
