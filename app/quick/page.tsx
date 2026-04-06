"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { loadQuestionsBySubject } from "@/lib/questions";
import { useSolveRecord } from "@/hooks/useSolveRecord";
import { useAppStore } from "@/stores/appStore";
import { trackOX } from "@/lib/questTracker";

interface OXItem {
  ox_text: string;
  answer: "O" | "X";
  law_ref: string;
  questionNo: number;
  law: string;
}

const TOTAL_ITEMS = 5;
const TOTAL_TIME = 60;

export default function QuickQuizPage() {
  const [items, setItems] = useState<OXItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<"O" | "X" | null>(null);
  const [results, setResults] = useState<("correct" | "wrong" | "skipped")[]>([]);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [phase, setPhase] = useState<"loading" | "playing" | "done">("loading");
  const [startTime] = useState(() => Date.now());
  const [elapsedAtEnd, setElapsedAtEnd] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { saveOX } = useSolveRecord();
  const setFocusMode = useAppStore((s) => s.setFocusMode);
  const subject = useAppStore((s) => s.subject);

  // Focus mode on mount/unmount
  useEffect(() => {
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [setFocusMode]);

  // Load questions and auto-start
  useEffect(() => {
    async function load() {
      const questions = await loadQuestionsBySubject(subject);
      const allOX: OXItem[] = [];
      for (const q of questions) {
        if (q.analysis.ox_items) {
          for (const ox of q.analysis.ox_items) {
            allOX.push({
              ...ox,
              questionNo: q.no,
              law: q.대분류,
            });
          }
        }
      }
      // Fisher-Yates shuffle
      for (let i = allOX.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOX[i], allOX[j]] = [allOX[j], allOX[i]];
      }
      setItems(allOX.slice(0, TOTAL_ITEMS));
      setResults(new Array(TOTAL_ITEMS).fill("skipped"));
      setPhase("playing");
    }
    load();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Finish when timer hits 0
  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setElapsedAtEnd(Math.round((Date.now() - startTime) / 1000));
    setPhase("done");
  }, [startTime]);

  useEffect(() => {
    if (phase === "playing" && timeLeft <= 0) {
      finish();
    }
  }, [timeLeft, phase, finish]);

  // Handle answer
  const handleAnswer = useCallback(
    (choice: "O" | "X") => {
      if (selected || phase !== "playing" || !items[currentIndex]) return;
      setSelected(choice);
      const isCorrect = choice === items[currentIndex].answer;

      setResults((prev) => {
        const next = [...prev];
        next[currentIndex] = isCorrect ? "correct" : "wrong";
        return next;
      });

      trackOX(isCorrect, 0);
      saveOX({
        questionNo: items[currentIndex].questionNo,
        oxIndex: currentIndex,
        isCorrect,
      });

      // Auto-advance after 1 second
      autoAdvanceRef.current = setTimeout(() => {
        const nextIdx = currentIndex + 1;
        if (nextIdx >= TOTAL_ITEMS) {
          finish();
        } else {
          setCurrentIndex(nextIdx);
          setSelected(null);
        }
      }, 1000);
    },
    [selected, phase, items, currentIndex, saveOX, finish],
  );

  // Cleanup auto-advance on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Restart with new random items
  const restart = useCallback(() => {
    setPhase("loading");
    setCurrentIndex(0);
    setSelected(null);
    setTimeLeft(TOTAL_TIME);
    setResults(new Array(TOTAL_ITEMS).fill("skipped"));

    (async () => {
      const questions = await loadQuestionsBySubject(subject);
      const allOX: OXItem[] = [];
      for (const q of questions) {
        if (q.analysis.ox_items) {
          for (const ox of q.analysis.ox_items) {
            allOX.push({
              ...ox,
              questionNo: q.no,
              law: q.대분류,
            });
          }
        }
      }
      for (let i = allOX.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOX[i], allOX[j]] = [allOX[j], allOX[i]];
      }
      setItems(allOX.slice(0, TOTAL_ITEMS));
      setPhase("playing");
    })();
  }, []);

  // --- Loading ---
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">퀴즈 준비 중...</p>
      </div>
    );
  }

  // --- Result ---
  if (phase === "done") {
    const correctCount = results.filter((r) => r === "correct").length;
    const skippedCount = results.filter((r) => r === "skipped").length;
    const elapsed = Math.min(elapsedAtEnd, TOTAL_TIME);
    const emoji =
      correctCount === 5
        ? "🎯"
        : correctCount >= 4
          ? "🔥"
          : correctCount >= 3
            ? "👍"
            : correctCount >= 2
              ? "💪"
              : "📚";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 pt-8"
      >
        <div className="text-center space-y-2">
          <p className="text-4xl">{emoji}</p>
          <h1 className="text-2xl font-bold text-foreground">
            {correctCount}/{TOTAL_ITEMS} 정답
          </h1>
          <p className="text-sm text-muted-foreground">{elapsed}초 소요</p>
          {skippedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {skippedCount}문항 미응답 (시간 초과)
            </p>
          )}
        </div>

        {/* Per-item results */}
        <div className="flex justify-center gap-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                r === "correct"
                  ? "bg-success-light text-success"
                  : r === "wrong"
                    ? "bg-danger-light text-danger"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {r === "correct" ? "O" : r === "wrong" ? "X" : "-"}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <motion.button
            onClick={restart}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            한 번 더!
          </motion.button>

          {correctCount < TOTAL_ITEMS && (
            <Link
              href="/review"
              className="block w-full text-center rounded-xl border border-border py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              틀린 문항은 오답노트에서 복습하세요 &rarr;
            </Link>
          )}

          <Link
            href="/"
            className="block w-full text-center rounded-xl border border-border py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            홈으로
          </Link>
        </div>
      </motion.div>
    );
  }

  // --- Playing ---
  const current = items[currentIndex];
  const timerPct = (timeLeft / TOTAL_TIME) * 100;
  const timerUrgent = timeLeft <= 10;

  return (
    <div className="space-y-4 pt-4">
      {/* Timer bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {currentIndex + 1}/{TOTAL_ITEMS}
          </span>
          <span
            className={`text-sm font-bold tabular-nums ${
              timerUrgent ? "text-danger animate-pulse" : "text-foreground"
            }`}
          >
            {timeLeft}초
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              timerUrgent ? "bg-danger" : "bg-primary"
            }`}
            initial={false}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {results.map((r, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === currentIndex
                ? "bg-primary scale-125"
                : r === "correct"
                  ? "bg-success"
                  : r === "wrong"
                    ? "bg-danger"
                    : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Statement card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm min-h-[120px] flex items-center"
        >
          <p className="text-sm leading-relaxed text-card-foreground">
            {current.ox_text}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* O/X Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => handleAnswer("O")}
          disabled={!!selected}
          className={`flex h-16 items-center justify-center rounded-2xl border-2 text-2xl font-bold transition-colors ${
            selected === "O"
              ? selected === current.answer
                ? "border-success bg-success-light text-success"
                : "border-danger bg-danger-light text-danger"
              : selected
                ? "border-border bg-muted text-muted-foreground opacity-50"
                : "border-success/30 bg-success-light text-success hover:border-success/60"
          }`}
          whileTap={!selected ? { scale: 0.95 } : undefined}
        >
          O
        </motion.button>
        <motion.button
          onClick={() => handleAnswer("X")}
          disabled={!!selected}
          className={`flex h-16 items-center justify-center rounded-2xl border-2 text-2xl font-bold transition-colors ${
            selected === "X"
              ? selected === current.answer
                ? "border-success bg-success-light text-success"
                : "border-danger bg-danger-light text-danger"
              : selected
                ? "border-border bg-muted text-muted-foreground opacity-50"
                : "border-danger/30 bg-danger-light text-danger hover:border-danger/60"
          }`}
          whileTap={!selected ? { scale: 0.95 } : undefined}
        >
          X
        </motion.button>
      </div>

      {/* Brief feedback after answering */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl p-2.5 text-center text-sm font-bold ${
              selected === current.answer
                ? "bg-success-light text-success"
                : "bg-danger-light text-danger"
            }`}
          >
            {selected === current.answer
              ? "정답!"
              : `오답 (정답: ${current.answer})`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
