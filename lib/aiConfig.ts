/**
 * AI 기능 설정 상수
 * - 각 AI 기능의 사용량 제한, 모델, 라벨 정의
 */

export const AI_FEATURES = {
  briefing: { dailyLimit: 1, model: 'haiku', label: '오늘의 브리핑' },
  wrong_answer: { dailyLimit: 10, model: 'haiku', label: 'AI 오답 진단' },
  mock_exam: { dailyLimit: 1, model: 'haiku', label: 'AI 모의고사' },
  weekly_report: { weeklyLimit: 1, model: 'sonnet', label: '약점 해부 보고서' },
  dday_strategy: { weeklyLimit: 1, model: 'sonnet', label: 'D-day 전략' },
  ask: { dailyLimit: 3, model: 'haiku', label: 'AI 세무 상담', premiumDailyLimit: 20, premiumModel: 'sonnet' },
} as const;

export type AIFeature = keyof typeof AI_FEATURES;

/** 일일 제한이 있는 기능인지 확인 */
export function isDailyLimited(
  feature: AIFeature
): feature is 'briefing' | 'wrong_answer' | 'mock_exam' | 'ask' {
  return 'dailyLimit' in AI_FEATURES[feature];
}

/** 주간 제한이 있는 기능인지 확인 */
export function isWeeklyLimited(
  feature: AIFeature
): feature is 'weekly_report' | 'dday_strategy' {
  return 'weeklyLimit' in AI_FEATURES[feature];
}

/** 기능별 제한 횟수 반환 */
export function getFeatureLimit(feature: AIFeature): number {
  const config = AI_FEATURES[feature];
  if ('dailyLimit' in config) return config.dailyLimit;
  if ('weeklyLimit' in config) return config.weeklyLimit;
  return 0;
}
