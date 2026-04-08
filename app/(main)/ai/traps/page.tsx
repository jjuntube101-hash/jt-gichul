"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";

interface TrapExample {
  no: number;
  choice: number;
  distortion: string;
  law: string;
  topic: string;
}

interface TrapPattern {
  name: string;
  description: string;
  count: number;
  top_laws: { law: string; count: number }[];
  examples: TrapExample[];
}

export default function TrapsPage() {
  const [data, setData] = useState<TrapPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/ai/trap_patterns.json")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const totalTraps = data.reduce((s, t) => s + t.count, 0);

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
          <ShieldAlert className="h-5 w-5 text-warning" />
          <h1 className="text-lg font-bold">함정 패턴 훈련소</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          출제자가 즐겨 쓰는 {data.length}가지 함정 유형. 총 {totalTraps.toLocaleString()}개 선지 분석.
        </p>
      </motion.div>

      {/* Overview bar chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-foreground mb-3">함정 유형별 빈도</p>
        <div className="space-y-2">
          {data.map((trap) => {
            const pct = Math.round((trap.count / totalTraps) * 100);
            return (
              <div key={trap.name} className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground w-20 shrink-0 truncate">
                  {trap.name}
                </span>
                <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-warning transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">
                  {trap.count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trap cards */}
      <div className="space-y-3">
        {data.map((trap, i) => {
          const isExpanded = expanded === trap.name;
          return (
            <motion.div
              key={trap.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : trap.name)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{trap.name}</p>
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
                      {trap.count}회
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {trap.description}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/30">
                  {/* Top laws */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">
                      자주 등장하는 법
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {trap.top_laws.map((l) => (
                        <span
                          key={l.law}
                          className="rounded-full bg-card border border-border px-2 py-0.5 text-[10px]"
                        >
                          {l.law} <span className="font-bold text-primary">{l.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Examples */}
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
                      실제 출제 예시
                    </p>
                    <div className="space-y-2">
                      {trap.examples.map((ex, j) => (
                        <Link
                          key={j}
                          href={`/question/${ex.no}`}
                          className="block rounded-lg border border-border bg-card p-2.5 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-medium text-primary">
                              #{ex.no}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {ex.law} &gt; {ex.topic} &middot; 선지 {ex.choice}
                            </span>
                          </div>
                          <p className="text-xs text-foreground line-clamp-2">
                            {ex.distortion}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
