"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, Check, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudyContext } from "@/hooks/useStudyContext";

/* ── Types ── */

interface PlanStep {
  title: string;
  href: string;
}

interface DailyPlanState {
  steps: [boolean, boolean, boolean];
  date: string;
}

/* ── Helpers ── */

function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function storageKey(date: string) {
  return `jt_daily_plan_${date}`;
}

function loadPlan(): DailyPlanState {
  const date = todayStr();
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (raw) {
      const parsed = JSON.parse(raw) as DailyPlanState;
      if (parsed.date === date && Array.isArray(parsed.steps) && parsed.steps.length === 3) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return { steps: [false, false, false], date };
}

function savePlan(state: DailyPlanState) {
  try {
    localStorage.setItem(storageKey(state.date), JSON.stringify(state));
  } catch { /* ignore */ }
}

/* ── Step generation ── */

function generateSteps(
  yesterdayWrong: { law: string; count: number }[],
  weakestLaw: { law: string; accuracy: number; total: number } | null,
): [PlanStep, PlanStep, PlanStep] {
  const step1: PlanStep =
    yesterdayWrong.length > 0
      ? { title: "어제 오답 복습", href: "/review" }
      : { title: "OX 퀴즈 30문", href: "/ox" };

  const step2: PlanStep = weakestLaw
    ? {
        title: `${weakestLaw.law} 집중 풀기`,
        href: `/practice?law=${encodeURIComponent(weakestLaw.law)}`,
      }
    : { title: "랜덤 10문 연습", href: "/practice?filter=random" };

  const step3: PlanStep = { title: "타이머 미니 테스트", href: "/timer" };

  return [step1, step2, step3];
}

/* ── Component ── */

export default function DailyStudyPlan() {
  const { user } = useAuth();
  const { yesterdayWrong, weakestLaw, loading } = useStudyContext();
  const [plan, setPlan] = useState<DailyPlanState | null>(null);

  useEffect(() => {
    if (!user) return;
    setPlan(loadPlan());

    function handleFocus() {
      setPlan(loadPlan());
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  const markComplete = useCallback(
    (index: number) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const next: DailyPlanState = {
          ...prev,
          steps: [...prev.steps] as [boolean, boolean, boolean],
        };
        next.steps[index] = true;
        savePlan(next);
        return next;
      });
    },
    [],
  );

  if (!user || loading || !plan) return null;

  const steps = generateSteps(yesterdayWrong, weakestLaw);
  const completed = plan.steps.filter(Boolean).length;
  const allDone = completed === 3;

  // First uncompleted step index
  const currentIdx = plan.steps.findIndex((done) => !done);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <ClipboardList className="h-4 w-4 text-primary" />
          오늘의 학습 플랜
        </h3>
        <span className="text-[10px] font-medium text-muted-foreground">
          {completed}/3 완료
        </span>
      </div>

      {/* Steps */}
      <div className="relative pl-4">
        {steps.map((step, idx) => {
          const done = plan.steps[idx];
          const isCurrent = idx === currentIdx;
          const isFuture = !done && idx > currentIdx && currentIdx !== -1;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="relative"
            >
              {/* Connecting line */}
              {idx < 2 && (
                <div
                  className={`absolute left-[7px] top-[28px] w-[2px] h-[calc(100%-4px)] ${
                    done ? "bg-success/40" : "bg-border"
                  }`}
                />
              )}

              <Link
                href={step.href}
                onClick={() => markComplete(idx)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1.5 transition-colors ${
                  done
                    ? "opacity-60"
                    : isCurrent
                      ? "border border-primary/40 bg-primary/5"
                      : isFuture
                        ? "opacity-40"
                        : ""
                }`}
              >
                {/* Step circle / check */}
                <div
                  className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : idx + 1}
                </div>

                {/* Title */}
                <span
                  className={`flex-1 text-xs font-medium ${
                    done
                      ? "line-through text-muted-foreground"
                      : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>

                {/* Arrow */}
                {!done && (
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isCurrent ? "text-primary" : "text-muted-foreground/50"
                    }`}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Celebration */}
      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 p-3 text-center"
        >
          <p className="text-xs font-bold text-success">
            <Check className="inline h-3.5 w-3.5 mr-1" />
            오늘 학습 완료!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
