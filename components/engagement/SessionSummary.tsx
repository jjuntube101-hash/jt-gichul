"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { RotateCcw, Home, AlertTriangle, Target, ChevronRight, Zap, Clock } from "lucide-react";

interface WrongByLaw {
  law: string;
  count: number;
}

interface Props {
  mode: "ox" | "timer";
  total: number;
  correct: number;
  wrong: number;
  wrongByLaw?: WrongByLaw[];
  onReset: () => void;
}

export default function SessionSummary({ mode, total, correct, wrong, wrongByLaw = [], onReset }: Props) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const modeLabel = mode === "ox" ? "OX 퀴즈" : "타이머 테스트";

  // 격려 메시지 (정답률 기반)
  const encouragement = accuracy >= 90
    ? "완벽에 가까워요!"
    : accuracy >= 70
    ? "잘하고 있어요!"
    : accuracy >= 50
    ? "꾸준히 하면 실력이 올라요"
    : "틀린 문항이 진짜 공부예요";

  // 열린 루프: 틀린 문항 과목 표시
  const topWrongLaws = wrongByLaw.slice(0, 3);

  // 약점 과목 (가장 많이 틀린 과목)
  const weakestLaw = topWrongLaws.length > 0 ? topWrongLaws[0] : null;

  return (
    <div className="space-y-5 text-center py-8">
      {/* 축하 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-light">
          <span className="text-3xl">
            {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "💪" : "📚"}
          </span>
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">{modeLabel} 완료!</h1>
        <p className="mt-1 text-sm text-muted-foreground">{encouragement}</p>
      </motion.div>

      {/* 통계 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-xl bg-card border border-border p-3">
          <p className={`text-2xl font-bold ${
            accuracy >= 80 ? "text-success" : accuracy >= 60 ? "text-warning" : "text-danger"
          }`}>{accuracy}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">정답률</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3">
          <p className="text-2xl font-bold text-success">{correct}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">정답</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3">
          <p className="text-2xl font-bold text-danger">{wrong}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">오답</p>
        </div>
      </motion.div>

      {/* 열린 루프: 틀린 과목 → 복습 유도 (Zeigarnik) */}
      {topWrongLaws.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2 text-left"
        >
          <p className="flex items-center gap-1.5 text-xs font-bold text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            틀린 문항 — 내일 복습하면 장기기억 저장
          </p>
          {topWrongLaws.map((w) => (
            <Link
              key={w.law}
              href={`/practice?law=${encodeURIComponent(w.law)}`}
            >
              <div className="flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-light p-3 transition-all hover:border-danger/40">
                <Target className="h-4 w-4 text-danger shrink-0" />
                <span className="text-xs text-card-foreground flex-1">{w.law}</span>
                <span className="text-xs font-bold text-danger">{w.count}문</span>
                <ChevronRight className="h-3.5 w-3.5 text-danger/50" />
              </div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* 다음에 할 것 — 자동 제안 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2.5"
      >
        {/* Primary CTA: 틀린 문항 바로 복습 */}
        {wrong > 0 && (
          <Link href="/review">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-danger px-5 py-3 text-sm font-bold text-white hover:bg-danger/90 transition-colors">
              <Zap className="h-4 w-4" />
              틀린 {wrong}문항 바로 복습 →
            </div>
          </Link>
        )}

        {/* Secondary suggestion: 정답률 기반 맞춤 제안 */}
        {accuracy < 50 ? (
          <Link href="/ox">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
              기초부터 다시 → OX 퀴즈
            </div>
          </Link>
        ) : accuracy < 80 && weakestLaw ? (
          <Link href={`/ox?law=${encodeURIComponent(weakestLaw.law)}`}>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-warning/20 bg-warning/5 px-4 py-2.5 text-xs font-medium text-warning hover:bg-warning/10 transition-colors">
              <Target className="h-3.5 w-3.5" />
              약점 과목 집중 공략 → {weakestLaw.law} OX
            </div>
          </Link>
        ) : accuracy >= 80 ? (
          <Link href="/timer">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-2.5 text-xs font-medium text-success hover:bg-success/10 transition-colors">
              <Clock className="h-3.5 w-3.5" />
              실전 모의고사 도전 → 타이머
            </div>
          </Link>
        ) : null}
      </motion.div>

      {/* 1분 퀴즈 라이트 옵션 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Link href="/ox" className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <Zap className="h-3 w-3" />
          시간이 없다면 1분 퀴즈 →
        </Link>
      </motion.div>

      {/* 보조 액션 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-3 pt-1"
      >
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          다시 시작
        </button>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          홈으로
        </Link>
      </motion.div>
    </div>
  );
}
