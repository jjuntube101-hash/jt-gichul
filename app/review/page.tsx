"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  BookOpen,
  RefreshCw,
  Filter,
  ChevronRight,
  AlertTriangle,
  Target,
  BarChart3,
  Clock,
} from "lucide-react";

interface WrongRecord {
  question_no: number;
  selected_choice: number;
  is_correct: boolean;
  created_at: string;
  mode: string;
}

type SortKey = "recent" | "count" | "law";
type FilterMode = "all" | "practice" | "ox";

export default function ReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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
        // 오답 기록 가져오기
        const { data } = await supabase
          .from("solve_records")
          .select("question_no, selected_choice, is_correct, created_at, mode")
          .eq("user_id", user.id)
          .eq("is_correct", false)
          .order("created_at", { ascending: false });

        const wrongRecords = data ?? [];
        setRecords(wrongRecords);

        // 해당 문항 데이터 로드
        if (wrongRecords.length > 0) {
          const allQ = await loadAllQuestions();
          const qMap = new Map<number, Question>();
          for (const q of allQ) {
            qMap.set(q.no, q);
          }
          setQuestions(qMap);
        }
      } catch (err) {
        console.error("오답 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, authLoading, router]);

  // 문항별 오답 횟수 집계
  const wrongCountMap = new Map<number, number>();
  for (const r of records) {
    wrongCountMap.set(r.question_no, (wrongCountMap.get(r.question_no) ?? 0) + 1);
  }

  // 중복 제거 (최신 기록만)
  const uniqueWrong = new Map<number, WrongRecord>();
  for (const r of records) {
    if (!uniqueWrong.has(r.question_no)) {
      uniqueWrong.set(r.question_no, r);
    }
  }

  // 필터 적용
  let filtered = Array.from(uniqueWrong.values());
  if (filter === "practice") {
    filtered = filtered.filter((r) => r.mode === "practice");
  } else if (filter === "ox") {
    // OX 모드에서 틀린 것은 solve_records에 없을 수 있으므로 practice/timer만
    filtered = filtered.filter((r) => r.mode !== "practice");
  }

  // 정렬
  if (sort === "recent") {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === "count") {
    filtered.sort(
      (a, b) => (wrongCountMap.get(b.question_no) ?? 0) - (wrongCountMap.get(a.question_no) ?? 0)
    );
  } else if (sort === "law") {
    filtered.sort((a, b) => {
      const qa = questions.get(a.question_no);
      const qb = questions.get(b.question_no);
      return (qa?.대분류 ?? "").localeCompare(qb?.대분류 ?? "");
    });
  }

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

          {/* Stats Summary */}
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
                        {/* Wrong Count Indicator */}
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
    </div>
  );
}
