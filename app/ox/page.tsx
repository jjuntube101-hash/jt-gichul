"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { loadAllQuestions } from "@/lib/questions";
import { useSolveRecord } from "@/hooks/useSolveRecord";

interface OXItemWithMeta {
  ox_text: string;
  answer: "O" | "X";
  law_ref: string;
  questionNo: number;
  law: string;
}

export default function OXPage() {
  const [items, setItems] = useState<OXItemWithMeta[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<"O" | "X" | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const { saveOX } = useSolveRecord();

  // 전체 OX 문항 로드 + 셔플
  useEffect(() => {
    async function load() {
      try {
        const questions = await loadAllQuestions();

        const allOX: OXItemWithMeta[] = [];
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

        // Fisher-Yates 셔플
        for (let i = allOX.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allOX[i], allOX[j]] = [allOX[j], allOX[i]];
        }

        setItems(allOX);
      } catch (err) {
        console.error("OX 데이터 로딩 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const current = items[currentIndex];

  const handleAnswer = useCallback(
    (choice: "O" | "X") => {
      if (selected || !current) return;
      setSelected(choice);
      setShowResult(true);

      const isCorrect = choice === current.answer;
      if (isCorrect) {
        setStats((s) => ({ ...s, correct: s.correct + 1 }));
      } else {
        setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      }
      saveOX({
        questionNo: current.questionNo,
        oxIndex: currentIndex,
        isCorrect,
      });
    },
    [selected, current, currentIndex, saveOX]
  );

  const handleNext = useCallback(() => {
    setSelected(null);
    setShowResult(false);
    setCurrentIndex((i) => i + 1);
  }, []);

  // 키보드 단축키
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "o" || e.key === "O" || e.key === "1") {
        if (!selected) handleAnswer("O");
      } else if (e.key === "x" || e.key === "X" || e.key === "2") {
        if (!selected) handleAnswer("X");
      } else if (
        (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") &&
        selected
      ) {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, handleAnswer, handleNext]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">OX 문항을 불러오는 중...</div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="space-y-4 text-center py-12">
        <h1 className="text-xl font-bold">OX 드릴 완료!</h1>
        <p className="text-sm text-slate-500">
          {stats.correct + stats.wrong}문항 완료 — 정답률{" "}
          {stats.correct + stats.wrong > 0
            ? Math.round(
                (stats.correct / (stats.correct + stats.wrong)) * 100
              )
            : 0}
          %
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          홈으로
        </Link>
      </div>
    );
  }

  const total = stats.correct + stats.wrong;
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 상단 스탯 */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">OX 드릴</h1>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-medium">
            O {stats.correct}
          </span>
          <span className="text-red-600 font-medium">X {stats.wrong}</span>
          {total > 0 && (
            <span className="text-slate-500">{accuracy}%</span>
          )}
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-slate-700 transition-all duration-300"
          style={{
            width: `${Math.min((currentIndex / items.length) * 100, 100)}%`,
          }}
        />
      </div>

      {/* 문항 정보 */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {current.law}
        </Badge>
        <Link
          href={`/question/${current.questionNo}`}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          원문 #{current.questionNo}
        </Link>
        <span className="ml-auto text-xs text-slate-400">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* OX 문장 */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm leading-relaxed">{current.ox_text}</p>
        </CardContent>
      </Card>

      {/* O / X 버튼 */}
      {!selected && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAnswer("O")}
            className="flex h-16 items-center justify-center rounded-xl border-2 border-emerald-200 bg-emerald-50 text-2xl font-bold text-emerald-700 transition-colors hover:bg-emerald-100 hover:border-emerald-300 active:bg-emerald-200"
          >
            O
          </button>
          <button
            onClick={() => handleAnswer("X")}
            className="flex h-16 items-center justify-center rounded-xl border-2 border-red-200 bg-red-50 text-2xl font-bold text-red-700 transition-colors hover:bg-red-100 hover:border-red-300 active:bg-red-200"
          >
            X
          </button>
        </div>
      )}

      {/* 결과 + 해설 */}
      {showResult && (
        <div className="space-y-3">
          {/* 정오 표시 */}
          <div
            className={`rounded-lg p-3 text-center text-sm font-bold ${
              selected === current.answer
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {selected === current.answer
              ? "정답!"
              : `오답 (정답: ${current.answer})`}
          </div>

          {/* 근거 조문 */}
          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            <span className="font-medium">근거:</span> {current.law_ref}
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={handleNext}
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            다음 문항 →
          </button>
          <p className="text-center text-xs text-slate-400">
            Enter 또는 → 키로 넘어가기
          </p>
        </div>
      )}

      <Separator />
      <p className="text-center text-xs text-slate-400">
        키보드: O키=맞다 · X키=틀리다 · Enter=다음
      </p>
    </div>
  );
}
