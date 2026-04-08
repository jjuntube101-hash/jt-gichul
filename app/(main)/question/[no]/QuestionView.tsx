"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, ChevronDown, Share2, RotateCcw, BookOpen, AlertTriangle, Lightbulb, Target, Hash, Zap, Bookmark, StickyNote, Check, MessageCircle } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePremium } from "@/hooks/usePremium";
import type { Question } from "@/types/question";
import { useSolveRecord } from "@/hooks/useSolveRecord";
import BadgeToast from "@/components/engagement/BadgeToast";
import { isCorrectAnswer, formatAnswer } from "@/lib/answer";
import { trackSolve } from "@/lib/questTracker";
import WrongAnswerDiagnosis from "@/components/question/WrongAnswerDiagnosis";
import ContentProtection from "@/components/ui/ContentProtection";

interface Props {
  question: Question;
  totalQuestions: number;
  prevNo: number | null;
  nextNo: number | null;
  currentIndex: number;
}

/** ㄱ,ㄴ,ㄷ,ㄹ 보기를 개별 항목으로 파싱 */
function parseBogi(bogi: string): { letter: string; text: string }[] | null {
  const regex = /^([ㄱ-ㅎ])\.\s*/m;
  if (!regex.test(bogi)) return null;
  const parts = bogi.split(/^(?=[ㄱ-ㅎ]\.)/m).filter(Boolean);
  if (parts.length < 2) return null;
  return parts.map(part => {
    const m = part.match(/^([ㄱ-ㅎ])\.\s*([\s\S]*)/);
    if (!m) return null;
    return { letter: m[1], text: m[2].trimEnd() };
  }).filter((x): x is { letter: string; text: string } => x !== null);
}

/** 정답 선택지에서 O인 ㄱ,ㄴ,ㄷ,ㄹ 문자 추출 */
function getCorrectLetters(answer: number | number[], choices: string[]): Set<string> {
  const answerNums = Array.isArray(answer) ? answer : [answer];
  const correctText = answerNums.map(n => choices[n - 1] || "").join(", ");
  const letters = new Set<string>();
  const matches = correctText.match(/[ㄱ-ㅎ]/g);
  if (matches) matches.forEach(l => letters.add(l));
  return letters;
}

/** 계산문제 여부 판별 */
function isCalcQuestion(subtype: string): boolean {
  return ['계산', '세액계산', '금액계산'].includes(subtype);
}

/** 숫자/금액 패턴을 강조하는 렌더러 */
function highlightNumbers(text: string): React.ReactNode[] {
  const regex = /(\d{1,3}(,\d{3})*)(원|만원|억원|천원|백만원|%|개월|년|일)?/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={key++} className="font-bold text-primary">{match[0]}</span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

/** 선택지가 ①~⑤로 시작하는지 확인 */
function startsWithCircledNumber(text: string): boolean {
  return /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(text.trim());
}

export default function QuestionView({ question, totalQuestions, prevNo, nextNo, currentIndex }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [startTime] = useState(() => Date.now());
  const searchParams = useSearchParams();
  const { saveSolve, newBadges, dismissNewBadges } = useSolveRecord();
  const { isBookmarked, toggleBookmark, getMemo, setMemo } = useBookmarks();
  const q = question;
  const bookmarked = isBookmarked(q.no);
  const a = q.analysis;

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["choices"]));
  const [memoText, setMemoText] = useState("");
  const [memoEditing, setMemoEditing] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);

  // 메모 초기값 로드
  useEffect(() => {
    setMemoText(getMemo(q.no));
  }, [q.no, getMemo]);

  const isAnswered = selected !== null;
  const isCorrect = selected !== null && isCorrectAnswer(selected, q.정답);

  useEffect(() => {
    if (isAnswered && !isCorrect) {
      setOpenSections(prev => new Set([...prev, "guide"]));
    }
  }, [isAnswered, isCorrect]);

  function toggleSection(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const from = searchParams.get("from");
  const lawParam = searchParams.get("law");
  const topicParam = searchParams.get("topic");
  const filterParam = searchParams.get("filter");

  // 현재 쿼리 파라미터를 이전/다음 이동 시 유지
  const queryString = searchParams.toString();
  const navQuery = queryString ? `?${queryString}` : "";

  let backHref = "/";
  let backLabel = "홈";
  if (from === "practice") {
    if (lawParam && topicParam) {
      backHref = `/practice?law=${encodeURIComponent(lawParam)}&topic=${encodeURIComponent(topicParam)}`;
      backLabel = topicParam;
    } else if (lawParam) {
      backHref = `/practice?law=${encodeURIComponent(lawParam)}`;
      backLabel = lawParam;
    } else if (filterParam) {
      backHref = `/practice?filter=${filterParam}`;
      backLabel = filterParam === "random" ? "랜덤" : filterParam === "recent" ? "최근 기출" : "문항 목록";
    } else {
      backHref = "/practice";
      backLabel = "문항 목록";
    }
  } else if (from === "review") {
    backHref = "/review";
    backLabel = "오답노트";
  } else if (from === "timer") {
    backHref = "/timer";
    backLabel = "타이머 결과";
  }

  function handleSelect(choiceNum: number) {
    if (isAnswered) return;
    setSelected(choiceNum);
    const correct = isCorrectAnswer(choiceNum, q.정답);
    saveSolve({
      questionNo: q.no,
      isCorrect: correct,
      selectedChoice: choiceNum,
      timeSpentMs: Date.now() - startTime,
      mode: "practice",
    });
    trackSolve(correct);
  }

  function handleReset() {
    setSelected(null);
    setOpenSections(new Set(["choices"]));
  }

  return (
    <ContentProtection className="space-y-4 pb-8">
      <BadgeToast badgeIds={newBadges} onDismiss={dismissNewBadges} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">홈</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={backHref} className="hover:text-foreground transition-colors">{backLabel}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">#{q.no}</span>
      </nav>

      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">{q.시험_구분} {q.직급}</Badge>
          <Badge variant="secondary" className="bg-primary-light text-primary text-[10px]">{q.시행년도}</Badge>
          <span className="text-[10px] text-muted-foreground">#{q.문제번호}</span>
          <span className="text-[10px] text-muted-foreground">{q.대분류} &gt; {q.중분류}</span>
        </div>
        <button
          onClick={() => toggleBookmark(q.no)}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted"
          aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
        >
          <Bookmark
            className={`h-5 w-5 transition-colors ${
              bookmarked ? "fill-warning text-warning" : "text-muted-foreground"
            }`}
          />
        </button>
      </div>

      {/* Difficulty & Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`inline-block h-1.5 w-3 rounded-sm mr-0.5 ${
                  i < a.difficulty ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </span>
          난이도
        </span>
        <span>정답률 {a.estimated_correct_rate}%</span>
        <span>{a.question_type}</span>
      </div>

      {/* Question Body */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-sm">
        <p className="text-base leading-relaxed whitespace-pre-wrap text-card-foreground">
          {isCalcQuestion(a.question_subtype) ? highlightNumbers(q.문제_내용) : q.문제_내용}
        </p>
        {q.보기 && (() => {
          const parsed = parseBogi(q.보기);
          const isCalc = isCalcQuestion(a.question_subtype);
          const correctLetters = getCorrectLetters(q.정답, q.선택지);

          // ㄱ,ㄴ,ㄷ,ㄹ 보기형: 파싱 성공 시 개별 항목으로 렌더링
          if (parsed && parsed.length >= 2) {
            return (
              <div className="mt-3 rounded-lg bg-muted p-3.5 text-sm leading-relaxed space-y-2">
                {parsed.map((item) => {
                  const isCorrectLetter = correctLetters.has(item.letter);
                  return (
                    <div
                      key={item.letter}
                      className={`flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors ${
                        isAnswered
                          ? isCorrectLetter
                            ? "bg-success-light/60"
                            : "bg-danger-light/60"
                          : ""
                      }`}
                    >
                      {isAnswered && (
                        <span className={`shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                          isCorrectLetter ? "bg-success" : "bg-danger"
                        }`}>
                          {isCorrectLetter ? "O" : "X"}
                        </span>
                      )}
                      <span className={`${isAnswered ? (isCorrectLetter ? "text-success" : "text-danger") : "text-muted-foreground"}`}>
                        <span className="font-semibold">{item.letter}.</span>{" "}
                        {isCalc ? highlightNumbers(item.text) : item.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          }

          // 일반 보기: 기존 방식 (계산문제면 숫자 강조)
          return (
            <div className="mt-3 rounded-lg bg-muted p-3.5 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {isCalc ? highlightNumbers(q.보기) : q.보기}
            </div>
          );
        })()}
      </div>

      {/* Choices */}
      <div className="space-y-2.5" data-no-transition role="radiogroup" aria-label="선택지">
        {(() => {
          const hasCircledNumbers = q.선택지.every(t => startsWithCircledNumber(t));
          const isCalc = isCalcQuestion(a.question_subtype);

          return q.선택지.map((text, idx) => {
            const choiceNum = idx + 1;
            const ca = a.choices_analysis.find(c => c.choice_num === choiceNum);
            const isThis = selected === choiceNum;
            const isAnswer = isCorrectAnswer(choiceNum, q.정답);

            let borderClass = "border-border";
            let bgClass = "bg-card";

            if (isAnswered) {
              if (isAnswer) {
                borderClass = "border-success";
                bgClass = "bg-success-light";
              } else if (isThis && !isCorrect) {
                borderClass = "border-danger";
                bgClass = "bg-danger-light";
              }
            }

            return (
              <motion.button
                key={choiceNum}
                onClick={() => handleSelect(choiceNum)}
                role="radio"
                aria-checked={isThis}
                aria-label={`선택지 ${choiceNum}`}
                className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${borderClass} ${bgClass} ${
                  !isAnswered ? "hover:border-primary/40 hover:shadow-sm cursor-pointer" : ""
                }`}
                whileTap={!isAnswered ? { scale: 0.98 } : undefined}
              >
                <div className="flex items-start gap-3">
                  {!hasCircledNumbers && (
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isAnswered && isAnswer
                        ? "bg-success text-white"
                        : isAnswered && isThis && !isCorrect
                        ? "bg-danger text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {choiceNum}
                    </span>
                  )}
                  <span className={`text-[15px] leading-relaxed flex-1 text-card-foreground whitespace-pre-wrap ${
                    hasCircledNumbers && isAnswered && isAnswer ? "font-bold" : ""
                  }`}>
                    {isCalc ? highlightNumbers(text) : text}
                  </span>
                  {isAnswered && ca && (
                    <Badge
                      className={`shrink-0 text-[10px] ${
                        ca.verdict === "O"
                          ? "bg-success-light text-success border-success/20"
                          : "bg-danger-light text-danger border-danger/20"
                      }`}
                    >
                      {ca.verdict === "O" ? "O" : "X"}
                    </Badge>
                  )}
                </div>
              </motion.button>
            );
          });
        })()}
      </div>

      {/* Result Banner */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
              isCorrect ? "bg-success-light text-success" : "bg-danger-light text-danger"
            }`}>
              {isCorrect ? "정답!" : `오답 (정답: ${formatAnswer(q.정답)})`}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              다시 풀기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrong Answer Diagnosis */}
      <AnimatePresence>
        {isAnswered && !isCorrect && selected !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WrongAnswerDiagnosis
              questionNo={q.no}
              selectedChoice={selected}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4 overflow-hidden"
          >
            {/* Intent */}
            <section>
              <button
                onClick={() => toggleSection("intent")}
                className="w-full flex items-center justify-between rounded-xl bg-card border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  출제의도
                </h3>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.has("intent") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openSections.has("intent") && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-b-xl bg-card border border-t-0 border-border px-4 pb-4 pt-2">
                      <p className="text-sm leading-relaxed text-muted-foreground">{a.intent}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Discrimination Point */}
            <section>
              <button
                onClick={() => toggleSection("discrimination")}
                className="w-full flex items-center justify-between rounded-xl bg-card border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  변별 포인트
                </h3>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.has("discrimination") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openSections.has("discrimination") && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-b-xl bg-card border border-t-0 border-border px-4 pb-4 pt-2">
                      <p className="text-sm leading-relaxed text-muted-foreground">{a.discrimination_point}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Choice Analysis */}
            <section>
              <button
                onClick={() => toggleSection("choices")}
                className="w-full flex items-center justify-between rounded-xl bg-card border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
                  선지별 분석
                </h3>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.has("choices") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openSections.has("choices") && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-3 pt-3">
                      {a.choices_analysis.map((ca) => (
                        <div
                          key={ca.choice_num}
                          className={`rounded-xl border-l-4 bg-card border border-border p-4 space-y-2 ${
                            ca.verdict === "X"
                              ? "border-l-danger"
                              : "border-l-success"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-card-foreground">{ca.choice_num}번</span>
                            <Badge
                              className={`text-[10px] ${
                                ca.verdict === "O"
                                  ? "bg-success-light text-success"
                                  : "bg-danger-light text-danger"
                              }`}
                            >
                              {ca.verdict === "O" ? "맞는 선지" : "틀린 선지"}
                            </Badge>
                            {ca.trap_type && (
                              <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">{ca.trap_type}</Badge>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">{ca.analysis}</p>
                          {ca.distortion && (
                            <div className="flex items-start gap-2 rounded-lg bg-warning-light p-3 text-xs leading-relaxed text-warning">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span><strong>함정:</strong> {ca.distortion}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">근거:</span> {ca.law_ref}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Trap Patterns */}
            {a.trap_patterns.length > 0 && (
              <section>
                <button
                  onClick={() => toggleSection("traps")}
                  className="w-full flex items-center justify-between rounded-xl bg-card border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    함정 패턴
                  </h3>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.has("traps") ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openSections.has("traps") && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {a.trap_patterns.map((tp, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] border-warning/30 text-warning">{tp}</Badge>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* Study Guide */}
            <section>
              <button
                onClick={() => toggleSection("guide")}
                className="w-full flex items-center justify-between rounded-xl bg-primary-light border border-primary/10 p-4 transition-colors hover:bg-primary-light/80"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
                  <BookOpen className="h-4 w-4" />
                  학습 가이드
                </h3>
                <ChevronDown className={`h-4 w-4 text-primary/60 transition-transform ${openSections.has("guide") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openSections.has("guide") && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-b-xl bg-primary-light border border-t-0 border-primary/10 px-5 pb-5 pt-2 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">출제자가 묻는 것</p>
                        <p className="text-sm leading-relaxed text-foreground">{a.study_guide.what_examiner_tests}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">이렇게 공부하세요</p>
                        <p className="text-sm leading-relaxed text-foreground">{a.study_guide.how_to_study}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">자주 하는 실수</p>
                        <p className="text-sm leading-relaxed text-foreground">{a.study_guide.common_mistakes}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-primary/80">
                        <span>우선순위: <strong>{a.study_guide.study_priority}</strong></span>
                        <span>태그: {a.study_guide.revision_tag}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Law Reference */}
            {q.근거법령 && (
              <section>
                <button
                  onClick={() => toggleSection("lawref")}
                  className="w-full flex items-center justify-between rounded-xl bg-card border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
                    근거법령
                  </h3>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.has("lawref") ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openSections.has("lawref") && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="rounded-b-xl bg-muted border border-t-0 border-border p-4">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {q.근거법령}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* Keywords */}
            {a.keywords.length > 0 && (
              <section>
                <button
                  onClick={() => toggleSection("keywords")}
                  className="w-full flex items-center justify-between rounded-xl bg-card border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
                    키워드
                  </h3>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.has("keywords") ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openSections.has("keywords") && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {a.keywords.map((kw, i) => (
                            <Badge key={i} className="text-[10px] bg-primary-light text-primary">{kw}</Badge>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* Related Questions */}
            {a.related_questions.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  관련 문항
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {a.related_questions.map((rq) => (
                    <Link key={rq} href={`/question/${rq}`}>
                      <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary-light hover:text-primary hover:border-primary/30 transition-colors">#{rq}</Badge>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 내 메모 */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-card-foreground">
                  <StickyNote className="h-3.5 w-3.5 text-warning" />
                  내 메모
                </h3>
                {!memoEditing && memoText && (
                  <button
                    onClick={() => setMemoEditing(true)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    수정
                  </button>
                )}
              </div>
              {memoEditing || !memoText ? (
                <div className="space-y-2">
                  <textarea
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    onFocus={() => setMemoEditing(true)}
                    placeholder="이 문제에 대한 메모를 남겨보세요..."
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                  />
                  {memoEditing && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{memoText.length}/500</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setMemoText(getMemo(q.no));
                            setMemoEditing(false);
                          }}
                          className="rounded-lg px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => {
                            setMemo(q.no, memoText);
                            setMemoEditing(false);
                            setMemoSaved(true);
                            setTimeout(() => setMemoSaved(false), 1500);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-white hover:bg-primary/90 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          저장
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-1">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap flex-1">
                    {memoText}
                  </p>
                  {memoSaved && (
                    <span className="shrink-0 text-[10px] text-success font-medium">저장됨</span>
                  )}
                </div>
              )}
            </section>

            {/* 수강생 Q&A 링크 */}
            <QnALink questionNo={q.no} />

            {/* Share */}
            <ShareButton question={q} isCorrect={isCorrect} />

            {/* 한 문제 더? — Flow 연속 */}
            <SmartNextSection question={q} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prev/Next Navigation */}
      <Separator className="bg-border" />
      <div className="flex items-center justify-between">
        {prevNo !== null ? (
          <Link
            href={`/question/${prevNo}${navQuery}`}
            className="flex items-center gap-1 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Link>
        ) : (
          <div />
        )}
        <span className="text-xs text-muted-foreground">{currentIndex} / {totalQuestions}</span>
        {nextNo !== null ? (
          <Link
            href={`/question/${nextNo}${navQuery}`}
            className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </ContentProtection>
  );
}

function ShareButton({ question, isCorrect }: { question: Question; isCorrect: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const q = question;
    const diff = q.analysis.difficulty;
    const rate = q.analysis.estimated_correct_rate;
    const diffLabel = diff >= 4 ? "고난도" : diff >= 3 ? "중급" : "기본";
    const emoji = isCorrect ? "✅" : "❌";
    const challengeMsg = rate <= 40 ? `정답률 ${rate}%의 킬러 문항!` : rate <= 60 ? `정답률 ${rate}% — 절반은 틀리는 문항` : `정답률 ${rate}%`;

    const text = `${emoji} ${q.시험_구분} ${q.시행년도} ${q.대분류}\n${challengeMsg}\n\n나는 ${isCorrect ? "맞혔다" : "틀렸다"}! 너는?\n👉 gichul.jttax.co.kr/question/${q.no}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${diffLabel} 문항 도전 — ${q.대분류} | JT기출`,
          text,
          url: `https://gichul.jttax.co.kr/question/${q.no}`,
        });
        return;
      } catch {
        // share cancelled
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // copy failed
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
    >
      <Share2 className="h-4 w-4" />
      {copied ? "복사됨!" : "결과 공유하기"}
    </button>
  );
}

function QnALink({ questionNo }: { questionNo: number }) {
  const { isPremium, loading } = usePremium();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (loading || !isPremium) return;
    // 댓글 수 조회
    (async () => {
      try {
        const { getSupabase } = await import("@/lib/supabase");
        const supabase = getSupabase();
        const session = supabase
          ? (await supabase.auth.getSession()).data.session
          : null;
        if (!session?.access_token) return;

        const res = await fetch(
          `/api/comments?no=${questionNo}&count=1`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {
        // 무시
      }
    })();
  }, [questionNo, isPremium, loading]);

  if (loading || !isPremium) return null;

  return (
    <Link
      href={`/class/qna/${questionNo}`}
      className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="flex-1">
        수강생 Q&A{count !== null && count > 0 ? ` (${count})` : ""}
      </span>
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

function SmartNextSection({ question }: { question: Question }) {
  const a = question.analysis;
  const related = a.related_questions ?? [];

  if (related.length === 0) return null;

  return (
    <section className="rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 p-4 space-y-2">
      <p className="text-xs font-bold text-foreground">
        <Zap className="inline h-3.5 w-3.5 text-primary mr-1" />
        관련 문항 ({related.length}개)
      </p>
      <div className="space-y-1.5">
        {related.slice(0, 5).map((no) => (
          <Link
            key={no}
            href={`/question/${no}`}
            className="flex items-center justify-between rounded-lg bg-card border border-border p-2.5 hover:border-primary/40 transition-colors"
          >
            <p className="text-xs font-medium text-card-foreground">
              #{no} — 같은 주제 문항
            </p>
            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
          </Link>
        ))}
        {related.length > 5 && (
          <Link
            href={`/practice?nos=${related.join(",")}`}
            className="block text-center text-[10px] text-primary font-medium hover:underline py-1"
          >
            전체 {related.length}문항 모아 풀기
          </Link>
        )}
      </div>
    </section>
  );
}
