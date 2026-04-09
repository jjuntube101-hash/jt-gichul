"use client";

import { TrendingUp, ChevronRight } from "lucide-react";
import type { PredictedScore } from "@/lib/predictScoreEngine";

interface Props {
  prediction: PredictedScore | null;
  loading?: boolean;
}

export default function PredictedScoreCard({ prediction, loading }: Props) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-4 h-32" aria-label="합격 예측 로딩 중" />
    );
  }

  if (!prediction) return null;

  const isPass = prediction.gap >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">합격 예측</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            prediction.confidence === 'high'
              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
              : prediction.confidence === 'medium'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          신뢰도 {prediction.confidence === 'high' ? '높음' : prediction.confidence === 'medium' ? '보통' : '낮음'}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {prediction.totalScore}
            </span>
            <span className="text-sm text-muted-foreground">/ 100점</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              합격선 {prediction.passLine}점
            </span>
            <span
              className={`text-xs font-bold ${
                isPass ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isPass ? '+' : ''}{prediction.gap}점
            </span>
          </div>
        </div>

        {/* Circular progress (simplified as bar) */}
        <div className="w-16 h-16 rounded-full border-4 border-muted flex items-center justify-center relative" role="img" aria-label={`예측 점수 ${prediction.totalScore}점`}>
          <svg className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${(prediction.totalScore / 100) * 176} 176`}
              className={isPass ? 'text-green-500' : 'text-primary'}
            />
          </svg>
          <span className="text-xs font-bold">{prediction.totalScore}%</span>
        </div>
      </div>

      {/* Subject scores */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {prediction.subjects.map((s) => (
          <span
            key={s.subject}
            className={`px-2 py-0.5 rounded-full ${
              s.priority === 'high'
                ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.label} {s.score}
            {s.dataSource === 'self_assess' && '(자기평가)'}
            {s.dataSource === 'default' && '(기본값)'}
          </span>
        ))}
      </div>

      {/* Recommendation */}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <ChevronRight className="h-3 w-3 text-primary shrink-0" />
        {prediction.recommendation}
      </p>
    </div>
  );
}
