"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { loadAllQuestions } from "@/lib/questions";
import type { Question } from "@/types/question";
import {
  ArrowLeft,
  BarChart3,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MockExamMeta {
  title: string;
  questionNos: number[];
  composition: { weak: number; unseen: number; verify: number; challenge: number };
  focusAreas: string[];
  estimatedTime: number;
  generatedAt: string;
}

interface SolveResult {
  questionNo: number;
  isCorrect: boolean;
  selectedChoice: number;
}

interface LawAnalysis {
  law: string;
  total: number;
  correct: number;
  accuracy: number;
  questions: { no: number; isCorrect: boolean }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_EXAM_KEY = "jt_mock_exam_data";

function loadMockExamMeta(): MockExamMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MOCK_EXAM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MockExamResultPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [meta, setMeta] = useState<MockExamMeta | null>(null);
  const [solveResults, setSolveResults] = useState<SolveResult[]>([]);
  const [questions, setQuestions] = useState<Map<number, Question>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const examMeta = loadMockExamMeta();
    if (!examMeta) {
      router.replace("/mock-exam");
      return;
    }
    setMeta(examMeta);
  }, [router]);

  useEffect(() => {
    if (!user || !meta) return;

    async function load() {
      try {
        const supabase = getSupabase();
        if (!supabase) return;

        // 모의고사 문항들의 풀이 기록 조회
        const { data: records } = await supabase
          .from("solve_records")
          .select("question_no, is_correct, selected_choice, created_at")
          .eq("user_id", user!.id)
          .in("question_no", meta!.questionNos)
          .order("created_at", { ascending: false });

        // 문항별 최신 기록만
        const latestMap = new Map<number, SolveResult>();
        for (const r of records ?? []) {
          if (!latestMap.has(r.question_no)) {
            latestMap.set(r.question_no, {
              questionNo: r.question_no,
              isCorrect: r.is_correct,
              selectedChoice: r.selected_choice,
            });
          }
        }
        setSolveResults(Array.from(latestMap.values()));

        // 문항 데이터 로드
        const allQ = await loadAllQuestions();
        const qMap = new Map<number, Question>();
        for (const q of allQ) qMap.set(q.no, q);
        setQuestions(qMap);
      } catch (err) {
        console.error("결과 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, meta]);

  // 분석 데이터 계산
  const analysis = useMemo(() => {
    if (!meta || solveResults.length === 0) return null;

    const totalQ = meta.questionNos.length;
    const solved = solveResults.length;
    const correct = solveResults.filter((r) => r.isCorrect).length;
    const wrong = solved - correct;
    const unsolved = totalQ - solved;
    const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;
    const score = Math.round((correct / totalQ) * 100); // 100점 만점

    // 과목별 분석
    const lawMap = new Map<string, LawAnalysis>();
    for (const result of solveResults) {
      const q = questions.get(result.questionNo);
      if (!q) continue;
      const law = q.대분류;
      if (!lawMap.has(law)) {
        lawMap.set(law, { law, total: 0, correct: 0, accuracy: 0, questions: [] });
      }
      const la = lawMap.get(law)!;
      la.total++;
      if (result.isCorrect) la.correct++;
      la.questions.push({ no: result.questionNo, isCorrect: result.isCorrect });
    }
    for (const la of lawMap.values()) {
      la.accuracy = la.total > 0 ? Math.round((la.correct / la.total) * 100) : 0;
    }
    const lawAnalysis = Array.from(lawMap.values()).sort((a, b) => a.accuracy - b.accuracy);

    // 난이도별 분석
    const difficultyStats = [1, 2, 3, 4, 5].map((d) => {
      const qs = solveResults.filter((r) => {
        const q = questions.get(r.questionNo);
        return q && q.analysis.difficulty === d;
      });
      const c = qs.filter((r) => r.isCorrect).length;
      return { difficulty: d, total: qs.length, correct: c, accuracy: qs.length > 0 ? Math.round((c / qs.length) * 100) : 0 };
    }).filter((d) => d.total > 0);

    return { totalQ, solved, correct, wrong, unsolved, accuracy, score, lawAnalysis, difficultyStats };
  }, [meta, solveResults, questions]);

  if (authLoading || loading || !meta) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">결과 분석 중...</p>
      </div>
    );
  }

  if (!analysis || analysis.solved === 0) {
    return (
      <div className="space-y-4">
        <Link href="/mock-exam" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> 모의고사
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-base font-bold text-card-foreground mb-2">풀이 기록이 없습니다</p>
          <p className="text-sm text-muted-foreground mb-4">모의고사를 먼저 풀어주세요.</p>
          <Link
            href={`/practice?nos=${meta.questionNos.join(",")}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            시작하기
          </Link>
        </div>
      </div>
    );
  }

  const scoreColor = analysis.score >= 80 ? "text-success" : analysis.score >= 60 ? "text-warning" : "text-danger";
  const scoreGrade =
    analysis.score >= 90 ? "A+" : analysis.score >= 80 ? "A" : analysis.score >= 70 ? "B" :
    analysis.score >= 60 ? "C" : analysis.score >= 50 ? "D" : "F";

  return (
    <div className="space-y-4 pb-8">
      {/* Navigation */}
      <Link href="/mock-exam" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> 모의고사
      </Link>

      {/* 제목 + 점수 */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs text-muted-foreground mb-1">{meta.title}</p>
        <div className="flex items-center justify-center gap-4 mb-3">
          <div>
            <p className={`text-5xl font-black ${scoreColor}`}>{analysis.score}</p>
            <p className="text-xs text-muted-foreground mt-1">점</p>
          </div>
          <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 ${
            analysis.score >= 80 ? "border-success" : analysis.score >= 60 ? "border-warning" : "border-danger"
          }`}>
            <span className={`text-xl font-black ${scoreColor}`}>{scoreGrade}</span>
          </div>
        </div>

        {/* 맞은/틀린/미풀이 */}
        <div className="flex justify-center gap-6 text-xs">
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {analysis.correct}맞음
          </span>
          <span className="flex items-center gap-1 text-danger">
            <XCircle className="h-3.5 w-3.5" /> {analysis.wrong}틀림
          </span>
          {analysis.unsolved > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {analysis.unsolved}미풀이
            </span>
          )}
        </div>
      </div>

      {/* 과목별 분석 */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          과목별 분석
        </h2>

        {analysis.lawAnalysis.map((la) => (
          <div key={la.law} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-card-foreground">{la.law}</span>
              <span className={`text-xs font-bold ${
                la.accuracy >= 80 ? "text-success" : la.accuracy >= 60 ? "text-warning" : "text-danger"
              }`}>
                {la.correct}/{la.total} ({la.accuracy}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  la.accuracy >= 80 ? "bg-success" : la.accuracy >= 60 ? "bg-warning" : "bg-danger"
                }`}
                style={{ width: `${la.accuracy}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 난이도별 분석 */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
          <Target className="h-4 w-4 text-warning" />
          난이도별 정답률
        </h2>

        <div className="grid grid-cols-5 gap-2">
          {analysis.difficultyStats.map((d) => (
            <div key={d.difficulty} className="text-center">
              <div className={`text-lg font-bold ${
                d.accuracy >= 80 ? "text-success" : d.accuracy >= 60 ? "text-warning" : "text-danger"
              }`}>
                {d.accuracy}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {d.difficulty}단계
              </div>
              <div className="text-[10px] text-muted-foreground">
                {d.correct}/{d.total}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 약점 과목 */}
      {analysis.lawAnalysis.filter((la) => la.accuracy < 70).length > 0 && (
        <div className="rounded-2xl border border-danger/20 bg-danger-light p-4 space-y-2">
          <h2 className="text-sm font-bold text-danger flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            집중 보강 필요
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {analysis.lawAnalysis
              .filter((la) => la.accuracy < 70)
              .map((la) => (
                <Link
                  key={la.law}
                  href={`/practice?law=${encodeURIComponent(la.law)}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-card/80 px-3 py-1.5 text-[11px] font-medium text-danger hover:bg-card transition-colors"
                >
                  {la.law} ({la.accuracy}%)
                  <ChevronRight className="h-3 w-3" />
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* 틀린 문제 바로 풀기 */}
      {analysis.wrong > 0 && (
        <Link
          href={`/practice?nos=${solveResults.filter((r) => !r.isCorrect).map((r) => r.questionNo).join(",")}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          틀린 {analysis.wrong}문항 다시 풀기
        </Link>
      )}

      {/* 새 모의고사 */}
      <Link
        href="/mock-exam"
        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30"
      >
        새 모의고사 생성
      </Link>
    </div>
  );
}
