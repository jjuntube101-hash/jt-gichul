"use client";

import { Crown, Check, X } from "lucide-react";

interface Props {
  /** 맥락: 어디서 표시하는지 */
  context?: 'ai_limit' | 'classroom' | 'general';
  /** 무료 한도 (해당 시) */
  currentLimit?: number;
  /** 프리미엄 한도 */
  premiumLimit?: number;
  /** 닫기 핸들러 */
  onClose?: () => void;
}

export default function PremiumUpgrade({
  context = 'general',
  currentLimit,
  premiumLimit,
  onClose,
}: Props) {
  const contextMessage = {
    ai_limit: `무료 사용 한도(${currentLimit ?? 0}회)를 모두 사용했습니다.`,
    classroom: 'Premium 수강생 전용 기능입니다.',
    general: 'Premium으로 업그레이드하고 더 많은 기능을 사용하세요.',
  }[context];

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-5 space-y-4">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-yellow-500" />
        <span className="text-base font-bold text-foreground">Premium 업그레이드</span>
      </div>

      <p className="text-sm text-muted-foreground">{contextMessage}</p>

      {premiumLimit && currentLimit && (
        <p className="text-xs text-primary font-medium">
          Premium: 일 {premiumLimit}회까지 사용 가능 (현재 {currentLimit}회)
        </p>
      )}

      {/* Benefits */}
      <ul className="space-y-2">
        {[
          'AI 코치가 매일 맞춤 학습 플랜 제공',
          '전 과목 합격 예측 점수',
          'AI 오답 진단 일 15회 + Sonnet 모델',
          'AI 세무 상담 일 20회',
          '모의고사/보고서/전략 무제한',
        ].map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-xs text-foreground">
            <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="space-y-2">
        <button className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
          수강 등록 코드 입력
        </button>
        <p className="text-[10px] text-center text-muted-foreground">
          해커스 수강생은 등록 코드로 자동 활성화됩니다
        </p>
      </div>
    </div>
  );
}
