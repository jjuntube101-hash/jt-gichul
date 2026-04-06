"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, ChevronDown, Share2, RotateCcw, BookOpen, AlertTriangle, Lightbulb, Target, Hash, Zap } from "lucide-react";
import type { Question } from "@/types/question";
import { useSolveRecord } from "@/hooks/useSolveRecord";
import BadgeToast from "@/components/engagement/BadgeToast";
import { isCorrectAnswer, formatAnswer } from "@/lib/answer";
import { trackSolve } from "@/lib/questTracker";

interface Props {
  question: Question;
  totalQuestions: number;
  prevNo: number | null;
  nextNo: number | null;
  currentIndex: number;
}

export default function QuestionView({ question, totalQuestions, prevNo, nextNo, currentIndex }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [startTime] = useState(() => Date.now());
  const searchParams = useSearchParams();
  const { saveSolve, newBadges, dismissNewBadges } = useSolveRecord();
  const q = question;
  const a = q.analysis;

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["choices"]));

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
    <div className="space-y-4 pb-8">
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
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">{q.시험_구분} {q.직급}</Badge>
        <Badge variant="secondary" className="bg-primary-light text-primary text-[10px]">{q.시행년도}</Badge>
        <span className="text-[10px] text-muted-foreground">#{q.문제번호}</span>
        <span className="text-[10px] text-muted-foreground">{q.대분류} &gt; {q.중분류}</span>
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
        <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap text-card-foreground">
          {q.문제_내용}
        </p>
        {q.보기 && (
          <div className="mt-3 rounded-lg bg-muted p-3.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {q.보기}
          </div>
        )}
      </div>

      {/* Choices */}
      <div className="space-y-2.5" data-no-transition>
        {q.선택지.map((text, idx) => {
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
              className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${borderClass} ${bgClass} ${
                !isAnswered ? "hover:border-primary/40 hover:shadow-sm cursor-pointer" : ""
              }`}
              whileTap={!isAnswered ? { scale: 0.98 } : undefined}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isAnswered && isAnswer
                    ? "bg-success text-white"
                    : isAnswered && isThis && !isCorrect
                    ? "bg-danger text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {choiceNum}
                </span>
                <span className="text-sm leading-relaxed flex-1 text-card-foreground">{text}</span>
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
        })}
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
    </div>
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

function SmartNextSection({ question }: { question: Question }) {
  const a = question.analysis;
  const related = a.related_questions ?? [];
  // 추천 우선순위: ①관련 문항 중 랜덤 ②같은 과목 미풀이
  const suggestedNo = related.length > 0
    ? related[Math.floor(Math.random() * related.length)]
    : null;

  if (!suggestedNo) return null;

  return (
    <section className="rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 p-4">
      <p className="text-xs font-bold text-foreground mb-2">
        <Zap className="inline h-3.5 w-3.5 text-primary mr-1" />
        한 문제 더?
      </p>
      <Link
        href={`/question/${suggestedNo}`}
        className="flex items-center justify-between rounded-lg bg-card border border-border p-3 hover:border-primary/40 transition-colors"
      >
        <div>
          <p className="text-xs font-medium text-card-foreground">
            관련 문항 #{suggestedNo}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            같은 주제의 문항을 풀어보세요
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-primary shrink-0" />
      </Link>
    </section>
  );
}
