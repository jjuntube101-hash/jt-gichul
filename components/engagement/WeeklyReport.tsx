"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LawAccuracyEntry {
  correct: number;
  total: number;
}

interface WeeklyReportData {
  solveCount: number;
  oxCount: number;
  lawAccuracy: Record<string, LawAccuracyEntry>;
  conqueredTopics: string[];
}

interface QuestTrackerDay {
  solveCount?: number;
  oxCount?: number;
  correctCount?: number;
  totalCount?: number;
  /** per-law breakdown (optional – populated by practice/ox modes) */
  lawBreakdown?: Record<string, { correct: number; total: number }>;
}

// ---------------------------------------------------------------------------
// KST date helpers
// ---------------------------------------------------------------------------

function nowKST(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

/** YYYY-MM-DD in KST */
function formatDateKST(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO week number (Mon=1) */
function getISOWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Returns the Monday 00:00 KST for the week containing `d` */
function mondayOfWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(mon.getUTCDate() + diff);
  mon.setUTCHours(0, 0, 0, 0);
  return mon;
}

/** Week key like "2026-W15" */
function weekKey(d: Date): string {
  const wn = getISOWeek(d);
  return `${d.getUTCFullYear()}-W${String(wn).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// localStorage IO
// ---------------------------------------------------------------------------

const REPORT_PREFIX = "jt_weekly_report_";
const TRACKER_PREFIX = "jt_quest_tracker_";

function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded – ignore */
  }
}

// ---------------------------------------------------------------------------
// Aggregate quest_tracker daily entries into a WeeklyReportData
// ---------------------------------------------------------------------------

function aggregateWeek(monday: Date): WeeklyReportData {
  const result: WeeklyReportData = {
    solveCount: 0,
    oxCount: 0,
    lawAccuracy: {},
    conqueredTopics: [],
  };

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = formatDateKST(d);
    const day = loadJSON<QuestTrackerDay>(`${TRACKER_PREFIX}${dateStr}`);
    if (!day) continue;

    result.solveCount += day.solveCount ?? 0;
    result.oxCount += day.oxCount ?? 0;

    if (day.lawBreakdown) {
      for (const [law, entry] of Object.entries(day.lawBreakdown)) {
        if (!result.lawAccuracy[law]) {
          result.lawAccuracy[law] = { correct: 0, total: 0 };
        }
        result.lawAccuracy[law].correct += entry.correct;
        result.lawAccuracy[law].total += entry.total;
      }
    }
  }

  // conquered topics: laws with accuracy >= 80% and at least 5 questions
  for (const [law, entry] of Object.entries(result.lawAccuracy)) {
    if (entry.total >= 5 && entry.correct / entry.total >= 0.8) {
      result.conqueredTopics.push(law);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Visibility: show only Sun 18:00 KST ~ Mon 23:59 KST
// ---------------------------------------------------------------------------

function shouldShowReport(): boolean {
  const kst = nowKST();
  const dayOfWeek = kst.getUTCDay(); // 0=Sun
  const hour = kst.getUTCHours();

  if (dayOfWeek === 0 && hour >= 18) return true; // Sunday 18:00+
  if (dayOfWeek === 1) return true; // all day Monday
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeeklyReport() {
  const [open, setOpen] = useState(true);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<WeeklyReportData | null>(null);
  const [previous, setPrevious] = useState<WeeklyReportData | null>(null);

  const load = useCallback(() => {
    if (!shouldShowReport()) {
      setVisible(false);
      return;
    }
    setVisible(true);

    const kst = nowKST();
    const thisMonday = mondayOfWeek(kst);
    const thisKey = weekKey(kst);

    // Previous week monday
    const prevMonday = new Date(thisMonday);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    const prevKey = weekKey(prevMonday);

    // Try cached report first, otherwise aggregate from daily entries
    let thisReport = loadJSON<WeeklyReportData>(`${REPORT_PREFIX}${thisKey}`);
    if (!thisReport) {
      thisReport = aggregateWeek(thisMonday);
      saveJSON(`${REPORT_PREFIX}${thisKey}`, thisReport);
    }

    let prevReport = loadJSON<WeeklyReportData>(`${REPORT_PREFIX}${prevKey}`);
    if (!prevReport) {
      prevReport = aggregateWeek(prevMonday);
      if (prevReport.solveCount > 0) {
        saveJSON(`${REPORT_PREFIX}${prevKey}`, prevReport);
      }
    }

    setCurrent(thisReport);
    setPrevious(prevReport);
  }, []);

  useEffect(() => {
    load();
    // refresh when tab regains focus
    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [load]);

  if (!visible || !current || current.solveCount === 0) return null;

  const solveDelta = previous
    ? current.solveCount - previous.solveCount
    : current.solveCount;

  // per-law accuracy deltas
  const lawEntries = Object.entries(current.lawAccuracy)
    .map(([law, entry]) => {
      const pct = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
      const prevEntry = previous?.lawAccuracy[law];
      const prevPct =
        prevEntry && prevEntry.total > 0
          ? Math.round((prevEntry.correct / prevEntry.total) * 100)
          : null;
      return { law, pct, prevPct, total: entry.total };
    })
    .sort((a, b) => b.total - a.total);

  // weakest 2 laws for recommendation
  const weakest = [...lawEntries]
    .filter((e) => e.total >= 3)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header (always visible) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-card-foreground">
          <Trophy className="h-4 w-4 text-warning" />
          이번 주 학습 리포트
        </h3>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* -- Solve count comparison -- */}
              <div className="flex items-center gap-3 rounded-xl bg-primary-light p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <span className="text-lg font-bold text-primary">
                    {current.solveCount}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-card-foreground">
                    이번 주 풀이
                  </p>
                  {previous && previous.solveCount > 0 ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      지난주 대비{" "}
                      {solveDelta >= 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-success font-medium">
                          <TrendingUp className="h-3 w-3" />+{solveDelta}문항
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-danger font-medium">
                          <TrendingDown className="h-3 w-3" />
                          {solveDelta}문항
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      첫 주 학습 기록이에요!
                    </p>
                  )}
                </div>
              </div>

              {/* -- Per-law accuracy -- */}
              {lawEntries.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-card-foreground">
                    과목별 정답률
                  </p>
                  {lawEntries.map(({ law, pct, prevPct, total }) => {
                    const delta = prevPct !== null ? pct - prevPct : null;
                    return (
                      <div
                        key={law}
                        className="flex items-center justify-between rounded-xl bg-card border border-border px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-card-foreground truncate">
                            {law}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {total}문항
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-card-foreground">
                            {pct}%
                          </span>
                          {delta !== null && delta !== 0 && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                                delta > 0 ? "text-success" : "text-danger"
                              }`}
                            >
                              {delta > 0 ? (
                                <TrendingUp className="h-2.5 w-2.5" />
                              ) : (
                                <TrendingDown className="h-2.5 w-2.5" />
                              )}
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* -- Conquered topics -- */}
              {current.conqueredTopics.length > 0 && (
                <div className="rounded-xl bg-success-light p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs font-bold text-success">
                      이번 주 정복한 토픽
                    </span>
                    <span className="ml-auto text-xs font-bold text-success">
                      {current.conqueredTopics.length}개
                    </span>
                  </div>
                  <p className="text-[10px] text-success/80">
                    {current.conqueredTopics.join(", ")}
                  </p>
                </div>
              )}

              {/* -- Weakest law recommendation -- */}
              {weakest.length > 0 && (
                <div className="rounded-xl bg-warning-light p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs font-bold text-warning">
                      다음 주 추천 집중 과목
                    </span>
                  </div>
                  <div className="space-y-1">
                    {weakest.map(({ law, pct }) => (
                      <div
                        key={law}
                        className="flex items-center justify-between text-[10px]"
                      >
                        <span className="font-medium text-card-foreground">
                          {law}
                        </span>
                        <span className="text-warning font-bold">{pct}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    정답률이 낮은 과목을 집중 공략해보세요!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
