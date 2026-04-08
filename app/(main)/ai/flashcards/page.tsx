"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, RotateCcw, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";

interface Flashcard {
  text: string;
  answer: string;
  source_no: number;
}

interface LawFlashcard {
  law_ref: string;
  law: string;
  topics: string[];
  question_count: number;
  flashcards: Flashcard[];
}

export default function FlashcardsPage() {
  const [data, setData] = useState<LawFlashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<"browse" | "study">("browse");

  useEffect(() => {
    fetch("/data/ai/law_flashcards.json")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const laws = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of data) map.set(f.law, (map.get(f.law) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  // Flatten all flashcards for study mode
  const allCards = useMemo(() => {
    const filtered = selectedLaw ? data.filter((d) => d.law === selectedLaw) : data;
    const cards: (Flashcard & { law_ref: string; law: string })[] = [];
    for (const entry of filtered) {
      for (const fc of entry.flashcards) {
        cards.push({ ...fc, law_ref: entry.law_ref, law: entry.law });
      }
    }
    return cards;
  }, [data, selectedLaw]);

  const currentCard = allCards[cardIndex];

  const nextCard = useCallback(() => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev + 1) % allCards.length);
  }, [allCards.length]);

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev - 1 + allCards.length) % allCards.length);
  }, [allCards.length]);

  const shuffleCards = useCallback(() => {
    setIsFlipped(false);
    setCardIndex(Math.floor(Math.random() * allCards.length));
  }, [allCards.length]);

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
          <BookOpen className="h-5 w-5 text-success" />
          <h1 className="text-lg font-bold">조문 암기 카드</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          기출에서 추출한 {allCards.length.toLocaleString()}장의 OX 플래시카드.
          조문을 읽고 O/X를 판단하세요.
        </p>
      </motion.div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setMode("browse"); setCardIndex(0); setIsFlipped(false); }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "browse"
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          목록 보기
        </button>
        <button
          onClick={() => { setMode("study"); setCardIndex(0); setIsFlipped(false); }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "study"
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          카드 학습
        </button>
      </div>

      {/* Law filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setSelectedLaw(null); setCardIndex(0); setIsFlipped(false); }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !selectedLaw
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          전체
        </button>
        {laws.map(([law, count]) => (
          <button
            key={law}
            onClick={() => { setSelectedLaw(law === selectedLaw ? null : law); setCardIndex(0); setIsFlipped(false); }}
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

      {mode === "study" && currentCard ? (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{cardIndex + 1} / {allCards.length}</span>
            <span>{currentCard.law_ref}</span>
          </div>

          {/* Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer rounded-xl border-2 border-border bg-card p-6 min-h-[200px] flex flex-col justify-center items-center text-center shadow-sm hover:shadow transition-all"
          >
            <AnimatePresence mode="wait">
              {!isFlipped ? (
                <motion.div
                  key="front"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm text-foreground leading-relaxed">
                    {currentCard.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-4">
                    탭하여 정답 확인
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="back"
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`inline-flex items-center justify-center h-16 w-16 rounded-full text-3xl font-bold mb-3 ${
                      currentCard.answer === "O"
                        ? "bg-success-light text-success"
                        : "bg-danger-light text-danger"
                    }`}
                  >
                    {currentCard.answer}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    출처: #{currentCard.source_no}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={prevCard}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={shuffleCards}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setIsFlipped(false); setCardIndex(0); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={nextCard}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Browse mode — list of law refs */
        <div className="space-y-2">
          {(selectedLaw ? data.filter((d) => d.law === selectedLaw) : data)
            .slice(0, 30)
            .map((entry, i) => (
              <motion.div
                key={entry.law_ref}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-foreground">
                    {entry.law_ref}
                  </p>
                  <span className="rounded-full bg-success-light px-2 py-0.5 text-[10px] font-bold text-success">
                    {entry.flashcards.length}장
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {entry.law} &middot; {entry.topics.join(", ")} &middot;{" "}
                  {entry.question_count}문항 관련
                </p>
              </motion.div>
            ))}

          {(selectedLaw ? data.filter((d) => d.law === selectedLaw) : data).length > 30 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              상위 30개 조문 표시 중
            </p>
          )}
        </div>
      )}
    </div>
  );
}
