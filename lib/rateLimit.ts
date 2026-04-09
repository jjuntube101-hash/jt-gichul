/**
 * AI 사용량 제한 (Rate Limiting)
 * - Supabase ai_usage 테이블 활용
 * - 일일/주간/월간 제한 지원
 */

import { createClient } from '@supabase/supabase-js';
import {
  type AIFeature,
  AI_FEATURES,
  isDailyLimited,
  isWeeklyLimited,
  isFreeMonthlyLimited,
  getFeatureLimit,
} from '@/lib/aiConfig';

/** 서버사이드 Supabase 클라이언트 (service role) */
function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }
  return createClient(url, key);
}

/** 오늘 날짜 (YYYY-MM-DD, KST) */
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 이번 주 월요일 날짜 (YYYY-MM-DD, KST) */
function getWeekStartKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // 월요일 기준
  kst.setUTCDate(kst.getUTCDate() - diff);
  return kst.toISOString().slice(0, 10);
}

/** 이번 달 1일 날짜 (YYYY-MM-01, KST) */
function getMonthStartKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 7) + '-01';
}

/** use_date 결정: premium/free 상태 및 feature에 따라 적절한 기간 시작일 반환 */
function getUseDateForFeature(feature: AIFeature, isPremium: boolean): string {
  if (!isPremium && isFreeMonthlyLimited(feature)) {
    // 무료 사용자 + 월간 제한 기능 → 월 시작일 사용
    return getMonthStartKST();
  }
  if (isWeeklyLimited(feature) && isPremium) {
    // 프리미엄 사용자 + 주간 제한 기능 → 주 시작일 사용
    return getWeekStartKST();
  }
  if (isWeeklyLimited(feature) && !isPremium) {
    // 무료 사용자 + 주간 제한(freeMonthlyLimit 없는 경우) → 주 시작일 사용
    return getWeekStartKST();
  }
  return getTodayKST();
}

interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
}

/**
 * 사용량 확인 및 증가 (원자적)
 * - Supabase RPC `increment_ai_usage`로 원자적 count+1 수행
 * - TOCTOU 방지: 단일 SQL 문으로 INSERT/UPDATE + 제한 검사
 * - RPC 미설치 시 기존 upsert 방식으로 fallback
 * - isPremium 파라미터로 use_date 기간 자동 결정
 */
export async function checkAndIncrement(
  userId: string,
  feature: AIFeature,
  dailyLimit: number,
  isPremium: boolean = false
): Promise<UsageCheckResult> {
  const supabase = getServiceSupabase();

  const useDate = getUseDateForFeature(feature, isPremium);

  // 원자적 RPC 호출 시도
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'increment_ai_usage',
    {
      p_user_id: userId,
      p_feature: feature,
      p_use_date: useDate,
      p_limit: dailyLimit,
    }
  );

  if (!rpcError && rpcResult !== null && rpcResult !== undefined) {
    const newCount = rpcResult as number;
    if (newCount === -1) {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: dailyLimit - newCount };
  }

  // RPC 미설치 시 fallback (기존 방식)
  if (rpcError) {
    console.warn('[rateLimit] RPC unavailable, falling back to upsert:', rpcError.message);
  }

  const { data: existing } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('use_date', useDate)
    .maybeSingle();

  const currentCount = existing?.count ?? 0;

  if (currentCount >= dailyLimit) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = currentCount + 1;
  const { error } = await supabase.from('ai_usage').upsert(
    {
      user_id: userId,
      feature,
      use_date: useDate,
      count: newCount,
    },
    { onConflict: 'user_id,feature,use_date' }
  );

  if (error) {
    console.error('[rateLimit] upsert 실패:', error.message);
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: dailyLimit - newCount };
}

/**
 * 남은 사용 횟수 조회 (카운트 증가 없음)
 */
export async function getRemainingUsage(
  userId: string,
  feature: AIFeature,
  dailyLimit: number,
  isPremium: boolean = false
): Promise<number> {
  const supabase = getServiceSupabase();

  const useDate = getUseDateForFeature(feature, isPremium);

  const { data } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('use_date', useDate)
    .maybeSingle();

  const currentCount = data?.count ?? 0;
  return Math.max(0, dailyLimit - currentCount);
}

/**
 * 특정 기능의 설정된 제한 횟수 가져오기
 * @param isPremium - true면 프리미엄 제한, false면 무료 제한 반환
 */
export function getLimitForFeature(feature: AIFeature, isPremium: boolean = false): number {
  return getFeatureLimit(feature, isPremium);
}
