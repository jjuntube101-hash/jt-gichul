"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { loadAllQuestions } from "@/lib/questions";
import type { Question } from "@/types/question";
import { formatAnswer } from "@/lib/answer";
import {
  getTodayReviewCards,
  getUpcomingCards,
  getReviewStats,
  type ReviewCard,
} from "@/lib/spacedRepetition";
import {
  BookOpen,
  RefreshCw,
  Filter,
  ChevronRight,
  AlertTriangle,
  Target,
  BarChart3,
  Clock,
  Brain,
  Play,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WrongRecord {
  question_no: number;
  selected_choice: number;
  is_correct: boolean;
  created_at: string;
  mode: string;
}

type SortKey = "recent" | "count" | "law";
type FilterMode = "all" | "practice" | "ox";
type TabKey = "wrong" | "spaced";

// ---------------------------------------------------------------------------
// 오답 바로 풀기 버튼
// ---------------------------------------------------------------------------

function QuickPracticeButton({ questionNos }: { questionNos: number[] }) {
  if (questionNos.length === 0) return null;

  const count = Math.min(questionNos.length, 10);
  const nos = questionNos.slice(0, 10).join(",");

  return (
    <Link
      href={`/practice?nos=${nos}`}
      className="flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
    >
      <Play className="h-3.5 w-3.5" />
      틀린 문제 {count}문항 바로 풀기
    </Link>
  );
}

// ---------------------------------------------------------------------------
// 간격 복습 탭
// ---------------------------------------------------------------------------

function SpacedReviewTab({ questions }: { questions: Map<number, Question> }) {
  const [todayCards, setTodayCards] = useState<ReviewCard[]>([]);
  const [upcomingCards, setUpcomingCards] = useState<ReviewCard[]>([]);
  const [stats, setStats] = useState<{ todayDue: number; totalCards: number; masteredCards: number } | null>(null);

  useEffect(() => {
    setTodayCards(getTodayReviewCards());
    setUpcomingCards(getUpcomingCards(7));
    setStats(getReviewStats());
  }, []);

  if (!stats || stats.totalCards === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-info/10">
          <Brain className="h-8 w-8 text-info" />
        </div>
        <div>
          <p className="text-base font-bold text-foreground">복습 카드가 없습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">
            문제를 틀리면 자동으로 간격 복습에 등록됩니다
          </p>
        </div>
      </div>
    );
  }

  const todayNos = todayCards.map((c) => c.questionNo);

  return (
    <div className="space-y-4">
      {/* 통계 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-info/10 p-3 text-center">
          <p className="text-xl font-bold text-info">{stats.todayDue}</p>
          <p className="text-[10px] text-info/70">오늘 복습</p>
        </div>
        <div className="rounded-xl bg-primary-light p-3 text-center">
          <p className="text-xl font-bold text-primary">{stats.totalCards}</p>
          <p className="text-[10px] text-primary/70">전체 카드</p>
        </div>
        <div className="rounded-xl bg-success-light p-3 text-center">
          <p className="text-xl font-bold text-success">{stats.masteredCards}</p>
          <p className="text-[10px] text-success/70">마스터</p>
        </div>
      </div>

      {/* 오늘 복습 바로 풀기 */}
      {todayCards.length > 0 && (
        <>
          <Link
            href={`/practice?nos=${todayNos.join(",")}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-info px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Play className="h-3.5 w-3.5" />
            오늘 복습 {todayCards.length}문항 바로 풀기
          </Link>

          <Separator className="bg-border" />

          <p className="text-xs font-bold text-foreground">오늘 복습 대상</p>
          {todayCards.map((card, idx) => {
            const q = questions.get(card.questionNo);
            if (!q) return null;
            return (
              <motion.div
                key={card.questionNo}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link href={`/question/${card.questionNo}?from=review`}>
                  <div className="rounded-xl border border-border bg-card p-3 transition-all hover:border-info/30 hover:shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10 text-xs font-bold text-info">
                        {card.repetitionCount}회
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-card-foreground line-clamp-1">
                          {q.문제_내용.slice(0, 60)}...
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge className="text-[10px] bg-primary-light text-primary">{q.대분류}</Badge>
                          <span>간격 {card.intervalDays}일</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </>
      )}

      {/* 예정 복습 */}
      {upcomingCards.length > 0 && (
        <>
          <Separator className="bg-border" />
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            이번 주 예정 ({upcomingCards.length}문항)
          </p>
          {upcomingCards.slice(0, 5).map((card) => {
            const q = questions.get(card.questionNo);
            if (!q) return null;
            return (
              <div key={card.questionNo} className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-card-foreground">{q.대분류} · {q.중분류}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{card.nextReviewDate} 예정</span>
                </div>
              </div>
            );
          })}
          {upcomingCards.length > 5 && (
            <p className="text-center text-[10px] text-muted-foreground">
              +{upcomingCards.length - 5}문항 더 예정
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ReviewPage
// ---------------------------------------------------------------------------

export default function ReviewPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    }>
      <ReviewPage />
    </Suspense>
  );
}

function ReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "spaced" ? "spaced" : "wrong";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [records, setRecords] = useState<WrongRecord[]>([]);
  const [questions, setQuestions] = useState<Map<number, Question>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("recent");
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    async function load() {
      const supabase = getSupabase();
      if (!supabase || !user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("solve_records")
          .select("question_no, selected_choice, is_correct, created_at, mode")
          .eq("user_id", user.id)
          .eq("is_correct", false)
          .order("created_at", { ascending: false });

        const wrongRecords = data ?? [];
        setRecords(wrongRecords);

        // 문항 데이터는 양쪽 탭 모두 필요
        const allQ = await loadAllQuestions();
        const qMap = new Map<number, Question>();
        for (const q of allQ) {
          qMap.set(q.no, q);
        }
        setQuestions(qMap);
      } catch (err) {
        console.error("오답 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, authLoading, router]);

  // 문항별 오답 횟수
  const wrongCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of records) {
      map.set(r.question_no, (map.get(r.question_no) ?? 0) + 1);
    }
    return map;
  }, [records]);

  // 중복 제거 (최신만)
  const uniqueWrong = useMemo(() => {
    const map = new Map<number, WrongRecord>();
    for (const r of records) {
      if (!map.has(r.question_no)) map.set(r.question_no, r);
    }
    return map;
  }, [records]);

  // 함정유형별 오답 분석
  const trapAnalysis = useMemo(() => {
    const trapMap = new Map<string, { count: number; questions: number[] }>();
    for (const r of Array.from(uniqueWrong.values())) {
      const q = questions.get(r.question_no);
      if (!q) continue;
      // 선택한 보기의 trap_type 확인
      const choiceAnalysis = q.analysis.choices_analysis?.find(
        (c) => c.choice_num === r.selected_choice
      );
      const trapType = choiceAnalysis?.trap_type;
      if (trapType) {
        const prev = trapMap.get(trapType) ?? { count: 0, questions: [] };
        prev.count += 1;
        prev.questions.push(r.question_no);
        trapMap.set(trapType, prev);
      }
      // 문항 전체 trap_patterns도 수집
      for (const pattern of q.analysis.trap_patterns ?? []) {
        if (pattern && pattern !== trapType) {
          const prev = trapMap.get(pattern) ?? { count: 0, questions: [] };
          // 중복 방지
          if (!prev.questions.includes(r.question_no)) {
            prev.count += 1;
            prev.questions.push(r.question_no);
          }
          trapMap.set(pattern, prev);
        }
      }
    }
    return Array.from(trapMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }, [uniqueWrong, questions]);

  // 필터 + 정렬
  const filtered = useMemo(() => {
    let arr = Array.from(uniqueWrong.values());
    if (filter === "practice") {
      arr = arr.filter((r) => r.mode === "practice");
    } else if (filter === "ox") {
      arr = arr.filter((r) => r.mode === "ox" || r.mode === "quick");
    }

    if (sort === "recent") {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "count") {
      arr.sort((a, b) => (wrongCountMap.get(b.question_no) ?? 0) - (wrongCountMap.get(a.question_no) ?? 0));
    } else if (sort === "law") {
      arr.sort((a, b) => {
        const qa = questions.get(a.question_no);
        const qb = questions.get(b.question_no);
        return (qa?.대분류 ?? "").localeCompare(qb?.대분류 ?? "");
      });
    }
    return arr;
  }, [uniqueWrong, filter, sort, wrongCountMap, questions]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-danger" />
          오답노트
        </h1>
        {records.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {uniqueWrong.size}문항 / {records.length}회 오답
          </span>
        )}
      </div>

      {/* 탭 전환: 오답 목록 / 간격 복습 */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          onClick={() => setTab("wrong")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            tab === "wrong"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          오답 목록
        </button>
        <button
          onClick={() => setTab("spaced")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            tab === "spaced"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain className="h-3.5 w-3.5" />
          간격 복습
        </button>
      </div>

      {/* 간격 복습 탭 */}
      {tab === "spaced" && <SpacedReviewTab questions={questions} />}

      {/* 오답 목록 탭 */}
      {tab === "wrong" && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
                <Target className="h-8 w-8 text-success" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  {records.length === 0 ? "오답이 없습니다" : "필터 조건에 맞는 오답이 없습니다"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {records.length === 0
                    ? "문제를 풀면 틀린 문제가 자동으로 모입니다"
                    : "다른 필터를 선택해보세요"}
                </p>
              </div>
              <Link
                href="/practice?filter=random"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                랜덤 10문 풀기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* 틀린 문제 바로 풀기 버튼 */}
              <QuickPracticeButton questionNos={filtered.map((r) => r.question_no)} />

              {/* Sort & Filter Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                  {(
                    [
                      { key: "recent", label: "최신순", icon: Clock },
                      { key: "count", label: "오답횟수순", icon: BarChart3 },
                      { key: "law", label: "과목별", icon: Filter },
                    ] as const
                  ).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setSort(key)}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                        sort === key
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-danger-light p-3 text-center">
                  <p className="text-xl font-bold text-danger">{uniqueWrong.size}</p>
                  <p className="text-[10px] text-danger/70">오답 문항</p>
                </div>
                <div className="rounded-xl bg-warning-light p-3 text-center">
                  <p className="text-xl font-bold text-warning">
                    {Array.from(wrongCountMap.values()).filter((c) => c >= 2).length}
                  </p>
                  <p className="text-[10px] text-warning/70">반복 오답</p>
                </div>
                <div className="rounded-xl bg-primary-light p-3 text-center">
                  <p className="text-xl font-bold text-primary">
                    {new Set(filtered.map((r) => questions.get(r.question_no)?.대분류).filter(Boolean)).size}
                  </p>
                  <p className="text-[10px] text-primary/70">취약 과목</p>
                </div>
              </div>

              {/* 함정유형 분석 */}
              {trapAnalysis.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    나의 약점 함정 유형
                  </p>
                  <div className="space-y-2">
                    {trapAnalysis.map(([trapType, data]) => {
                      const maxCount = trapAnalysis[0]?.[1]?.count ?? 1;
                      const pct = Math.round((data.count / maxCount) * 100);
                      return (
                        <div key={trapType}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-foreground">{trapType}</span>
                            <span className="text-[10px] text-muted-foreground">{data.count}회</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-warning transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    가장 많이 걸리는 함정: <span className="font-semibold text-warning">{trapAnalysis[0]?.[0]}</span>
                  </p>
                </div>
              )}

              <Separator className="bg-border" />

              {/* Wrong Question List */}
              <AnimatePresence mode="popLayout">
                {filtered.map((record, idx) => {
                  const q = questions.get(record.question_no);
                  if (!q) return null;
                  const wrongCount = wrongCountMap.get(record.question_no) ?? 1;

                  return (
                    <motion.div
                      key={record.question_no}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <Link href={`/question/${record.question_no}?from=review`}>
                        <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-danger/30 hover:shadow-sm">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                wrongCount >= 3
                                  ? "bg-danger text-white"
                                  : wrongCount >= 2
                                  ? "bg-warning-light text-warning"
                                  : "bg-danger-light text-danger"
                              }`}
                            >
                              {wrongCount >= 3 ? (
                                <AlertTriangle className="h-5 w-5" />
                              ) : (
                                `${wrongCount}회`
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-foreground line-clamp-2 leading-relaxed">
                                {q.문제_내용.slice(0, 80)}
                                {q.문제_내용.length > 80 ? "..." : ""}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <Badge className="text-[10px] bg-primary-light text-primary">
                                  {q.대분류}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {q.중분류}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  난이도 {q.analysis.difficulty}/5
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>#{q.no}</span>
                                <span>{q.시험_구분} {q.시행년도}</span>
                                <span className="text-danger">
                                  내 선택: {record.selected_choice}번 (정답: {formatAnswer(q.정답)})
                                </span>
                              </div>
                            </div>

                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-3" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </>
      )}
    </div>
  );
}
