"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import type { Question } from "@/types/question";
import { loadAllQuestions, loadQuestionsBySubject } from "@/lib/questions";
import { useAppStore } from "@/stores/appStore";
import SubjectTabs from "@/components/home/SubjectTabs";

type SortOption = "default" | "difficulty-asc" | "difficulty-desc" | "rate-asc" | "rate-desc" | "year-desc";
type TaxScope = "all" | "national" | "local";

const NATIONAL_LAWS = ["국세기본법", "국세징수법", "법인세법", "부가가치세법", "상속세 및 증여세법", "소득세법", "조세법 총론", "종합부동산세법"];
const LOCAL_LAWS = ["지방세기본법", "지방세법", "지방세징수법", "지방세특례제한법"];

function isNationalLaw(law: string) { return NATIONAL_LAWS.includes(law); }

function PracticeContent() {
  const searchParams = useSearchParams();
  const law = searchParams.get("law");
  const topic = searchParams.get("topic");
  const filter = searchParams.get("filter");
  const scopeParam = searchParams.get("scope");
  const nosParam = searchParams.get("nos");
  const subjectParam = searchParams.get("subject");
  const yearParam = searchParams.get("year");

  const storeSubject = useAppStore((s) => s.subject);
  // URL의 subject 파라미터가 있으면 우선, 없으면 스토어 값 사용
  const subject = subjectParam === "accounting" ? "accounting" as const
    : subjectParam === "tax" ? "tax" as const
    : storeSubject;

  const isAccounting = subject === "accounting";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("default");
  const [trapFilter, setTrapFilter] = useState<string | null>(null);
  const [showTrapPanel, setShowTrapPanel] = useState(false);
  const [taxScope, setTaxScope] = useState<TaxScope>(
    scopeParam === "national" ? "national" : scopeParam === "local" ? "local" : "all"
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const all = await loadQuestionsBySubject(subject);
        let filtered: Question[];

        if (nosParam) {
          const nos = nosParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
          const allQ = await loadAllQuestions();
          const matched = nos
            .map((n) => allQ.find((q) => q.no === n))
            .filter((q): q is Question => q !== undefined);
          filtered = matched;
        } else if (filter === "random") {
          let pool = [...all];
          if (!isAccounting) {
            if (taxScope === "national") pool = pool.filter(q => isNationalLaw(q.대분류));
            else if (taxScope === "local") pool = pool.filter(q => !isNationalLaw(q.대분류));
          }
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          filtered = pool.slice(0, 10);
        } else if (filter === "recent") {
          let pool = [...all];
          if (!isAccounting) {
            if (taxScope === "national") pool = pool.filter(q => isNationalLaw(q.대분류));
            else if (taxScope === "local") pool = pool.filter(q => !isNationalLaw(q.대분류));
          }
          filtered = pool.sort((a, b) => b.시행년도 - a.시행년도 || b.no - a.no).slice(0, 20);
        } else if (yearParam) {
          const year = Number(yearParam);
          filtered = all.filter(q => q.시행년도 === year);
          if (!isAccounting) {
            if (taxScope === "national") filtered = filtered.filter(q => isNationalLaw(q.대분류));
            else if (taxScope === "local") filtered = filtered.filter(q => !isNationalLaw(q.대분류));
          }
        } else if (law && topic) {
          filtered = all.filter(q => q.대분류 === law && q.중분류 === topic);
        } else if (law) {
          filtered = all.filter(q => q.대분류 === law);
        } else {
          filtered = all;
          if (!isAccounting) {
            if (taxScope === "national") filtered = filtered.filter(q => isNationalLaw(q.대분류));
            else if (taxScope === "local") filtered = filtered.filter(q => !isNationalLaw(q.대분류));
          }
        }

        setQuestions(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "문항 로딩에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [law, topic, filter, taxScope, nosParam, yearParam, subject, isAccounting]);

  // 함정유형 목록 추출
  const trapTypes = useMemo(() => {
    const types = new Set<string>();
    for (const q of questions) {
      for (const ca of q.analysis.choices_analysis) {
        if (ca.trap_type) types.add(ca.trap_type);
      }
      for (const tp of q.analysis.trap_patterns) {
        types.add(tp);
      }
    }
    return Array.from(types).sort();
  }, [questions]);

  const sorted = useMemo(() => {
    let arr = [...questions];
    // 함정유형 필터 적용
    if (trapFilter) {
      arr = arr.filter((q) =>
        q.analysis.choices_analysis.some((ca) => ca.trap_type === trapFilter) ||
        q.analysis.trap_patterns.includes(trapFilter)
      );
    }
    switch (sort) {
      case "difficulty-asc": return arr.sort((a, b) => a.analysis.difficulty - b.analysis.difficulty);
      case "difficulty-desc": return arr.sort((a, b) => b.analysis.difficulty - a.analysis.difficulty);
      case "rate-asc": return arr.sort((a, b) => a.analysis.estimated_correct_rate - b.analysis.estimated_correct_rate);
      case "rate-desc": return arr.sort((a, b) => b.analysis.estimated_correct_rate - a.analysis.estimated_correct_rate);
      case "year-desc": return arr.sort((a, b) => b.시행년도 - a.시행년도 || b.no - a.no);
      default: return arr;
    }
  }, [questions, sort, trapFilter]);

  const scopeLabel = taxScope === "national" ? "국세" : taxScope === "local" ? "지방세" : "";
  const subjectLabel = isAccounting ? "회계" : "";
  let title = isAccounting ? "회계 전체 문항" : "전체 문항";
  if (nosParam) title = `맞춤 모의고사 (${sorted.length}문항)`;
  else if (filter === "random") title = [subjectLabel, scopeLabel, "랜덤 10문"].filter(Boolean).join(" ");
  else if (filter === "recent") title = [subjectLabel, scopeLabel, "최근 기출 20문"].filter(Boolean).join(" ");
  else if (law && topic) title = topic;
  else if (law) title = law;
  else if (scopeLabel) title = `${scopeLabel} 전체`;

  const showScopeFilter = !law && !topic && !isAccounting;

  const filterQuery = law
    ? `?from=practice&law=${encodeURIComponent(law)}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`
    : filter
      ? `?from=practice&filter=${filter}`
      : "?from=practice";

  return (
    <div className="space-y-4">
      {/* Subject Tabs */}
      {!law && !topic && !nosParam && (
        <SubjectTabs />
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">홈</Link>
        <ChevronRight className="h-3 w-3" />
        {law ? (
          <>
            <Link href="/practice" className="hover:text-foreground transition-colors">문항</Link>
            <ChevronRight className="h-3 w-3" />
            {topic ? (
              <>
                <Link href={`/practice?law=${encodeURIComponent(law)}`} className="hover:text-foreground transition-colors">{law}</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{topic}</span>
              </>
            ) : (
              <span className="text-foreground font-medium">{law}</span>
            )}
          </>
        ) : (
          <span className="text-foreground font-medium">{title}</span>
        )}
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {!loading && !error && (
          <span className="text-sm text-muted-foreground">{sorted.length}문항</span>
        )}
      </div>

      {/* Tax Scope Filter (세법 only) */}
      {showScopeFilter && (
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          {([
            { key: "all" as TaxScope, label: "전체" },
            { key: "national" as TaxScope, label: "국세" },
            { key: "local" as TaxScope, label: "지방세" },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTaxScope(opt.key)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                taxScope === opt.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Sort */}
      {!loading && !error && sorted.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "default" as SortOption, label: "기본" },
            { key: "year-desc" as SortOption, label: "최신순" },
            { key: "difficulty-desc" as SortOption, label: "난이도 높은순" },
            { key: "difficulty-asc" as SortOption, label: "난이도 낮은순" },
            { key: "rate-asc" as SortOption, label: "낮은정답률순" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === opt.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Trap Type Filter */}
      {!loading && !error && trapTypes.length > 0 && (
        <div>
          <button
            onClick={() => { setShowTrapPanel((p) => !p); if (trapFilter) { setTrapFilter(null); setShowTrapPanel(false); } }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors mb-2 ${
              trapFilter || showTrapPanel
                ? "bg-warning text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            {trapFilter ? `함정: ${trapFilter}` : "함정유형 필터"}
          </button>
          {showTrapPanel && !trapFilter && (
            <div className="flex flex-wrap gap-1.5">
              {trapTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => { setTrapFilter(type); setShowTrapPanel(false); }}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-warning hover:text-white transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="flex gap-2 mb-2">
                <div className="h-5 w-16 rounded bg-muted" />
                <div className="h-5 w-10 rounded bg-muted" />
              </div>
              <div className="h-4 w-full rounded bg-muted mb-1" />
              <div className="h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-center">
          <p className="text-sm text-danger mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-danger/10 px-4 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sorted.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground mb-2">해당 조건의 문항이 없습니다.</p>
          <Link href="/" className="text-xs text-primary hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      )}

      {/* Question List */}
      {!loading && !error && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((q) => (
            <Link key={q.no} href={`/question/${q.no}${filterQuery}`}>
              <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px] shrink-0 border-primary/20 text-primary">
                        {q.시험_구분} {q.직급}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{q.시행년도}</span>
                      <span className="text-[10px] text-muted-foreground">#{q.문제번호}</span>
                    </div>
                    <p className="text-base leading-relaxed line-clamp-2 text-card-foreground">
                      {q.문제_내용}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <DifficultyBar level={q.analysis.difficulty} />
                    <span className="text-[10px] text-muted-foreground">
                      {q.analysis.estimated_correct_rate}%
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DifficultyBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`난이도 ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-1.5 w-3 rounded-sm ${
            i <= level ? "bg-primary" : "bg-border"
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
            <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-4 w-full rounded bg-muted mb-1" />
              <div className="h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
