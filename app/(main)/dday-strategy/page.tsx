"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, TrendingUp, BarChart3, ListChecks, Loader2, AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

// --- 인터페이스 ---

interface LawProgressItem {
  law: string;
  total: number;
  solved: number;
  accuracy: number;
  status: "complete" | "in_progress" | "not_started";
  priority: number;
}

interface DdayStrategyData {
  title: string;
  dDay: number;
  examName: string;
  examDate: string;
  currentPace: {
    totalSolved: number;
    totalQuestions: number;
    completionRate: number;
    weeklyAverage: number;
    dailyAverage: number;
  };
  projection: {
    questionsNeeded: number;
    dailyTarget: number;
    projectedCompletion: number;
    gapAnalysis: string;
  };
  lawProgress: LawProgressItem[];
  weeklyPlan: string[];
  generatedAt: string;
}

// --- 컴포넌트 ---

export default function DdayStrategyPage() {
  const { user, loading: authLoading } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<DdayStrategyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [examTarget, setExamTarget] = useState<string>("9급");

  // 사용자 프로필에서 exam_target 조회
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase
      .from("user_study_profiles")
      .select("exam_target")
      .eq("user_id", user.id)
      .single()
      .then(({ data: p }) => {
        if (p?.exam_target) setExamTarget(p.exam_target);
      });
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;

    setGenerating(true);
    setError(null);
    setErrorCode(null);
    setData(null);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase 미설정");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("인증 토큰 없음");

      const res = await fetch("/api/ai/dday_strategy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ examTarget }),
      });

      if (res.status === 429) {
        setError("이번 주 전략은 이미 생성했습니다.");
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        setErrorCode(json.code ?? null);
        setError(json.error ?? "전략 생성에 실패했습니다.");
        return;
      }

      setData(json.data as DdayStrategyData);
    } catch {
      setError("전략 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // --- 비로그인 ---
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <LogIn className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">로그인이 필요합니다.</p>
        <Link
          href="/login"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  // --- 로딩 ---
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // --- 생성 전 ---
  if (!data && !generating && !error) {
    return (
      <div className="space-y-6 py-2">
        <div className="rounded-2xl bg-card border border-border p-6 text-center">
          <Calendar className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-lg font-bold text-card-foreground mb-2">D-day 전략</h1>
          <p className="text-sm text-muted-foreground mb-6">
            시험일까지 남은 기간과 현재 페이스를 분석하여<br />
            팩트 기반 전략을 제시합니다.
          </p>
          <button
            onClick={handleGenerate}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            전략 생성하기
          </button>
          <p className="text-[10px] text-muted-foreground mt-3">주 1회 생성 가능</p>
        </div>
      </div>
    );
  }

  // --- 에러 ---
  if (error) {
    return (
      <div className="space-y-6 py-2">
        <div className="rounded-2xl bg-card border border-border p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-warning mb-4" />
          <p className="text-sm font-medium text-card-foreground mb-2">{error}</p>
          {errorCode === "EXAM_DATE_NOT_SET" ? (
            <Link
              href="/mypage"
              className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors mt-2"
            >
              마이페이지에서 시험일 설정
            </Link>
          ) : (
            <button
              onClick={() => { setError(null); setErrorCode(null); }}
              className="rounded-xl bg-muted px-5 py-2.5 text-sm font-medium text-card-foreground hover:bg-muted/80 transition-colors mt-2"
            >
              돌아가기
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- 생성 중 ---
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">전략을 분석 중입니다...</p>
      </div>
    );
  }

  // --- 결과 표시 ---
  if (!data) return null;

  const { currentPace, projection, lawProgress, weeklyPlan } = data;

  return (
    <div className="space-y-4 py-2">
      {/* 헤더 */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <h1 className="text-lg font-bold text-card-foreground">{data.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {data.examName} / {formatDate(data.examDate)}
        </p>
      </div>

      {/* 현재 페이스 */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-card-foreground mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          현재 페이스
        </h2>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">진행률</span>
            <span className="text-sm font-bold text-card-foreground">
              {currentPace.totalSolved.toLocaleString()}/{currentPace.totalQuestions.toLocaleString()} 완료 ({currentPace.completionRate}%)
            </span>
          </div>
          {/* 프로그레스 바 */}
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(currentPace.completionRate, 100)}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>주 평균 {currentPace.weeklyAverage}문항</span>
            <span>일 평균 {currentPace.dailyAverage}문항</span>
          </div>
        </div>
      </section>

      {/* 전망 */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-card-foreground mb-4">
          <BarChart3 className="h-4 w-4 text-info" />
          전망
        </h2>
        <div className="space-y-2">
          <Row label="남은 문항" value={`${projection.questionsNeeded.toLocaleString()}문항 / ${data.dDay}일`} />
          <Row label="일 목표" value={`${projection.dailyTarget}문항`} />
          <Row
            label="현 페이스 예상"
            value={`${projection.projectedCompletion.toLocaleString()}문항 소화`}
          />
          <div className="mt-2 rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-card-foreground">{projection.gapAnalysis}</p>
          </div>
        </div>
      </section>

      {/* 법률별 진행 */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-card-foreground mb-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          과목별 진행
        </h2>
        <div className="space-y-3">
          {lawProgress.map((lp) => (
            <LawProgressBar key={lp.law} item={lp} />
          ))}
        </div>
      </section>

      {/* 이번 주 플랜 */}
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-card-foreground mb-4">
          <ListChecks className="h-4 w-4 text-success" />
          이번 주 플랜
        </h2>
        <ol className="space-y-2">
          {weeklyPlan.map((plan, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-card-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {idx + 1}
              </span>
              <span>{plan}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 생성 시각 */}
      <p className="text-center text-[10px] text-muted-foreground pb-4">
        {new Date(data.generatedAt).toLocaleString("ko-KR")} 기준
      </p>
    </div>
  );
}

// --- 보조 컴포넌트 ---

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-card-foreground">{value}</span>
    </div>
  );
}

function LawProgressBar({ item }: { item: LawProgressItem }) {
  const pct = item.total > 0 ? Math.round((item.solved / item.total) * 100) : 0;
  const isComplete = item.status === "complete";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-card-foreground">
          {item.law}
          {isComplete && (
            <span className="ml-1.5 text-[10px] text-success font-normal">완료</span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {item.solved}/{item.total} ({pct}%)
          {item.solved > 0 && (
            <span className={`ml-1 ${item.accuracy >= 70 ? "text-success" : item.accuracy >= 50 ? "text-warning" : "text-danger"}`}>
              정답률 {item.accuracy}%
            </span>
          )}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            isComplete ? "bg-success" : pct > 0 ? "bg-primary" : "bg-muted-foreground/20"
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
