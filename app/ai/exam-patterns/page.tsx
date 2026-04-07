"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Eye,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface TopTrap {
  name: string;
  count: number;
  ratio: number;
}

interface ExamPattern {
  law: string;
  topic: string;
  total: number;
  recent_5y: number;
  avg_difficulty: number;
  avg_correct_rate: number;
  by_grade: Record<string, number>;
  by_year: Record<string, number>;
  top_traps: TopTrap[];
  question_types: { name: string; count: number }[];
}

export default function ExamPatternsPage() {
  const [data, setData] = useState<ExamPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/ai/exam_patterns.json")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  // Group by law
  const lawGroups = useMemo(() => {
    const map = new Map<string, ExamPattern[]>();
    for (const p of data) {
      if (!map.has(p.law)) map.set(p.law, []);
      map.get(p.law)!.push(p);
    }
    return Array.from(map.entries())
      .map(([law, topics]) => ({
        law,
        total: topics.reduce((s, t) => s + t.total, 0),
        topics: topics.sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const filteredGroups = selectedLaw
    ? lawGroups.filter((g) => g.law === selectedLaw)
    : lawGroups;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">분석 데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">출제자의 눈</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          토픽별 출제 빈도, 함정 패턴, 난이도를 한눈에. 총 {data.length}개 토픽 분석.
        </p>
      </motion.div>

      {/* Law filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLaw(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !selectedLaw
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          전체
        </button>
        {lawGroups.map((g) => (
          <button
            key={g.law}
            onClick={() => setSelectedLaw(g.law === selectedLaw ? null : g.law)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedLaw === g.law
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {g.law} ({g.total})
          </button>
        ))}
      </div>

      {/* Topic cards */}
      {filteredGroups.map((group) => (
        <section key={group.law}>
          <h2 className="text-sm font-bold text-foreground mb-2">
            {group.law}{" "}
            <span className="text-muted-foreground font-normal">
              ({group.total}문항)
            </span>
          </h2>
          <div className="space-y-2">
            {group.topics.map((topic, i) => {
              const key = `${topic.law}::${topic.topic}`;
              const isExpanded = expandedTopic === key;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedTopic(isExpanded ? null : key)}
                    className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {topic.topic}
                        </p>
                        <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
                          {topic.total}문항
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>최근5년 {topic.recent_5y}문항</span>
                        <span>난이도 {topic.avg_difficulty}</span>
                        <span>정답률 {topic.avg_correct_rate}%</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-3.5 py-3 space-y-3 bg-muted/30">
                      {/* Grade breakdown */}
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">
                          시험별 출제
                        </p>
                        <div className="flex gap-2">
                          {Object.entries(topic.by_grade).map(([grade, count]) => (
                            <span
                              key={grade}
                              className="rounded-lg bg-card border border-border px-2 py-1 text-xs"
                            >
                              {grade}{" "}
                              <span className="font-bold text-primary">{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Trap patterns */}
                      {topic.top_traps.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">
                            주요 함정 패턴
                          </p>
                          <div className="space-y-1">
                            {topic.top_traps.map((trap) => (
                              <div
                                key={trap.name}
                                className="flex items-center gap-2"
                              >
                                <div className="h-1.5 rounded-full bg-warning flex-1 max-w-[120px] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-warning"
                                    style={{ width: `${trap.ratio}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-foreground">
                                  {trap.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {trap.ratio}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Year trend */}
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">
                          연도별 추이
                        </p>
                        <div className="flex items-end gap-1 h-10">
                          {Object.entries(topic.by_year)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([year, count]) => (
                              <div
                                key={year}
                                className="flex flex-col items-center gap-0.5 flex-1"
                              >
                                <div
                                  className="w-full max-w-[16px] rounded-sm bg-primary"
                                  style={{
                                    height: `${Math.max(4, (count / Math.max(...Object.values(topic.by_year))) * 32)}px`,
                                  }}
                                />
                                <span className="text-[7px] text-muted-foreground">
                                  {String(year).slice(2)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* CTA */}
                      <Link
                        href={`/practice?law=${encodeURIComponent(topic.law)}&topic=${encodeURIComponent(topic.topic)}`}
                        className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
                      >
                        이 토픽 문제 풀기
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
