"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import {
  ArrowLeft,
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Minus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (WeeklyReport 구조 — weeklyReportEngine.ts와 동일)
// ---------------------------------------------------------------------------

interface TopicAnalysis {
  law: string;
  topic: string;
  totalSolved: number;
  correctCount: number;
  accuracy: number;
  mainTrapTypes: string[];
  weakChoices: string[];
}

interface WeeklyReport {
  title: string;
  period: string;
  overallStats: {
    totalSolved: number;
    accuracy: number;
    improvement: number;
    studyTimeMinutes: number;
  };
  weakTopics: TopicAnalysis[];
  trapTypeBreakdown: {
    trapType: string;
    count: number;
    percentage: number;
  }[];
  recommendations: string[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WeeklyReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    async function fetchReport() {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Supabase 연결 실패");
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
          setLoading(false);
          return;
        }

        // 사용자 프로필에서 exam_target 조회
        const { data: profile } = await supabase
          .from("user_study_profiles")
          .select("exam_target")
          .eq("user_id", user!.id)
          .single();
        const userExamTarget = profile?.exam_target ?? "9급";

        const res = await fetch("/api/ai/weekly_report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ examTarget: userExamTarget }),
        });

        if (res.status === 429) {
          setError(
            "이번 주 보고서는 이미 생성했습니다. 다음 주 월요일에 갱신됩니다."
          );
          setLoading(false);
          return;
        }

        if (res.status === 401) {
          setError("인증이 필요합니다. 다시 로그인해주세요.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError("보고서 생성에 실패했습니다.");
          setLoading(false);
          return;
        }

        const json = await res.json();
        setReport(json.data as WeeklyReport);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [user, authLoading, router]);

  // --- 로딩 ---
  if (authLoading || loading) {
    return (
      <div className="space-y-4 py-2">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">보고서 생성 중...</p>
        </div>
      </div>
    );
  }

  // --- 비로그인 ---
  if (!user) return null;

  // --- 에러 ---
  if (error) {
    return (
      <div className="space-y-4 py-2">
        <Header />
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-warning mb-3" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            href="/mypage"
            className="mt-4 inline-block text-xs text-primary hover:underline"
          >
            마이페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // --- 데이터 없음 ---
  if (!report || report.overallStats.totalSolved === 0) {
    return (
      <div className="space-y-4 py-2">
        <Header />
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-card-foreground mb-1">
            이번 주 풀이 기록이 없습니다
          </p>
          <p className="text-xs text-muted-foreground">
            문항을 풀면 약점 분석 보고서가 생성됩니다.
          </p>
          <Link
            href="/practice?filter=random"
            className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            랜덤 문항 풀기
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  // --- 보고서 렌더링 ---
  const { overallStats, weakTopics, trapTypeBreakdown, recommendations } =
    report;

  return (
    <div className="space-y-5 py-2">
      <Header />

      {/* 제목 + 기간 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h1 className="text-base font-bold text-card-foreground">
          {report.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{report.period}</p>
      </motion.div>

      {/* 이번 주 요약 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <SectionTitle label="이번 주 요약" />
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="풀이"
            value={`${overallStats.totalSolved}`}
            unit="문항"
          />
          <SummaryCard
            label="정답률"
            value={`${overallStats.accuracy}`}
            unit="%"
            accent={
              overallStats.accuracy >= 70
                ? "success"
                : overallStats.accuracy >= 50
                ? "warning"
                : "danger"
            }
          />
          <SummaryCard
            label="학습시간"
            value={formatStudyTime(overallStats.studyTimeMinutes)}
            unit=""
          />
        </div>
        {overallStats.improvement !== 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {overallStats.improvement > 0 ? (
              <>
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <span className="text-success font-medium">
                  전주 대비 +{overallStats.improvement}%
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3.5 w-3.5 text-danger" />
                <span className="text-danger font-medium">
                  전주 대비 {overallStats.improvement}%
                </span>
              </>
            )}
          </div>
        )}
      </motion.section>

      {/* 약점 토픽 TOP 5 */}
      {weakTopics.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionTitle label="약점 토픽 TOP 5" />
          <div className="space-y-2">
            {weakTopics.map((t, i) => (
              <WeakTopicRow key={`${t.law}-${t.topic}`} rank={i + 1} topic={t} />
            ))}
          </div>
        </motion.section>
      )}

      {/* 함정유형별 오답 */}
      {trapTypeBreakdown.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionTitle label="함정유형별 오답" />
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {trapTypeBreakdown.map((trap) => (
              <TrapBar key={trap.trapType} trap={trap} />
            ))}
          </div>
        </motion.section>
      )}

      {/* 이번 주 권고 */}
      {recommendations.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionTitle label="이번 주 권고" />
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 text-xs text-card-foreground">
                <Minus className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/mypage"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </Link>
      <h1 className="text-sm font-bold text-foreground">약점 해부 보고서</h1>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h2 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-0.5 rounded-full bg-primary" />
      {label}
    </h2>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: "success" | "warning" | "danger";
}) {
  const colorMap = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };
  const valueColor = accent ? colorMap[accent] : "text-card-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>
        {value}
        {unit && (
          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function WeakTopicRow({
  rank,
  topic,
}: {
  rank: number;
  topic: TopicAnalysis;
}) {
  const barWidth = Math.max(topic.accuracy, 5);
  const barColor =
    topic.accuracy >= 70
      ? "bg-success"
      : topic.accuracy >= 50
      ? "bg-warning"
      : "bg-danger";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
            {rank}
          </span>
          <span className="text-xs font-medium text-card-foreground">
            {topic.law} / {topic.topic}
          </span>
        </div>
        <span className="text-xs font-bold text-card-foreground">
          {topic.accuracy}%
          <span className="text-[10px] font-normal text-muted-foreground ml-1">
            ({topic.correctCount}/{topic.totalSolved})
          </span>
        </span>
      </div>
      {/* Bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {/* Trap types */}
      {topic.mainTrapTypes.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {topic.mainTrapTypes.map((t) => (
            <span
              key={t}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TrapBar({
  trap,
}: {
  trap: { trapType: string; count: number; percentage: number };
}) {
  const barWidth = Math.max(trap.percentage, 3);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-card-foreground">{trap.trapType}</span>
        <span className="text-[10px] text-muted-foreground">
          {trap.count}회 ({trap.percentage}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}
