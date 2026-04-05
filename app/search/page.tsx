"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Question } from "@/types/question";
import { loadAllQuestions } from "@/lib/questions";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await loadAllQuestions();
        setQuestions(all);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(questions, {
        keys: [
          { name: "문제_내용", weight: 0.4 },
          { name: "선택지", weight: 0.2 },
          { name: "근거법령", weight: 0.15 },
          { name: "대분류", weight: 0.1 },
          { name: "중분류", weight: 0.1 },
          { name: "analysis.keywords", weight: 0.05 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [questions]
  );

  const results = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    return fuse.search(query.trim(), { limit: 30 }).map((r) => r.item);
  }, [fuse, query]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <div className="space-y-4">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700">홈</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">검색</span>
      </nav>

      <h1 className="text-xl font-bold">문항 검색</h1>

      {/* 검색 입력 */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="키워드, 법령, 문제 내용으로 검색..."
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pl-10 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
          autoFocus
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="py-8 text-center text-sm text-slate-400">
          문항 데이터를 불러오는 중...
        </div>
      )}

      {/* 검색 안내 */}
      {!loading && !query.trim() && (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500">
            키워드를 입력하면 {questions.length}문항에서 검색합니다.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            예: 양도소득세, 부가가치세, 세율, 납세의무
          </p>
        </div>
      )}

      {/* 검색어가 너무 짧을 때 */}
      {!loading && query.trim().length === 1 && (
        <div className="py-8 text-center text-sm text-slate-400">
          2글자 이상 입력해주세요.
        </div>
      )}

      {/* 결과 없음 */}
      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-400">
          &ldquo;{query}&rdquo;에 대한 검색 결과가 없습니다.
        </div>
      )}

      {/* 결과 목록 */}
      {results.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400">{results.length}건</p>
          <div className="space-y-2">
            {results.map((q) => (
              <Link key={q.no} href={`/question/${q.no}`}>
                <Card className="cursor-pointer transition-colors hover:bg-slate-100">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {q.시험_구분} {q.직급}
                      </Badge>
                      <span className="text-xs text-slate-400">{q.시행년도}</span>
                      <span className="text-xs text-slate-400">#{q.문제번호}</span>
                      <span className="text-xs text-slate-400">{q.대분류} &gt; {q.중분류}</span>
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-2">
                      {q.문제_내용}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
