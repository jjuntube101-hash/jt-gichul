"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Target,
  BookOpen,
  TrendingDown,
  BarChart3,
  Calendar,
  AlertTriangle,
  Map,
  CheckCircle2,
} from "lucide-react";
import { useUserStage } from "@/hooks/useUserStage";
import { useAuth } from "@/hooks/useAuth";
import { useTopicMastery, type LawMastery } from "@/hooks/useTopicMastery";
import { getSupabase } from "@/lib/supabase";
import RoadmapCard from "@/components/roadmap/RoadmapCard";
import { getRoadmap } from "@/lib/roadmap";
import DailyBriefing from "@/components/engagement/DailyBriefing";

// ---------------------------------------------------------------------------
// D-day Badge — exam_date, exam_name 기반
// ---------------------------------------------------------------------------

function DdayBadge({
  examDate,
  examName,
}: {
  examDate: string | null;
  examName: string | null;
}) {
  if (!examDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate + "T00:00:00");
  const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000);

  // 시험이 지났으면 표시 안 함
  if (diff < 0) return null;

  const label = diff === 0 ? "D-Day" : `D-${diff}`;

  return (
    <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
      <Calendar className="h-3.5 w-3.5" />
      <span>
        {label}
        {examName ? ` \u00B7 ${examName}` : ""}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// useStudyProfile — exam_date, exam_name, weak_subjects 조회 + 자동 재평가
// ---------------------------------------------------------------------------

function useStudyProfile(userId: string | undefined, masteryData: LawMastery[], masteryLoading: boolean) {
  const [profile, setProfile] = useState<{
    examDate: string | null;
    examName: string | null;
    examTarget: string | null;
    weakSubjects: string[];
  }>({ examDate: null, examName: null, examTarget: null, weakSubjects: [] });

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    supabase
      .from("user_study_profiles")
      .select("exam_date, exam_name, exam_target, weak_subjects")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            examDate: data.exam_date ?? null,
            examName: data.exam_name ?? null,
            examTarget: data.exam_target ?? null,
            weakSubjects: Array.isArray(data.weak_subjects)
              ? data.weak_subjects
              : [],
          });
        }
      });
  }, [userId]);

  // 풀이 데이터 기반 약점과목 자동 재평가
  useEffect(() => {
    if (!userId || masteryLoading || masteryData.length === 0) return;

    // 법과목별 정답률 70% 미만 + 최소 5문항 풀이한 과목을 약점으로 판정
    const computedWeak = masteryData
      .filter((law) => law.totalSolved >= 5 && law.avgAccuracy < 70)
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
      .map((law) => law.law);

    // 현재 DB 값과 다를 때만 업데이트
    const currentSorted = [...profile.weakSubjects].sort().join(",");
    const computedSorted = [...computedWeak].sort().join(",");
    if (currentSorted === computedSorted) return;

    // 풀이 데이터가 충분하면 (전체 10문항 이상) 자동 갱신
    const totalSolved = masteryData.reduce((sum, l) => sum + l.totalSolved, 0);
    if (totalSolved < 10) return;

    setProfile((prev) => ({ ...prev, weakSubjects: computedWeak }));

    // DB에도 반영 (비동기, 실패 무시)
    const supabase = getSupabase();
    if (supabase) {
      supabase
        .from("user_study_profiles")
        .update({ weak_subjects: computedWeak, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .then(() => { /* ignore */ });
    }
  }, [userId, masteryData, masteryLoading, profile.weakSubjects]);

  return profile;
}

// ---------------------------------------------------------------------------
// NewUserBanner — 신규 유저 (<10문항)
// ---------------------------------------------------------------------------

function NewUserBanner({
  displayName,
  solveCount,
  examTarget,
  examDate,
  examName,
}: {
  displayName: string;
  solveCount: number;
  examTarget: string | null;
  examDate: string | null;
  examName: string | null;
}) {
  const goal = 10;
  const pct = Math.min(Math.round((solveCount / goal) * 100), 100);

  // 로드맵 미리보기: getRoadmap에서 실제 데이터 추출 (null-safe)
  const validTarget = examTarget === "7급" || examTarget === "9급" ? examTarget : "9급";
  const roadmap = getRoadmap(validTarget);
  const roadmapPreview = roadmap.weeks.slice(0, 3).map((w) => w.title);
  const totalWeeksLabel = `총 ${roadmap.totalWeeks}주 커리큘럼`;

  return (
    <section className="space-y-3">
      {/* 진행률 카드 */}
      <div className="rounded-xl border border-border bg-card p-4">
        {examDate && <DdayBadge examDate={examDate} examName={examName} />}
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-card-foreground">
              {displayName}님, 첫 목표: {goal}문항
            </p>

            {/* 프로그레스 바 */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {solveCount}/{goal}
              </span>
            </div>

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {goal}문항 완료 시 맞춤 학습 브리핑이 시작됩니다
            </p>

            <Link
              href="/practice?filter=random"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              다음 문제 풀기
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 로드맵 미리보기 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Map className="h-4 w-4 text-primary" />
          학습 로드맵 미리보기
        </div>
        <ul className="mt-2.5 space-y-2">
          {roadmapPreview.map((title, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span className="text-card-foreground">{title}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px]">
              ···
            </span>
            {totalWeeksLabel}
          </li>
        </ul>
        <Link
          href="/roadmap"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          전체 로드맵 보기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 10문항 달성 시 해금되는 기능 안내 */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <p className="text-xs font-bold text-card-foreground">
          {goal}문항 달성 시 해금
        </p>
        <ul className="mt-2 space-y-1.5">
          {[
            "오늘의 학습 브리핑",
            "AI 오답 진단",
            "맞춤 학습 로드맵",
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              {feat}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// RegularUserCard — 일반 유저 (10~500)
// ---------------------------------------------------------------------------

function RegularUserCard({
  solveCount,
  examDate,
  examName,
  weakSubjects,
}: {
  solveCount: number;
  examDate: string | null;
  examName: string | null;
  weakSubjects: string[];
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <DdayBadge examDate={examDate} examName={examName} />
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-light text-success">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-card-foreground">
              오늘의 할 일
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              <li>복습 3문항 + 신규 5문항</li>
              <li className="tabular-nums">
                누적 {solveCount.toLocaleString()}문항 완료
              </li>
            </ul>

            {/* 약점 과목 추천 */}
            {weakSubjects.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="flex items-center gap-1 text-xs font-semibold text-card-foreground">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  약점 과목
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {weakSubjects.map((subject) => (
                    <Link
                      key={subject}
                      href={`/practice?law=${encodeURIComponent(subject)}`}
                      className="inline-flex items-center gap-1 rounded-md bg-warning-light px-2 py-1 text-[11px] font-medium text-warning hover:opacity-80"
                    >
                      {subject} 풀기
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* 로드맵 카드 */}
      <RoadmapCard />
    </section>
  );
}

// ---------------------------------------------------------------------------
// PowerUserCard — 파워 유저 (500+)
// ---------------------------------------------------------------------------

function PowerUserCard({
  solveCount,
  examDate,
  examName,
  masteryData,
  masteryLoading,
}: {
  solveCount: number;
  examDate: string | null;
  examName: string | null;
  masteryData: LawMastery[];
  masteryLoading: boolean;
}) {
  // 약점 토픽: 정확도 낮은 순 상위 3개 (최소 3문항 이상 풀어본 것)
  const weakTopics = masteryData
    .flatMap((law) => law.topics)
    .filter((t) => t.total >= 3 && t.level !== "gold" && t.level !== "none")
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return (
    <section className="space-y-3">
      {/* 상단: 요약 + 로드맵 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <DdayBadge examDate={examDate} examName={examName} />
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-light text-warning">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-card-foreground">
              누적 {solveCount.toLocaleString()}문항
            </p>

            {/* 누적 문항 아래 간격 */}
          </div>
        </div>
      </div>


      {/* 로드맵 카드 */}
      <RoadmapCard />

      {/* 약점 토픽 */}
      {!masteryLoading && weakTopics.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-light text-danger">
              <TrendingDown className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-card-foreground">
                약점 토픽
              </p>
              <ul className="mt-1.5 space-y-1">
                {weakTopics.map((t) => (
                  <li
                    key={`${t.law}-${t.topic}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-card-foreground">
                      {t.law} &middot; {t.topic}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.accuracy}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// StageHome — 메인 래퍼
// ---------------------------------------------------------------------------

export default function StageHome() {
  const { stage, solveCount, loading } = useUserStage();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const { data: masteryData, loading: masteryLoading } = useTopicMastery();
  const { examDate, examName, examTarget, weakSubjects } = useStudyProfile(user?.id, masteryData, masteryLoading);

  // display_name 조회 (new 단계에서만 필요)
  useEffect(() => {
    if (!user || stage !== "new") return;

    const supabase = getSupabase();
    if (!supabase) return;

    supabase
      .from("user_study_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          setDisplayName(data.display_name);
        } else {
          // display_name 없으면 이메일 앞부분 사용
          setDisplayName(user.email?.split("@")[0] ?? "수험생");
        }
      });
  }, [user, stage]);

  if (loading) return null;
  if (stage === "anonymous") return null;

  return (
    <>
      {stage === "new" && (
        <NewUserBanner
          displayName={displayName}
          solveCount={solveCount}
          examTarget={examTarget}
          examDate={examDate}
          examName={examName}
        />
      )}
      {stage === "regular" && (
        <RegularUserCard
          solveCount={solveCount}
          examDate={examDate}
          examName={examName}
          weakSubjects={weakSubjects}
        />
      )}
      {stage === "power" && (
        <PowerUserCard
          solveCount={solveCount}
          examDate={examDate}
          examName={examName}
          masteryData={masteryData}
          masteryLoading={masteryLoading}
        />
      )}
    </>
  );
}
