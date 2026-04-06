/**
 * 3단계 AI 캐시 시스템
 *
 * 1단계 - 정적 캐시: public/data/ai/ JSON 파일 (빌드타임)
 * 2단계 - 공유 캐시: Supabase ai_cache 테이블 (같은 문제+선지 = 같은 응답)
 * 3단계 - 개인 캐시: 없음 (유저별 데이터는 직접 쿼리)
 */

import { getSupabase } from '@/lib/supabase';

// --- SHA-256 해시 유틸 ---

async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node.js fallback (서버사이드)
  const { createHash } = await import('crypto');
  return createHash('sha256').update(message).digest('hex');
}

// --- 캐시 키 생성 ---

/**
 * SHA-256 기반 캐시 키 생성
 * @param feature AI 기능명
 * @param parts 캐시 키에 포함할 문자열들 (문제 ID, 선지 등)
 * @returns "feature:sha256hash" 형태의 캐시 키
 */
export async function makeCacheKey(
  feature: string,
  ...parts: string[]
): Promise<string> {
  const raw = [feature, ...parts].join('::');
  const hash = await sha256(raw);
  return `${feature}:${hash}`;
}

// --- 1단계: 정적 캐시 ---

/**
 * public/data/ai/{feature}/{key}.json에서 정적 캐시 로드
 * 빌드타임에 생성된 JSON 파일을 fetch로 읽음 (클라이언트사이드)
 */
export async function getStaticAIData(
  feature: string,
  key: string
): Promise<unknown | null> {
  try {
    const url = `/data/ai/${feature}/${key}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- 2단계: 공유 캐시 (Supabase ai_cache) ---

/**
 * Supabase ai_cache 테이블에서 캐시 조회
 * 히트 시 hit_count를 1 증가시킴
 */
export async function getSharedCache(
  cacheKey: string
): Promise<unknown | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('ai_cache')
      .select('response, hit_count')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    // hit_count 증가 (fire-and-forget)
    supabase
      .from('ai_cache')
      .update({ hit_count: (data.hit_count ?? 0) + 1 })
      .eq('cache_key', cacheKey)
      .then(() => {});

    return data.response;
  } catch {
    return null;
  }
}

/**
 * Supabase ai_cache 테이블에 캐시 저장
 */
export async function setSharedCache(
  cacheKey: string,
  feature: string,
  response: unknown
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.from('ai_cache').upsert(
      {
        cache_key: cacheKey,
        feature,
        response,
        hit_count: 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'cache_key' }
    );
  } catch {
    // 캐시 저장 실패는 무시 (기능에 영향 없음)
  }
}
