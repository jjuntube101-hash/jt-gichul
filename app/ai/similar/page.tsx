"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { GitCompareArrows, ChevronRight } from "lucide-react";

interface SimilarGroup {
  base_no: number;
  related: number[];
  law: string;
  topic: string;
  years: number[];
  summary: string;
}

export default function SimilarPage() {
  const [data, setData] = useState<SimilarGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/ai/similar_questions.json")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const laws = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of data) map.set(g.law, (map.get(g.law) || 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [data]);

  const filtered = selectedLaw
    ? data.filter((g) => g.law === selectedLaw)
    : data;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <GitCompareArrows className="h-5 w-5 text-info" />
          <h1 className="text-lg font-bold">유사 문항 비교</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          같은 조문이 연도별로 어떻게 변형되었는지. {data.length}개 그룹, 총{" "}
          {data.reduce((s, g) => s + g.related.length + 1, 0).toLocaleString()}문항 연결.
        </p>
      </motion.div>

      {/* Law filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLaw(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !selectedLaw
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          전체 ({data.length})
        </button>
        {laws.map(([law, count]) => (
          <button
            key={law}
            onClick={() => setSelectedLaw(law === selectedLaw ? null : law)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedLaw === law
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {law} ({count})
          </button>
        ))}
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {filtered.slice(0, 50).map((group, i) => {
          const allNos = [group.base_no, ...group.related];
          return (
            <motion.div
              key={group.base_no}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="rounded-xl border border-border bg-card p-3.5"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold">{group.topic}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {group.law} &middot;{" "}
                    {group.years[0]}~{group.years[group.years.length - 1]}년 &middot;{" "}
                    {allNos.length}문항
                  </p>
                </div>
                <Link
                  href={`/practice?nos=${allNos.join(",")}`}
                  className="shrink-0 flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  모아 풀기
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Question chips */}
              <div className="flex flex-wrap gap-1.5">
                {allNos.map((no) => (
                  <Link
                    key={no}
                    href={`/question/${no}`}
                    className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground hover:border-primary/30 transition-colors"
                  >
                    #{no}
                  </Link>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length > 50 && (
        <p className="text-center text-xs text-muted-foreground py-4">
          상위 50개 그룹 표시 중 (전체 {filtered.length}개)
        </p>
      )}
    </div>
  );
}
