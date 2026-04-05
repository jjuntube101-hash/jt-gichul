"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Question } from "@/types/question";
import { useSolveRecord } from "@/hooks/useSolveRecord";

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
  const { saveSolve } = useSolveRecord();
  const q = question;
  const a = q.analysis;

  const isAnswered = selected !== null;
  const isCorrect = selected === q.정답;

  // 돌아갈 경로 복원
  const from = searchParams.get("from");
  const lawParam = searchParams.get("law");
  const topicParam = searchParams.get("topic");
  const filterParam = searchParams.get("filter");

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
  }

  function handleSelect(choiceNum: number) {
    if (isAnswered) return;
    setSelected(choiceNum);
    saveSolve({
      questionNo: q.no,
      isCorrect: choiceNum === q.정답,
      selectedChoice: choiceNum,
      timeSpentMs: Date.now() - startTime,
      mode: "practice",
    });
  }

  function handleReset() {
    setSelected(null);
  }

  return (
    <div className="space-y-4 pb-8">
      {/* 뒤로가기 + 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700">홈</Link>
        <span>/</span>
        <Link href={backHref} className="hover:text-slate-700">{backLabel}</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">#{q.no}</span>
      </nav>

      {/* 문항 헤더 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{q.시험_구분} {q.직급}</Badge>
        <Badge variant="secondary">{q.시행년도}</Badge>
        <span className="text-xs text-slate-400">#{q.문제번호}</span>
        <span className="text-xs text-slate-400">{q.대분류} &gt; {q.중분류}</span>
      </div>

      {/* 난이도 + 정답률 */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>난이도 {a.difficulty}/5</span>
        <span>추정 정답률 {a.estimated_correct_rate}%</span>
        <span>{a.question_type}</span>
      </div>

      {/* 문제 */}
      <div className="rounded-lg bg-white p-4 shadow-sm border">
        <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">
          {q.문제_내용}
        </p>
        {q.보기 && (
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
            {q.보기}
          </div>
        )}
      </div>

      {/* 선택지 */}
      <div className="space-y-2">
        {q.선택지.map((text, idx) => {
          const choiceNum = idx + 1;
          const ca = a.choices_analysis.find(c => c.choice_num === choiceNum);
          const isThis = selected === choiceNum;
          const isAnswer = choiceNum === q.정답;

          let borderClass = "border-slate-200";
          let bgClass = "bg-white";

          if (isAnswered) {
            if (isAnswer) {
              borderClass = "border-emerald-400";
              bgClass = "bg-emerald-50";
            } else if (isThis && !isCorrect) {
              borderClass = "border-red-400";
              bgClass = "bg-red-50";
            }
          }

          return (
            <button
              key={choiceNum}
              onClick={() => handleSelect(choiceNum)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${borderClass} ${bgClass} ${
                !isAnswered ? "hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {choiceNum}
                </span>
                <span className="text-sm leading-relaxed flex-1">{text}</span>
                {isAnswered && ca && (
                  <Badge
                    variant={ca.verdict === "O" ? "secondary" : "destructive"}
                    className="shrink-0 text-xs"
                  >
                    {ca.verdict === "O" ? "맞는 선지" : "틀린 선지"}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 결과 + 다시풀기 */}
      {isAnswered && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <span className="text-sm font-bold text-emerald-600">정답!</span>
            ) : (
              <span className="text-sm font-bold text-red-600">
                오답 (정답: {q.정답}번)
              </span>
            )}
          </div>
          <button
            onClick={handleReset}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            다시 풀기
          </button>
        </div>
      )}

      {/* === 해설 (답 선택 후 표시) === */}
      {isAnswered && (
        <div className="space-y-4">
          <Separator />

          {/* 출제의도 */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-2">출제의도</h3>
            <p className="text-sm leading-relaxed text-slate-700">{a.intent}</p>
          </section>

          {/* 변별 포인트 */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-2">변별 포인트</h3>
            <p className="text-sm leading-relaxed text-slate-700">{a.discrimination_point}</p>
          </section>

          <Separator />

          {/* 선지별 분석 */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">선지별 분석</h3>
            <div className="space-y-3">
              {a.choices_analysis.map((ca) => (
                <Card
                  key={ca.choice_num}
                  className={`${
                    ca.verdict === "X"
                      ? "border-l-4 border-l-red-400"
                      : "border-l-4 border-l-emerald-400"
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{ca.choice_num}번</span>
                      <Badge
                        variant={ca.verdict === "O" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {ca.verdict === "O" ? "맞는 선지" : "틀린 선지"}
                      </Badge>
                      {ca.trap_type && (
                        <Badge variant="outline" className="text-xs">{ca.trap_type}</Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">{ca.analysis}</p>
                    {ca.distortion && (
                      <div className="rounded-md bg-amber-50 p-2 text-xs leading-relaxed text-amber-800">
                        <span className="font-bold">함정:</span> {ca.distortion}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">근거:</span> {ca.law_ref}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* 함정 패턴 */}
          {a.trap_patterns.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 mb-2">함정 패턴</h3>
              <div className="flex flex-wrap gap-1">
                {a.trap_patterns.map((tp, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{tp}</Badge>
                ))}
              </div>
            </section>
          )}

          <Separator />

          {/* 학습 가이드 */}
          <section className="rounded-lg bg-blue-50 p-4 space-y-3">
            <h3 className="text-sm font-bold text-blue-900">학습 가이드</h3>
            <div>
              <p className="text-xs font-medium text-blue-800 mb-1">출제자가 묻는 것</p>
              <p className="text-sm leading-relaxed text-blue-900">{a.study_guide.what_examiner_tests}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-800 mb-1">이렇게 공부하세요</p>
              <p className="text-sm leading-relaxed text-blue-900">{a.study_guide.how_to_study}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-800 mb-1">자주 하는 실수</p>
              <p className="text-sm leading-relaxed text-blue-900">{a.study_guide.common_mistakes}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-700">
              <span>학습 우선순위: <strong>{a.study_guide.study_priority}</strong></span>
              <span>복습 태그: {a.study_guide.revision_tag}</span>
            </div>
          </section>

          {/* 근거법령 */}
          {q.근거법령 && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 mb-2">근거법령</h3>
              <div className="rounded-md bg-slate-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                {q.근거법령}
              </div>
            </section>
          )}

          {/* 키워드 */}
          {a.keywords.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 mb-2">키워드</h3>
              <div className="flex flex-wrap gap-1">
                {a.keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                ))}
              </div>
            </section>
          )}

          {/* 관련 문항 */}
          {a.related_questions.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 mb-2">관련 문항</h3>
              <div className="flex flex-wrap gap-1">
                {a.related_questions.map((rq) => (
                  <Link key={rq} href={`/question/${rq}`}>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-slate-100">#{rq}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 공유 버튼 */}
          <ShareButton question={q} isCorrect={isCorrect} />
        </div>
      )}

      {/* 이전/다음 네비게이션 */}
      <Separator />
      <div className="flex items-center justify-between">
        {prevNo !== null ? (
          <Link
            href={`/question/${prevNo}`}
            className="rounded-md bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            ← 이전
          </Link>
        ) : (
          <div />
        )}
        <span className="text-xs text-slate-400">{currentIndex} / {totalQuestions}</span>
        {nextNo !== null ? (
          <Link
            href={`/question/${nextNo}`}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            다음 →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

/** 공유 버튼 */
function ShareButton({ question, isCorrect }: { question: Question; isCorrect: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = `JT기출 #${question.no} | ${question.대분류} ${question.중분류}\n${isCorrect ? "✅ 정답" : "❌ 오답"} | 난이도 ${question.analysis.difficulty}/5\n\ngichul.jttax.co.kr/question/${question.no}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "JT기출", text });
        return;
      } catch {
        // 공유 취소 — 무시
      }
    }

    // 클립보드 복사 폴백
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사 실패
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-full rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
    >
      {copied ? "복사됨!" : "결과 공유하기"}
    </button>
  );
}
