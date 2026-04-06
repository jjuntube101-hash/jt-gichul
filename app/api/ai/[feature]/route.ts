/**
 * AI API 라우트 핸들러
 * POST /api/ai/[feature]
 *
 * feature: briefing | wrong_answer | mock_exam | weekly_report | dday_strategy
 *
 * Sprint 21에서 실제 Claude API 연동 예정 — 현재는 placeholder 응답 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AI_FEATURES, type AIFeature } from '@/lib/aiConfig';
import { checkAndIncrement, getLimitForFeature } from '@/lib/rateLimit';
import { makeCacheKey } from '@/lib/aiCache';

// --- 서버사이드 Supabase ---

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase 환경변수 미설정');
  }
  return createClient(url, key);
}

// --- 인증 확인 ---

async function authenticateUser(
  request: NextRequest
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = getServiceSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return { userId: user.id };
}

// --- 서버사이드 캐시 조회/저장 ---

async function getServerCache(cacheKey: string): Promise<unknown | null> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('ai_cache')
      .select('response, hit_count')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    // hit_count 증가
    await supabase
      .from('ai_cache')
      .update({ hit_count: (data.hit_count ?? 0) + 1 })
      .eq('cache_key', cacheKey);

    return data.response;
  } catch {
    return null;
  }
}

async function setServerCache(
  cacheKey: string,
  feature: string,
  response: unknown
): Promise<void> {
  try {
    const supabase = getServiceSupabase();
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
    // 캐시 저장 실패는 무시
  }
}

// --- Placeholder 응답 생성 (Sprint 21에서 Claude API로 교체) ---

function generatePlaceholder(feature: AIFeature, params: Record<string, unknown>): unknown {
  switch (feature) {
    case 'briefing':
      return {
        title: '오늘의 브리핑',
        message: '[Sprint 21] Claude API 연동 후 실제 브리핑이 생성됩니다.',
        generatedAt: new Date().toISOString(),
      };
    case 'wrong_answer':
      return {
        diagnosis: '[Sprint 21] 오답 진단 AI가 연동될 예정입니다.',
        questionId: params.questionId ?? null,
        tips: [],
        generatedAt: new Date().toISOString(),
      };
    case 'mock_exam':
      return {
        title: 'AI 모의고사',
        questions: [],
        message: '[Sprint 21] Claude API 연동 후 맞춤 모의고사가 생성됩니다.',
        generatedAt: new Date().toISOString(),
      };
    case 'weekly_report':
      return {
        title: '약점 해부 보고서',
        message: '[Sprint 21] Claude API 연동 후 주간 분석 보고서가 생성됩니다.',
        weakPoints: [],
        generatedAt: new Date().toISOString(),
      };
    case 'dday_strategy':
      return {
        title: 'D-day 전략',
        message: '[Sprint 21] Claude API 연동 후 맞춤 전략이 생성됩니다.',
        strategy: [],
        generatedAt: new Date().toISOString(),
      };
    default:
      return { message: '지원하지 않는 기능입니다.' };
  }
}

// --- POST 핸들러 ---

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feature: string }> }
) {
  try {
    const { feature: featureParam } = await params;

    // 1. feature 유효성 확인
    if (!(featureParam in AI_FEATURES)) {
      return NextResponse.json(
        { error: '지원하지 않는 AI 기능입니다.', code: 'INVALID_FEATURE' },
        { status: 400 }
      );
    }
    const feature = featureParam as AIFeature;

    // 2. 인증 확인
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 3. 요청 바디 파싱
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // body가 없어도 진행 가능한 기능이 있음
    }

    // 4. 레이트리밋 확인
    const limit = getLimitForFeature(feature);
    const { allowed, remaining } = await checkAndIncrement(
      auth.userId,
      feature,
      limit
    );

    if (!allowed) {
      const isWeekly = feature === 'weekly_report' || feature === 'dday_strategy';
      return NextResponse.json(
        {
          error: `${AI_FEATURES[feature].label} ${isWeekly ? '주간' : '일일'} 사용 한도를 초과했습니다.`,
          code: 'RATE_LIMITED',
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // 5. 공유캐시 확인
    const cacheKeyParts = Object.values(body)
      .filter((v): v is string => typeof v === 'string')
      .sort();
    const cacheKey = await makeCacheKey(feature, ...cacheKeyParts);

    const cached = await getServerCache(cacheKey);
    if (cached) {
      return NextResponse.json({
        data: cached,
        cached: true,
        remaining,
      });
    }

    // 6. AI 응답 생성 (TODO: Sprint 21에서 Claude API 호출로 교체)
    const aiResponse = generatePlaceholder(feature, body);

    // 7. 캐시 저장
    await setServerCache(cacheKey, feature, aiResponse);

    // 8. 응답 반환
    return NextResponse.json({
      data: aiResponse,
      cached: false,
      remaining,
    });
  } catch (error) {
    console.error('[AI API] 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
