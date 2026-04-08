"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Home,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Zap,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
// loadAllQuestions is dynamically imported in startTest
import { useSolveRecord } from "@/hooks/useSolveRecord";
import { useAppStore } from "@/stores/appStore";
import { trackSolve, trackTimerComplete } from "@/lib/questTracker";
import BadgeToast from "@/components/engagement/BadgeToast";
import type { Question } from "@/types/question";
import { isCorrectAnswer, formatAnswer } from "@/lib/answer";
import SubjectTabs from "@/components/home/SubjectTabs";

type Phase = "setup" | "solving" | "review" | "result";

const PRESETS = [
  { count: 5, minutes: 5, label: "미니 테스트" },
  { count: 10, minutes: 12, label: "하프 테스트" },
  { count: 20, minutes: 25, label: "실전 모의" },
  { count: 40, minutes: 50, label: "풀 세트" },
];

type TaxScope = "all" | "national" | "local";
const NATIONAL_LAWS = ["국세기본법", "국세징수법", "법인세법", "부가가치세법", "상속세 및 증여세법", "소득세법", "조세법 총론", "종합부동산세법"];

export default function TimerPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [taxScope, setTaxScope] = useState<TaxScope>("all");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const handleSubmitRef = useRef<() => void>(() => {});

  const { saveSolve, newBadges, dismissNewBadges } = useSolveRecord();
  const setFocusMode = useAppStore((s) => s.setFocusMode);
  const subject = useAppStore((s) => s.subject);
  const isAccounting = subject === "accounting";
  const router = useRouter();

  // 컴포넌트 언마운트 시 포커스 모드 해제
  useEffect(() => {
    return () => setFocusMode(false);
  }, [setFocusMode]);

  // 타이머 로직
  useEffect(() => {
    if (phase !== "solving" || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 시간 초과 → 제출 (풀이 기록 + 퀘스트 저장)
          handleSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isPaused]);

  const startTest = useCallback(async (count: number, minutes: number) => {
    setLoading(true);
    try {
      const { loadQuestionsBySubject } = await import("@/lib/questions");
      const all = await loadQuestionsBySubject(subject);
      let pool = [...all];
      if (!isAccounting) {
        if (taxScope === "national") pool = pool.filter(q => NATIONAL_LAWS.includes(q.대분류));
        else if (taxScope === "local") pool = pool.filter(q => !NATIONAL_LAWS.includes(q.대분류));
      }
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const qs = pool.slice(0, count);
      setQuestions(qs);
      setAnswers(new Map());
      setCurrentIdx(0);
      setTimeLeft(minutes * 60);
      setTotalTime(minutes * 60);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      setPhase("solving");
      setFocusMode(true);
    } catch (err) {
      console.error("문항 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [taxScope, setFocusMode, subject, isAccounting]);

  const handleSelect = useCallback(
    (choiceNum: number) => {
      const q = questions[currentIdx];
      if (!q) return;

      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(q.no, choiceNum);
        return next;
      });
    },
    [questions, currentIdx]
  );

  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  }, [currentIdx, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  }, [currentIdx]);

  // 결과 상태를 sessionStorage에 저장 (뒤로가기 시 복원용)
  const saveResultState = useCallback(() => {
    const state = {
      questions: questions.map(q => q.no),
      answers: Array.from(answers.entries()),
      totalTime,
      timeLeft,
    };
    sessionStorage.setItem("jt-timer-result", JSON.stringify(state));
  }, [questions, answers, totalTime, timeLeft]);

  // 페이지 로드 시 결과 상태 복원
  useEffect(() => {
    const saved = sessionStorage.getItem("jt-timer-result");
    if (saved && phase === "setup") {
      try {
        const state = JSON.parse(saved);
        if (state.questions?.length > 0) {
          // 복원 가능한 상태가 있으면 질문 데이터를 다시 로드
          (async () => {
            const { loadAllQuestions } = await import("@/lib/questions");
            const all = await loadAllQuestions(); // 모든 과목에서 복원
            const qMap = new Map(all.map(q => [q.no, q]));
            const restored = state.questions.map((no: number) => qMap.get(no)).filter(Boolean) as Question[];
            if (restored.length === state.questions.length) {
              setQuestions(restored);
              setAnswers(new Map(state.answers));
              setTotalTime(state.totalTime);
              setTimeLeft(state.timeLeft);
              setPhase("result");
            }
          })();
        }
      } catch {
        // 복원 실패 시 무시
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async () => {
    setPhase("result");
    if (timerRef.current) clearInterval(timerRef.current);

    // 풀이 기록 저장
    const elapsed = Date.now() - startTimeRef.current;
    for (const q of questions) {
      const selected = answers.get(q.no);
      if (selected !== undefined) {
        const correct = isCorrectAnswer(selected, q.정답);
        await saveSolve({
          questionNo: q.no,
          isCorrect: correct,
          selectedChoice: selected,
          timeSpentMs: Math.round(elapsed / questions.length),
          mode: "timer",
        });
        trackSolve(correct);
      }
    }
    trackTimerComplete();
  }, [questions, answers, saveSolve]);

  // ref 동기화 — 타이머 만료 시 최신 handleSubmit 호출 보장
  handleSubmitRef.current = handleSubmit;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 결과 화면 진입 시 sessionStorage에 저장
  useEffect(() => {
    if (phase === "result" && questions.length > 0) {
      saveResultState();
    }
  }, [phase, questions.length, saveResultState]);

  // 결과 계산
  const correctCount = questions.filter((q) => {
    const sel = answers.get(q.no);
    return sel !== undefined && isCorrectAnswer(sel, q.정답);
  }).length;
  const answeredCount = answers.size;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  // ===== SETUP =====
  if (phase === "setup") {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light mb-3">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">타이머 모드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            실전처럼 시간 제한을 두고 풀어보세요
          </p>
        </div>

        {/* 과목 선택 */}
        <SubjectTabs />

        {/* Tax Scope (세법만) */}
        {!isAccounting && (
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

        <div className="space-y-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.count}
              onClick={() => startTest(preset.count, preset.minutes)}
              disabled={loading}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-card-foreground">{preset.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {preset.count}문항 · {preset.minutes}분
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    문항당 {(preset.minutes / preset.count * 60).toFixed(0)}초
                  </span>
                  <Play className="h-4 w-4 text-primary" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // ===== SOLVING =====
  if (phase === "solving") {
    const q = questions[currentIdx];
    if (!q) return null;
    const selected = answers.get(q.no) ?? null;
    const timePercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
    const isLowTime = timeLeft < 60;

    return (
      <div className="space-y-3">
        <BadgeToast badgeIds={newBadges} onDismiss={dismissNewBadges} />

        {/* Timer Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm("시험을 종료하시겠습니까?")) {
                if (timerRef.current) clearInterval(timerRef.current);
                setFocusMode(false);
                setPhase("setup");
                router.push("/");
              }
            }}
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="나가기"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div
            className={`text-lg font-mono font-bold ${
              isLowTime ? "text-danger animate-pulse" : "text-foreground"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isLowTime ? "bg-danger" : "bg-primary"}`}
              initial={false}
              animate={{ width: `${timePercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {currentIdx + 1} / {questions.length}
          </span>
          <span>{answeredCount}문항 응답</span>
        </div>

        {/* Question Number Dots */}
        <div className="flex flex-wrap gap-1">
          {questions.map((qq, idx) => {
            const ans = answers.get(qq.no);
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={qq.no}
                onClick={() => setCurrentIdx(idx)}
                className={`h-7 w-7 rounded-md text-[10px] font-bold transition-all ${
                  isCurrent
                    ? "bg-primary text-white ring-2 ring-primary/30"
                    : ans !== undefined
                    ? "bg-primary-light text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Paused Overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-card border border-border p-8 text-center"
            >
              <Pause className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">일시정지</p>
              <p className="text-xs text-muted-foreground mt-1">
                탭하여 계속하기
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question */}
        {!isPaused && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* Question Info */}
              <div className="flex items-center gap-2">
                <Badge className="text-[10px] bg-primary-light text-primary">
                  {q.대분류}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{q.중분류}</span>
              </div>

              {/* Question Body */}
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap text-card-foreground">
                  {q.문제_내용}
                </p>
                {q.보기 && (
                  <div className="mt-3 rounded-lg bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {q.보기}
                  </div>
                )}
              </div>

              {/* Choices */}
              <div className="space-y-2" data-no-transition>
                {q.선택지.map((text, idx) => {
                  const choiceNum = idx + 1;
                  const isSelected = selected === choiceNum;

                  return (
                    <motion.button
                      key={choiceNum}
                      onClick={() => handleSelect(choiceNum)}
                      className={`w-full rounded-xl border-2 p-3.5 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary-light"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {choiceNum}
                        </span>
                        <span className="text-sm leading-relaxed flex-1 text-card-foreground">
                          {text}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation */}
        {!isPaused && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              이전
            </button>

            {currentIdx === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                제출하기
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== RESULT =====
  if (phase === "result") {
    return (
      <div className="space-y-6 py-4">
        <BadgeToast badgeIds={newBadges} onDismiss={dismissNewBadges} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-light mb-4">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">테스트 완료!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {questions.length}문항 중 {correctCount}문항 정답
          </p>
        </motion.div>

        {/* Score Card */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p
              className={`text-3xl font-bold ${
                accuracy >= 80 ? "text-success" : accuracy >= 60 ? "text-warning" : "text-danger"
              }`}
            >
              {accuracy}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">정답률</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {correctCount}/{questions.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">정답/전체</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {formatTime(totalTime - timeLeft)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">소요시간</p>
          </div>
        </div>

        {/* Question Review List */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">문항별 결과</h2>
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const selected = answers.get(q.no);
              const answered = selected !== undefined;
              const isCorrect = answered && isCorrectAnswer(selected, q.정답);

              return (
                <Link key={q.no} href={`/question/${q.no}?from=timer`}>
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm ${
                      !answered
                        ? "border-border bg-muted/50"
                        : isCorrect
                        ? "border-success/30 bg-success-light"
                        : "border-danger/30 bg-danger-light"
                    }`}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                      {idx + 1}
                    </span>
                    {answered ? (
                      isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-danger shrink-0" />
                      )
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-card-foreground truncate">
                        {q.문제_내용.slice(0, 60)}...
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge className="text-[9px] bg-primary-light text-primary">
                          {q.대분류}
                        </Badge>
                        {!answered && (
                          <span className="text-[9px] text-muted-foreground">미응답</span>
                        )}
                        {answered && !isCorrect && (
                          <span className="text-[9px] text-danger">
                            선택 {selected}번 → 정답 {formatAnswer(q.정답)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 다음 추천 */}
        <div className="space-y-2">
          {/* Wrong review CTA if there are wrong answers */}
          {correctCount < questions.length && (
            <Link href="/review">
              <div className="flex items-center justify-between rounded-xl border-2 border-danger/30 bg-danger-light p-4 transition-all hover:border-danger/50">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-danger" />
                  <div>
                    <p className="text-sm font-bold text-card-foreground">틀린 {questions.length - correctCount}문항 바로 복습</p>
                    <p className="text-[10px] text-muted-foreground">지금 복습하면 기억이 2배!</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-danger" />
              </div>
            </Link>
          )}
          {/* Contextual next activity */}
          {accuracy >= 80 ? (
            <Link href="/ox">
              <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success-light p-3 transition-all hover:border-success/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-success">OX 퀴즈로 속도 훈련 →</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-success" />
              </div>
            </Link>
          ) : (
            <Link href="/timer">
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-light p-3 transition-all hover:border-primary/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">다른 세트로 한 번 더 도전 →</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-primary" />
              </div>
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { sessionStorage.removeItem("jt-timer-result"); setFocusMode(false); setPhase("setup"); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            다시 도전
          </button>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
