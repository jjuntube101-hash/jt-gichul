"use client";

import { useState, useEffect } from "react";
import { Search, AlertTriangle, BookOpen, Scale, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
// 로컬 타입 정의 (서버 모듈 의존성 제거)
interface DiagnosisType {
  trapType: string;
  trapDescription: string;
  correctAnswer: number;
  correctExplanation: string;
  wrongExplanation: string;
  lawRef: string;
  patternAlert: string | null;
  studyTip: string;
  generatedAt: string;
  ai?: Record<string, string>;
  aiGenerated?: boolean;
}

interface WrongAnswerDiagnosisProps {
  questionNo: number;
  selectedChoice: number;
}

type Status = "idle" | "loading" | "done" | "rate_limited" | "error" | "unauthenticated";

export default function WrongAnswerDiagnosis({
  questionNo,
  selectedChoice,
}: WrongAnswerDiagnosisProps) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [diagnosis, setDiagnosis] = useState<DiagnosisType | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("unauthenticated");
      return;
    }

    let cancelled = false;

    async function fetchDiagnosis() {
      setStatus("loading");
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setStatus("error");
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setStatus("unauthenticated");
          return;
        }

        const res = await fetch("/api/ai/wrong_answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ questionNo, selectedChoice }),
        });

        if (cancelled) return;

        if (res.status === 429) {
          setStatus("rate_limited");
          return;
        }

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const json = await res.json();
        setDiagnosis(json.data as DiagnosisType);
        setAiGenerated(json.aiGenerated === true);
        setStatus("done");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    fetchDiagnosis();
    return () => { cancelled = true; };
  }, [user, authLoading, questionNo, selectedChoice]);

  // --- 비로그인 ---
  if (status === "unauthenticated") {
    return (
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
          <Search className="h-4 w-4 text-primary" />
          오답 진단
        </h3>
        <div className="flex items-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <LogIn className="h-4 w-4 shrink-0" />
          <span>로그인하면 AI 오답 진단을 이용할 수 있습니다.</span>
        </div>
      </section>
    );
  }

  // --- 레이트 리밋 ---
  if (status === "rate_limited") {
    return (
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
          <Search className="h-4 w-4 text-primary" />
          오답 진단
        </h3>
        <div className="flex items-center gap-2 rounded-lg bg-warning-light p-4 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>오늘 10회 진단을 모두 사용했습니다. 내일 다시 이용해주세요.</span>
        </div>
      </section>
    );
  }

  // --- 로딩 ---
  if (status === "idle" || status === "loading") {
    return (
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
          <Search className="h-4 w-4 text-primary" />
          오답 진단
        </h3>
        <div className="space-y-2.5 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </section>
    );
  }

  // --- 에러 ---
  if (status === "error" || !diagnosis) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
          <Search className="h-4 w-4 text-primary" />
          오답 진단
        </h3>
        <p className="text-sm text-muted-foreground">진단 정보를 불러오지 못했습니다.</p>
      </section>
    );
  }

  // --- 결과 표시 ---
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
        <Search className="h-4 w-4 text-primary" />
        오답 진단
      </h3>

      {/* 함정 유형 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs font-bold text-card-foreground">
            함정: {diagnosis.trapType}
          </span>
        </div>
        <p className="text-base leading-relaxed text-muted-foreground pl-5.5">
          {diagnosis.trapDescription}
        </p>
      </div>

      {/* 선지 비교 */}
      <div className="space-y-2">
        <div className="rounded-lg bg-danger-light p-3 text-sm leading-relaxed">
          <span className="font-bold text-danger">
            {selectedChoice}번 (선택):
          </span>{" "}
          <span className="text-danger/80">{diagnosis.wrongExplanation}</span>
        </div>
        <div className="rounded-lg bg-success-light p-3 text-sm leading-relaxed">
          <span className="font-bold text-success">
            {diagnosis.correctAnswer}번 (정답):
          </span>{" "}
          <span className="text-success/80">{diagnosis.correctExplanation}</span>
        </div>
      </div>

      {/* 근거 법령 */}
      {diagnosis.lawRef ? (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Scale className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">근거:</span> {diagnosis.lawRef}
          </span>
        </div>
      ) : null}

      {/* 반복 패턴 경고 */}
      {diagnosis.patternAlert && (
        <div className="flex items-center gap-2 rounded-lg bg-warning-light p-3 text-sm text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">{diagnosis.patternAlert}</span>
        </div>
      )}

      {/* 학습 포인트 */}
      <div className="rounded-lg bg-primary-light p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          학습 포인트
        </div>
        <p className="text-sm leading-relaxed text-primary/80 pl-5">
          {diagnosis.studyTip}
        </p>
      </div>

      {/* AI 심층 분석 (Claude 보강 시) */}
      {aiGenerated && diagnosis.ai ? (
        <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI 심층 분석
          </div>
          <div className="space-y-2 pl-5">
            {diagnosis.ai.diagnosis ? (
              <p className="text-sm leading-relaxed text-card-foreground">{diagnosis.ai.diagnosis}</p>
            ) : null}
            {diagnosis.ai.key_point ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-card-foreground">핵심:</span> {diagnosis.ai.key_point}
              </p>
            ) : null}
            {diagnosis.ai.trap_warning ? (
              <p className="text-sm leading-relaxed text-warning">
                <span className="font-medium">주의:</span> {diagnosis.ai.trap_warning}
              </p>
            ) : null}
            {diagnosis.ai.study_tip ? (
              <p className="text-sm leading-relaxed text-primary/80">
                <span className="font-medium">팁:</span> {diagnosis.ai.study_tip}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
