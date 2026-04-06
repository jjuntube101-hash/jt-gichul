"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ChevronRight, BookOpen, Flame } from "lucide-react";
import { loadQuestionsBySubject } from "@/lib/questions";
import { useSolveRecord } from "@/hooks/useSolveRecord";
import { useAppStore } from "@/stores/appStore";
import { trackOX } from "@/lib/questTracker";
import { adaptiveShuffle, type OXItemWithDifficulty } from "@/lib/adaptiveDifficulty";
import BadgeToast from "@/components/engagement/BadgeToast";
import SessionSummary from "@/components/engagement/SessionSummary";
import SubjectTabs from "@/components/home/SubjectTabs";
import type { SubjectType } from "@/types/question";

type OXItemWithMeta = OXItemWithDifficulty;

type TaxScope = "all" | "national" | "local";

const NATIONAL_LAWS = ["국세기본법", "국세징수법", "법인세법", "부가가치세법", "상속세 및 증여세법", "소득세법", "조세법 총론", "종합부동산세법"];

function isNationalLaw(law: string) { return NATIONAL_LAWS.includes(law); }

const SESSION_KEY = "jt_ox_session";

interface OXSession {
  currentIndex: number;
  stats: { correct: number; wrong: number };
  shuffleOrder: number[];
  taxScope: TaxScope;
}

export default function OXPage() {
  const [items, setItems] = useState<OXItemWithMeta[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<"O" | "X" | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [taxScope, setTaxScope] = useState<TaxScope>("all");
  const [started, setStarted] = useState(false);
  const [wrongByLaw, setWrongByLaw] = useState<Map<string, number>>(new Map());
  const [streak, setStreak] = useState(0);
  const { saveOX, newBadges, dismissNewBadges } = useSolveRecord();
  const setFocusMode = useAppStore((s) => s.setFocusMode);
  const subject = useAppStore((s) => s.subject);
  const isAccounting = subject === "accounting";
  const shuffleOrderRef = useRef<number[]>([]);

  const saveSession = useCallback((idx: number, st: { correct: number; wrong: number }, scope: TaxScope) => {
    try {
      const session: OXSession = {
        currentIndex: idx,
        stats: st,
        shuffleOrder: shuffleOrderRef.current,
        taxScope: scope,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const questions = await loadQuestionsBySubject(subject);
        const allOX: OXItemWithMeta[] = [];
        for (const q of questions) {
          if (q.analysis.ox_items) {
            for (const ox of q.analysis.ox_items) {
              allOX.push({
                ...ox,
                questionNo: q.no,
                law: q.대분류,
                difficulty: q.analysis.difficulty,
                correctRate: q.analysis.estimated_correct_rate,
              });
            }
          }
        }

        // 세션 복원 시도
        let restored = false;
        try {
          const saved = sessionStorage.getItem(SESSION_KEY);
          if (saved) {
            const session: OXSession = JSON.parse(saved);
            // 스코프 필터링 후 복원
            const scopeFilter = session.taxScope || "all";
            let filtered = allOX;
            if (scopeFilter === "national") filtered = allOX.filter(ox => isNationalLaw(ox.law));
            else if (scopeFilter === "local") filtered = allOX.filter(ox => !isNationalLaw(ox.law));

            if (session.shuffleOrder && session.shuffleOrder.length === filtered.length) {
              const reordered = session.shuffleOrder.map(i => filtered[i]);
              shuffleOrderRef.current = session.shuffleOrder;
              setItems(reordered);
              setCurrentIndex(session.currentIndex);
              setStats(session.stats);
              setTaxScope(scopeFilter);
              setStarted(true);
              setFocusMode(true);
              restored = true;
            }
          }
        } catch { /* new shuffle */ }

        if (!restored) {
          // 미시작 상태 — 전체 OX 아이템만 로드해두고 시작 대기
          setItems(allOX);
        }
      } catch (err) {
        console.error("OX load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    // 과목 변경 시 다시 로드
    setStarted(false);
    setLoading(true);
    load();
  }, [subject]);

  // 컴포넌트 언마운트 시 포커스 모드 해제
  useEffect(() => {
    return () => setFocusMode(false);
  }, [setFocusMode]);

  const startDrill = useCallback(() => {
    let filtered = items;
    if (taxScope === "national") filtered = items.filter(ox => isNationalLaw(ox.law));
    else if (taxScope === "local") filtered = items.filter(ox => !isNationalLaw(ox.law));

    // 적응형 셔플: 난이도 기반 인터리빙
    const shuffled = adaptiveShuffle(filtered);
    const indices = shuffled.map((_, i) => i);
    shuffleOrderRef.current = indices;
    setItems(shuffled);
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0 });
    setStarted(true);
    setFocusMode(true);
    saveSession(0, { correct: 0, wrong: 0 }, taxScope);
  }, [items, taxScope, saveSession, setFocusMode]);

  const current = items[currentIndex];

  const handleAnswer = useCallback(
    (choice: "O" | "X") => {
      if (selected || !current) return;
      setSelected(choice);
      setShowResult(true);
      const isCorrect = choice === current.answer;
      const newStats = isCorrect
        ? { ...stats, correct: stats.correct + 1 }
        : { ...stats, wrong: stats.wrong + 1 };
      setStats(newStats);
      const newStreak = isCorrect ? streak + 1 : 0;
      setStreak(newStreak);
      trackOX(isCorrect, newStreak);
      if (!isCorrect) {
        setWrongByLaw(prev => {
          const next = new Map(prev);
          next.set(current.law, (next.get(current.law) ?? 0) + 1);
          return next;
        });
      }
      saveSession(currentIndex, newStats, taxScope);
      saveOX({ questionNo: current.questionNo, oxIndex: currentIndex, isCorrect });
    },
    [selected, current, currentIndex, saveOX, stats, saveSession, taxScope, streak]
  );

  const handleNext = useCallback(() => {
    setSelected(null);
    setShowResult(false);
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    saveSession(nextIdx, stats, taxScope);
  }, [currentIndex, stats, saveSession, taxScope]);

  const handleReset = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setStarted(false);
    setFocusMode(false);
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setStats({ correct: 0, wrong: 0 });
    setWrongByLaw(new Map());
    setStreak(0);
  }, [setFocusMode]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "o" || e.key === "O" || e.key === "1") {
        if (!selected) handleAnswer("O");
      } else if (e.key === "x" || e.key === "X" || e.key === "2") {
        if (!selected) handleAnswer("X");
      } else if ((e.key === "Enter" || e.key === " " || e.key === "ArrowRight") && selected) {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, handleAnswer, handleNext]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">OX 문항을 불러오는 중...</p>
      </div>
    );
  }

  // 스코프 선택 화면
  if (!started) {
    const nationalCount = items.filter(ox => isNationalLaw(ox.law)).length;
    const localCount = items.filter(ox => !isNationalLaw(ox.law)).length;
    const scopeCount = isAccounting
      ? items.length
      : taxScope === "national" ? nationalCount : taxScope === "local" ? localCount : items.length;

    return (
      <div className="space-y-6">
        <div className="text-center pt-8">
          <h1 className="text-xl font-bold text-foreground">OX 퀴즈</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            선지를 O/X로 빠르게 판단하는 훈련
          </p>
        </div>

        {/* 과목 선택 */}
        <SubjectTabs />

        {/* 국세/지방세 스코프 선택 (세법만) */}
        {!isAccounting && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center">범위 선택</p>
            <div className="flex rounded-xl bg-muted p-1 gap-1">
              {([
                { key: "all" as TaxScope, label: "전체", count: items.length },
                { key: "national" as TaxScope, label: "국세", count: nationalCount },
                { key: "local" as TaxScope, label: "지방세", count: localCount },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTaxScope(opt.key)}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                    taxScope === opt.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                  <span className="ml-1 text-[10px] opacity-60">{opt.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={startDrill}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          {scopeCount}문항 시작
        </button>

        <p className="text-center text-[10px] text-muted-foreground">
          키보드: O키=맞다 · X키=틀리다 · Enter=다음
        </p>
      </div>
    );
  }

  if (!current) {
    const wrongLaws = Array.from(wrongByLaw.entries())
      .map(([law, count]) => ({ law, count }))
      .sort((a, b) => b.count - a.count);

    return (
      <SessionSummary
        mode="ox"
        total={stats.correct + stats.wrong}
        correct={stats.correct}
        wrong={stats.wrong}
        wrongByLaw={wrongLaws}
        onReset={handleReset}
      />
    );
  }

  const total = stats.correct + stats.wrong;
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
  const progress = Math.min((currentIndex / items.length) * 100, 100);

  return (
    <div className="space-y-4">
      <BadgeToast badgeIds={newBadges} onDismiss={dismissNewBadges} />
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">
          OX 퀴즈{isAccounting ? " · 회계" : taxScope === "national" ? " · 국세" : taxScope === "local" ? " · 지방세" : ""}
        </h1>
        <div className="flex items-center gap-3 text-xs font-medium">
          {streak >= 3 && (
            <span className="flex items-center gap-0.5 text-orange-500">
              <Flame className={`h-3.5 w-3.5 ${streak >= 10 ? "animate-pulse" : ""}`} />
              <span className="text-[10px] font-bold">{streak}</span>
            </span>
          )}
          <span className="text-success">O {stats.correct}</span>
          <span className="text-danger">X {stats.wrong}</span>
          {total > 0 && <span className="text-muted-foreground">{accuracy}%</span>}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Question Info */}
      <div className="flex items-center gap-2">
        <Badge className="text-[10px] bg-primary-light text-primary">{current.law}</Badge>
        <Link
          href={`/question/${current.questionNo}`}
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          원문 #{current.questionNo}
        </Link>
        <span className="ml-auto text-[10px] text-muted-foreground">{currentIndex + 1} / {items.length}</span>
      </div>

      {/* Streak Banner */}
      <AnimatePresence>
        {streak >= 5 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
              streak >= 10
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse"
                : "bg-gradient-to-r from-orange-400 to-amber-400 text-white"
            }`}
          >
            <Flame className="inline h-3.5 w-3.5 mr-1" />
            {streak >= 10 ? `${streak}연속 정답! 대단해요!` : `${streak}연속 정답! 불꽃 모드!`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* OX Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className={`rounded-2xl border p-5 shadow-sm ${
            streak >= 10
              ? "border-orange-400 bg-card ring-2 ring-orange-400/20"
              : streak >= 3
              ? "border-orange-300/50 bg-card"
              : "border-border bg-card"
          }`}
        >
          <p className="text-sm leading-relaxed text-card-foreground">{current.ox_text}</p>
        </motion.div>
      </AnimatePresence>

      {/* O/X Buttons */}
      {!selected && (
        <div className="grid grid-cols-2 gap-3" data-no-transition>
          <motion.button
            onClick={() => handleAnswer("O")}
            className="flex h-16 items-center justify-center rounded-2xl border-2 border-success/30 bg-success-light text-2xl font-bold text-success transition-colors hover:border-success/60"
            whileTap={{ scale: 0.95 }}
          >
            O
          </motion.button>
          <motion.button
            onClick={() => handleAnswer("X")}
            className="flex h-16 items-center justify-center rounded-2xl border-2 border-danger/30 bg-danger-light text-2xl font-bold text-danger transition-colors hover:border-danger/60"
            whileTap={{ scale: 0.95 }}
          >
            X
          </motion.button>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div
              className={`rounded-xl p-3 text-center text-sm font-bold ${
                selected === current.answer
                  ? "bg-success-light text-success"
                  : "bg-danger-light text-danger"
              }`}
            >
              {selected === current.answer ? "정답!" : `오답 (정답: ${current.answer})`}
            </div>

            <div className="rounded-xl bg-muted p-3.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">근거:</span> {current.law_ref}
            </div>

            <motion.button
              onClick={handleNext}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              다음 문항
              <ChevronRight className="h-4 w-4" />
            </motion.button>
            <p className="text-center text-[10px] text-muted-foreground">
              Enter 또는 → 키로 넘어가기
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Separator className="bg-border" />
      <p className="text-center text-[10px] text-muted-foreground">
        키보드: O키=맞다 · X키=틀리다 · Enter=다음
      </p>
    </div>
  );
}
