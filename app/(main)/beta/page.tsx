"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, MessageSquare, ChevronRight, Star } from "lucide-react";

export default function BetaPage() {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    if (!feedback.trim() && rating === 0) return;
    // 피드백을 localStorage에 저장 (추후 Supabase로 수집)
    const existing = JSON.parse(localStorage.getItem("jt-beta-feedback") ?? "[]");
    existing.push({
      rating,
      feedback: feedback.trim(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    localStorage.setItem("jt-beta-feedback", JSON.stringify(existing));
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
        <h1 className="text-xl font-bold mb-2">JT기출 베타 테스터</h1>
        <p className="text-sm opacity-90 leading-relaxed">
          공무원 세법 기출 1,245문항을 선지 하나까지 분석했습니다.
          적응형 난이도, 간격 복습, 뽀모도로 타이머까지 — 합격을 위한 올인원 학습 도구.
          여러분의 피드백이 더 나은 앱을 만듭니다.
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">주요 기능</h2>
        {[
          { emoji: "📚", title: "1,245문항 풀해설", desc: "선지별 O/X + 근거조문 + 함정유형 분석" },
          { emoji: "⚡", title: "OX 퀴즈", desc: "적응형 난이도로 4,000+ 선지 드릴" },
          { emoji: "⏱️", title: "1분 퀴즈 & 타이머", desc: "60초 퀵 퀴즈 + 실전 시간제한 연습" },
          { emoji: "📊", title: "학습 분석", desc: "과목별 정답률 + 약점 토픽 히트맵 + 주간 리포트" },
          { emoji: "🔥", title: "스트릭 & 퀘스트", desc: "매일 3개 퀘스트 + 스트릭 프리즈 + 뱃지" },
          { emoji: "🧠", title: "간격 복습", desc: "틀린 문항 자동 복습 스케줄 (1→3→7→14일)" },
          { emoji: "🍅", title: "뽀모도로 타이머", desc: "25분 집중 / 5분 휴식 사이클" },
        ].map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <span className="text-lg">{f.emoji}</span>
            <div>
              <p className="text-sm font-medium text-card-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick start */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">바로 시작하기</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/practice?filter=random"
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
          >
            <span className="text-sm font-medium text-card-foreground">랜덤 10문</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/ox"
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
          >
            <span className="text-sm font-medium text-card-foreground">OX 퀴즈</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/timer"
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
          >
            <span className="text-sm font-medium text-card-foreground">타이머 모드</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/quick"
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
          >
            <span className="text-sm font-medium text-card-foreground">1분 퀴즈</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Feedback */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-card-foreground">피드백 보내기</h2>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle className="h-12 w-12 text-success" />
            <p className="text-sm font-medium text-foreground">감사합니다!</p>
            <p className="text-xs text-muted-foreground">피드백이 저장되었습니다.</p>
          </div>
        ) : (
          <>
            {/* Star rating */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-2">만족도</span>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      s <= rating ? "text-warning fill-warning" : "text-border"
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="불편한 점, 개선 아이디어, 오류 등 자유롭게 작성해주세요"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
              rows={4}
            />

            <button
              onClick={handleSubmit}
              disabled={!feedback.trim() && rating === 0}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              피드백 보내기
            </button>
          </>
        )}
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        이현준 세무사 · 제이티 세무회계 · gichul.jttax.co.kr
      </p>
    </div>
  );
}
