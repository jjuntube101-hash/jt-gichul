"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Question } from "@/types/question";
import { loadAllQuestions } from "@/lib/questions";

type SortOption = "default" | "difficulty-asc" | "difficulty-desc" | "rate-asc" | "rate-desc" | "year-desc";

function PracticeContent() {
  const searchParams = useSearchParams();
  const law = searchParams.get("law");
  const topic = searchParams.get("topic");
  const filter = searchParams.get("filter");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("default");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const all = await loadAllQuestions();

        let filtered: Question[];

        if (filter === "random") {
          for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
          }
          filtered = all.slice(0, 10);
        } else if (filter === "recent") {
          filtered = [...all]
            .sort((a, b) => b.시행년도 - a.시행년도 || b.no - a.no)
            .slice(0, 20);
        } else if (law && topic) {
          filtered = all.filter(q => q.대분류 === law && q.중분류 === topic);
        } else if (law) {
          filtered = all.filter(q => q.대분류 === law);
        } else {
          filtered = all;
        }

        setQuestions(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "문항 로딩에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [law, topic, filter]);

  // 정렬 적용
  const sorted = useMemo(() => {
    const arr = [...questions];
    switch (sort) {
      case "difficulty-asc": return arr.sort((a, b) => a.analysis.difficulty - b.analysis.difficulty);
      case "difficulty-desc": return arr.sort((a, b) => b.analysis.difficulty - a.analysis.difficulty);
      case "rate-asc": return arr.sort((a, b) => a.analysis.estimated_correct_rate - b.analysis.estimated_correct_rate);
      case "rate-desc": return arr.sort((a, b) => b.analysis.estimated_correct_rate - a.analysis.estimated_correct_rate);
      case "year-desc": return arr.sort((a, b) => b.시행년도 - a.시행년도 || b.no - a.no);
      default: return arr;
    }
  }, [questions, sort]);

  // 페이지 제목 + 브레드크럼
  let title = "전체 문항";
  if (filter === "random") title = "랜덤 10문";
  else if (filter === "recent") title = "최근 기출 20문";
  else if (law && topic) title = topic;
  else if (law) title = law;

  // 문항 링크에 전달할 필터 쿼리
  const filterQuery = law
    ? `?from=practice&law=${encodeURIComponent(law)}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`
    : filter
      ? `?from=practice&filter=${filter}`
      : "?from=practice";

  return (
    <div className="space-y-4">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700">홈</Link>
        <span>/</span>
        {law ? (
          <>
            <Link href="/practice" className="hover:text-slate-700">문항</Link>
            <span>/</span>
            {topic ? (
              <>
                <Link href={`/practice?law=${encodeURIComponent(law)}`} className="hover:text-slate-700">{law}</Link>
                <span>/</span>
                <span className="text-slate-700 font-medium">{topic}</span>
              </>
            ) : (
              <span className="text-slate-700 font-medium">{law}</span>
            )}
          </>
        ) : (
          <span className="text-slate-700 font-medium">{title}</span>
        )}
      </nav>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        {!loading && !error && (
          <span className="text-sm text-slate-500">{sorted.length}문항</span>
        )}
      </div>

      {/* 정렬 버튼 */}
      {!loading && !error && sorted.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "default" as SortOption, label: "기본" },
            { key: "year-desc" as SortOption, label: "최신순" },
            { key: "difficulty-desc" as SortOption, label: "난이도↓" },
            { key: "difficulty-asc" as SortOption, label: "난이도↑" },
            { key: "rate-asc" as SortOption, label: "낮은정답률순" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                sort === opt.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border bg-white p-4 animate-pulse">
              <div className="flex gap-2 mb-2">
                <div className="h-5 w-16 rounded bg-slate-200" />
                <div className="h-5 w-10 rounded bg-slate-200" />
              </div>
              <div className="h-4 w-full rounded bg-slate-200 mb-1" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-800 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-red-100 px-4 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 문항 목록 */}
      {!loading && !error && sorted.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500 mb-2">해당 조건의 문항이 없습니다.</p>
          <Link href="/" className="text-xs text-blue-600 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((q) => (
            <Link key={q.no} href={`/question/${q.no}${filterQuery}`}>
              <Card className="cursor-pointer transition-colors hover:bg-slate-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {q.시험_구분} {q.직급}
                        </Badge>
                        <span className="text-xs text-slate-400">{q.시행년도}</span>
                        <span className="text-xs text-slate-400">#{q.문제번호}</span>
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-2">
                        {q.문제_내용}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <DifficultyDots level={q.analysis.difficulty} />
                      <span className="text-xs text-slate-400">
                        {q.analysis.estimated_correct_rate}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`난이도 ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i <= level ? "bg-slate-700" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-white p-4 animate-pulse">
              <div className="h-4 w-full rounded bg-slate-200 mb-1" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
