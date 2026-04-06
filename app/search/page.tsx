"use client";

import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import Fuse, { type FuseResult, type FuseResultMatch } from "fuse.js";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Clock, X, SlidersHorizontal } from "lucide-react";
import type { Question } from "@/types/question";
import { loadAllQuestions } from "@/lib/questions";
import { useDebounce } from "@/hooks/useDebounce";

// --- Constants ---
const RECENT_KEY = "jt-gichul-recent-searches";
const MAX_RECENT = 8;
const PAGE_SIZE = 20;
const FUSE_LIMIT = 100;
const MIN_YEAR = 2015;
const MAX_YEAR = 2025;

const SUGGESTED_KEYWORDS = ["양도소득세", "부가가치세", "세율", "납세의무", "가산세", "소득공제"];

// --- Highlight helper ---
function highlightText(
  text: string,
  matches: readonly FuseResultMatch[] | undefined,
  fieldKey: string,
): ReactNode {
  if (!matches || !text) return text;
  const match = matches.find((m) => m.key === fieldKey);
  if (!match?.indices?.length) return text;

  // Merge overlapping indices
  const sorted = [...match.indices].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1] + 1) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (cursor < s) parts.push(text.slice(cursor, s));
    parts.push(
      <mark key={s} className="bg-primary/20 text-primary font-medium rounded-sm px-0.5">
        {text.slice(s, e + 1)}
      </mark>,
    );
    cursor = e + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

// --- Rate color helper ---
function rateColor(rate: number) {
  if (rate >= 70) return "text-green-600";
  if (rate >= 40) return "text-amber-600";
  return "text-red-500";
}

// --- Recent searches ---
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // ignore quota errors
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTaxType, setFilterTaxType] = useState<"all" | "국세" | "지방세">("all");
  const [filterYearFrom, setFilterYearFrom] = useState(MIN_YEAR);
  const [filterYearTo, setFilterYearTo] = useState(MAX_YEAR);

  // Auto-correct invalid year range
  const effectiveYearFrom = Math.min(filterYearFrom, filterYearTo);
  const effectiveYearTo = Math.max(filterYearFrom, filterYearTo);
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(loadRecent());
  }, []);

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
        includeMatches: true,
        minMatchCharLength: 2,
      }),
    [questions],
  );

  // Fuse search + post-filter
  const { filtered, totalBeforeFilter } = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2)
      return { filtered: [], totalBeforeFilter: 0 };

    const raw = fuse.search(debouncedQuery.trim(), { limit: FUSE_LIMIT });
    const total = raw.length;

    const result = raw.filter((r) => {
      const q = r.item;
      if (filterTaxType !== "all" && q.tax_type !== filterTaxType) return false;
      if (q.시행년도 < effectiveYearFrom || q.시행년도 > effectiveYearTo) return false;
      if (filterDifficulty !== null && q.analysis?.difficulty !== filterDifficulty) return false;
      return true;
    });

    return { filtered: result, totalBeforeFilter: total };
  }, [fuse, debouncedQuery, filterTaxType, effectiveYearFrom, effectiveYearTo, filterDifficulty]);

  // Reset pagination on query/filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedQuery, filterTaxType, effectiveYearFrom, effectiveYearTo, filterDifficulty]);

  // Save recent search (only when query has results)
  const hasResults = filtered.length > 0;
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2 && hasResults) {
      setRecentSearches((prev) => {
        const trimmed = debouncedQuery.trim();
        if (prev[0] === trimmed) return prev; // no change needed
        const updated = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
        saveRecent(updated);
        return updated;
      });
    }
  }, [debouncedQuery, hasResults]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const applyRecentSearch = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const removeRecent = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== term);
      saveRecent(updated);
      return updated;
    });
  }, []);

  const clearAllRecent = useCallback(() => {
    setRecentSearches([]);
    saveRecent([]);
  }, []);

  const isFilterActive =
    filterTaxType !== "all" ||
    effectiveYearFrom !== MIN_YEAR ||
    effectiveYearTo !== MAX_YEAR ||
    filterDifficulty !== null;

  const visibleResults = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  // Find the primary match field for a result
  function getMatchLabel(matches: readonly FuseResultMatch[] | undefined): string | null {
    if (!matches?.length) return null;
    const first = matches[0];
    if (first.key === "문제_내용") return null; // default, no label needed
    const labels: Record<string, string> = {
      선택지: "선택지",
      근거법령: "근거법령",
      대분류: "과목",
      중분류: "분류",
      "analysis.keywords": "키워드",
    };
    return labels[first.key ?? ""] ?? null;
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          홈
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">검색</span>
      </nav>

      <h1 className="text-xl font-bold text-foreground">문항 검색</h1>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="키워드, 법령, 문제 내용으로 검색..."
          className="w-full rounded-xl border border-border bg-card px-4 py-3 pl-10 pr-10 text-sm text-card-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoFocus
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="검색어 지우기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Toggle + Chips */}
      {debouncedQuery.trim().length >= 2 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isFilterActive
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            필터
            {isFilterActive && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {(filterTaxType !== "all" ? 1 : 0) +
                  (filterYearFrom !== MIN_YEAR || filterYearTo !== MAX_YEAR ? 1 : 0) +
                  (filterDifficulty !== null ? 1 : 0)}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
              {/* Tax Type */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  세목 구분
                </span>
                <div className="flex gap-1.5">
                  {(["all", "국세", "지방세"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterTaxType(t)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        filterTaxType === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "all" ? "전체" : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Range */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  출제 연도
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={filterYearFrom}
                    onChange={(e) => setFilterYearFrom(Number(e.target.value))}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-card-foreground"
                    aria-label="시작 연도"
                  >
                    {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ),
                    )}
                  </select>
                  <span className="text-xs text-muted-foreground">~</span>
                  <select
                    value={filterYearTo}
                    onChange={(e) => setFilterYearTo(Number(e.target.value))}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-card-foreground"
                    aria-label="종료 연도"
                  >
                    {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  난이도
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                        filterDifficulty === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label={`난이도 ${d}`}
                      aria-pressed={filterDifficulty === d}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {isFilterActive && (
                <button
                  onClick={() => {
                    setFilterTaxType("all");
                    setFilterYearFrom(MIN_YEAR);
                    setFilterYearTo(MAX_YEAR);
                    setFilterDifficulty(null);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">문항 데이터를 불러오는 중...</p>
        </div>
      )}

      {/* Empty state: recent + suggestions */}
      {!loading && !query.trim() && (
        <div className="space-y-6 py-6">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">최근 검색</span>
                <button
                  onClick={clearAllRecent}
                  className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  전체 삭제
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors group"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <button
                      onClick={() => applyRecentSearch(term)}
                      className="flex-1 text-left text-sm text-card-foreground"
                    >
                      {term}
                    </button>
                    <button
                      onClick={() => removeRecent(term)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      aria-label={`"${term}" 삭제`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested keywords */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">추천 검색어</span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  onClick={() => applyRecentSearch(kw)}
                  className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Total count */}
          <div className="text-center pt-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {questions.length.toLocaleString()}문항에서 검색할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* Too short */}
      {!loading && query.trim().length === 1 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          2글자 이상 입력해주세요.
        </div>
      )}

      {/* No results */}
      {!loading && debouncedQuery.trim().length >= 2 && filtered.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {totalBeforeFilter > 0
            ? `"${debouncedQuery}" 검색 결과 ${totalBeforeFilter}건 중 필터 조건에 맞는 항목이 없습니다.`
            : `"${debouncedQuery}"에 대한 검색 결과가 없습니다.`}
        </div>
      )}

      {/* Results */}
      {visibleResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {filtered.length}건
            {isFilterActive && totalBeforeFilter !== filtered.length && (
              <span className="ml-1">(전체 {totalBeforeFilter}건 중)</span>
            )}
          </p>
          <div className="space-y-2">
            {visibleResults.map((r) => {
              const q = r.item;
              const matchLabel = getMatchLabel(r.matches);
              const rate = q.analysis?.estimated_correct_rate ?? 0;
              const difficulty = q.analysis?.difficulty ?? 0;

              return (
                <Link key={q.no} href={`/question/${q.no}`}>
                  <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                    {/* Row 1: metadata */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 border-primary/20 text-primary"
                      >
                        {q.시험_구분} {q.직급}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{q.시행년도}</span>
                      <span className="text-[10px] text-muted-foreground">#{q.문제번호}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] shrink-0 ${
                          q.tax_type === "국세"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {q.tax_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {q.대분류} &gt; {q.중분류}
                      </span>
                    </div>

                    {/* Row 2: highlighted content */}
                    <div className="mb-2">
                      {matchLabel && (
                        <span className="text-[10px] text-primary/70 font-medium mr-1">
                          [{matchLabel}]
                        </span>
                      )}
                      <p className="text-sm leading-relaxed line-clamp-2 text-card-foreground inline">
                        {highlightText(q.문제_내용, r.matches, "문제_내용")}
                      </p>
                    </div>

                    {/* Row 3: difficulty + rate */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="flex items-center">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={`inline-block h-1.5 w-3 rounded-sm mr-0.5 ${
                                i < difficulty ? "bg-primary" : "bg-border"
                              }`}
                            />
                          ))}
                        </span>
                        난이도
                      </span>
                      <span className={rateColor(rate)}>정답률 {rate}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-medium text-card-foreground hover:border-primary/30 hover:shadow-sm transition-all"
              >
                더보기 ({filtered.length - visibleCount}건 남음)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
