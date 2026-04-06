"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Target, Eye, ShieldCheck, Flame, Loader2, AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

interface MockExamComposition {
  weak: number;
  unseen: number;
  verify: number;
  challenge: number;
}

interface MockExamData {
  title: string;
  questionNos: number[];
  composition: MockExamComposition;
  focusAreas: string[];
  estimatedTime: number;
  generatedAt: string;
}

type ExamTarget = "9급" | "7급";

export default function MockExamPage() {
  const { user, loading: authLoading } = useAuth();
  const [examTarget, setExamTarget] = useState<ExamTarget>("9급");
  const [generating, setGenerating] = useState(false);
  const [examData, setExamData] = useState<MockExamData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!user) return;

    setGenerating(true);
    setError(null);
    setExamData(null);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase 미설정");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("인증 토큰 없음");

      const res = await fetch("/api/ai/mock_exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ examTarget }),
      });

      if (res.status === 429) {
        setError("오늘의 모의고사를 이미 생성했습니다. 내일 다시 시도해 주세요.");
        return;
      }

      if (res.status === 401) {
        setError("로그인이 필요합니다.");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? "모의고사 생성에 실패했습니다.");
      }

      const json = await res.json();
      setExamData(json.data as MockExamData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const practiceUrl = examData
    ? `/practice?nos=${examData.questionNos.join(",")}`
    : "#";

  // 비로그인 상태
  if (!authLoading && !user) {
    return (
      <div className="space-y-4">
        <Breadcrumb />
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
            <LogIn className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-card-foreground mb-2">
            로그인이 필요합니다
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            풀이 기록을 기반으로 맞춤 모의고사를 생성하려면 로그인이 필요합니다.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <LogIn className="h-4 w-4" />
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb />

      {/* 생성 전 */}
      {!examData && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-xl font-bold text-card-foreground mb-1">
            맞춤 모의고사
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            풀이 기록과 약점을 분석하여 최적의 문항을 배합합니다.
          </p>

          {/* 배합 비율 설명 */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <CompositionCard
              icon={<Target className="h-4 w-4" />}
              label="약점"
              percent={40}
              desc="정답률 낮은 토픽"
              color="text-danger"
              bg="bg-danger-light"
            />
            <CompositionCard
              icon={<Eye className="h-4 w-4" />}
              label="미풀이"
              percent={30}
              desc="아직 안 푼 문항"
              color="text-info"
              bg="bg-primary-light"
            />
            <CompositionCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label="검증"
              percent={20}
              desc="1회 맞춘 문항 재확인"
              color="text-success"
              bg="bg-success-light"
            />
            <CompositionCard
              icon={<Flame className="h-4 w-4" />}
              label="도전"
              percent={10}
              desc="고난도 문항"
              color="text-warning"
              bg="bg-warning-light"
            />
          </div>

          {/* 직급 선택 */}
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              시험 직급
            </p>
            <div className="flex rounded-xl bg-muted p-1 gap-1">
              {(["9급", "7급"] as ExamTarget[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setExamTarget(t)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    examTarget === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 문항수 + 예상시간 */}
          <p className="text-sm text-muted-foreground text-center mb-4">
            20문항 · 예상 30분
          </p>

          {/* 에러 */}
          {error && (
            <div className="mb-4 rounded-xl border border-danger/20 bg-danger-light p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={generating || authLoading}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                문항 배합 중...
              </>
            ) : (
              "모의고사 생성하기"
            )}
          </button>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            하루 1회 생성 가능
          </p>
        </div>
      )}

      {/* 생성 후 결과 */}
      {examData && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-xl font-bold text-card-foreground mb-4">
            {examData.title}
          </h1>

          {/* 배합 결과 */}
          <div className="space-y-2 mb-5">
            <CompositionRow
              icon={<Target className="h-3.5 w-3.5" />}
              label="약점"
              count={examData.composition.weak}
              areas={examData.focusAreas}
              color="text-danger"
              bg="bg-danger-light"
            />
            <CompositionRow
              icon={<Eye className="h-3.5 w-3.5" />}
              label="미풀이"
              count={examData.composition.unseen}
              color="text-info"
              bg="bg-primary-light"
            />
            <CompositionRow
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="검증"
              count={examData.composition.verify}
              color="text-success"
              bg="bg-success-light"
            />
            <CompositionRow
              icon={<Flame className="h-3.5 w-3.5" />}
              label="도전"
              count={examData.composition.challenge}
              color="text-warning"
              bg="bg-warning-light"
            />
          </div>

          {/* 총 문항 + 예상 시간 */}
          <div className="rounded-xl bg-muted p-3 mb-5 text-center">
            <span className="text-sm font-semibold text-foreground">
              {examData.questionNos.length}문항
            </span>
            <span className="text-sm text-muted-foreground mx-2">·</span>
            <span className="text-sm text-muted-foreground">
              예상 {examData.estimatedTime}분
            </span>
          </div>

          {/* 시작하기 */}
          <Link
            href={practiceUrl}
            className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            시작하기
          </Link>

          {/* 다시 생성 */}
          <button
            onClick={() => {
              setExamData(null);
              setError(null);
            }}
            className="w-full mt-2 rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20"
          >
            다른 설정으로 생성
          </button>
        </div>
      )}
    </div>
  );
}

// --- 하위 컴포넌트 ---

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        홈
      </Link>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">맞춤 모의고사</span>
    </nav>
  );
}

function CompositionCard({
  icon,
  label,
  percent,
  desc,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  percent: number;
  desc: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg} ${color}`}>
          {icon}
        </div>
        <div>
          <span className="text-xs font-bold text-card-foreground">{label}</span>
          <span className="text-xs text-muted-foreground ml-1">{percent}%</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">{desc}</p>
    </div>
  );
}

function CompositionRow({
  icon,
  label,
  count,
  areas,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  areas?: string[];
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-card-foreground">
            {label} {count}문항
          </span>
        </div>
        {areas && areas.length > 0 && (
          <p className="text-[10px] text-muted-foreground truncate">
            {areas.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
