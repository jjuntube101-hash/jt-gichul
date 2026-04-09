/**
 * AI 기능 설정 상수
 * - 각 AI 기능의 사용량 제한, 모델, 라벨 정의
 * - Premium / Free 사용자 구분
 */

export const AI_FEATURES = {
  briefing:      { dailyLimit: 1,  freeDailyLimit: 1,  model: 'haiku', label: '오늘의 브리핑' },
  wrong_answer:  { dailyLimit: 15, freeDailyLimit: 3,  model: 'haiku', premiumModel: 'sonnet', label: 'AI 오답 진단' },
  mock_exam:     { dailyLimit: 1,  freeMonthlyLimit: 1, model: 'haiku', label: 'AI 모의고사' },
  weekly_report: { weeklyLimit: 1, freeMonthlyLimit: 1, model: 'sonnet', label: '약점 해부 보고서' },
  dday_strategy: { weeklyLimit: 1, freeMonthlyLimit: 1, model: 'sonnet', label: 'D-day 전략' },
  ask:           { dailyLimit: 20, freeDailyLimit: 3,  model: 'sonnet', freeModel: 'haiku', label: 'AI 세무 상담' },
} as const;

export type AIFeature = keyof typeof AI_FEATURES;

/** 일일 제한이 있는 기능인지 확인 (premium 기준) */
export function isDailyLimited(feature: AIFeature): boolean {
  return 'dailyLimit' in AI_FEATURES[feature];
}

/** 주간 제한이 있는 기능인지 확인 (premium 기준) */
export function isWeeklyLimited(feature: AIFeature): boolean {
  return 'weeklyLimit' in AI_FEATURES[feature];
}

/** 무료 사용자의 월간 제한이 있는 기능인지 확인 */
export function isFreeMonthlyLimited(feature: AIFeature): boolean {
  return 'freeMonthlyLimit' in AI_FEATURES[feature];
}

/** 무료 사용자의 제한 주기 반환 */
export function getFreeLimitType(feature: AIFeature): 'daily' | 'monthly' | 'unlimited' {
  const config = AI_FEATURES[feature] as Record<string, unknown>;
  if ('freeMonthlyLimit' in config) return 'monthly';
  if ('freeDailyLimit' in config) return 'daily';
  return 'unlimited';
}

/** 기능별 제한 횟수 반환 (premium 여부에 따라 다른 값) */
export function getFeatureLimit(feature: AIFeature, isPremium: boolean = false): number {
  const config = AI_FEATURES[feature] as Record<string, unknown>;

  if (isPremium) {
    // Premium: dailyLimit 또는 weeklyLimit 사용
    if ('dailyLimit' in config) return config.dailyLimit as number;
    if ('weeklyLimit' in config) return config.weeklyLimit as number;
    return 0;
  }

  // Free: freeDailyLimit, freeMonthlyLimit, 또는 premium과 동일
  if ('freeDailyLimit' in config) return config.freeDailyLimit as number;
  if ('freeMonthlyLimit' in config) return config.freeMonthlyLimit as number;
  if ('dailyLimit' in config) return config.dailyLimit as number;
  if ('weeklyLimit' in config) return config.weeklyLimit as number;
  return 0;
}

/** 기능별 모델 반환 (premium 여부에 따라 다른 모델) */
export function getFeatureModel(feature: AIFeature, isPremium: boolean = false): string {
  const config = AI_FEATURES[feature] as Record<string, unknown>;

  if (isPremium) {
    // Premium: premiumModel이 있으면 우선, 없으면 기본 model
    if ('premiumModel' in config) return config.premiumModel as string;
    return config.model as string;
  }

  // Free: freeModel이 있으면 우선, 없으면 기본 model
  if ('freeModel' in config) return config.freeModel as string;
  return config.model as string;
}
