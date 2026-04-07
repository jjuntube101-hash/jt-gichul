/**
 * AI API 라우트 핸들러
 * POST /api/ai/[feature]
 *
 * feature: briefing | wrong_answer | mock_exam | weekly_report | dday_strategy
 *
 * 2-tier 구조:
 * - Tier 1: 로컬 엔진 (항상 실행, 비용 $0)
 * - Tier 2: Claude API 보강 (ANTHROPIC_API_KEY 설정 시 활성, 자연어 분석)
 * - Tier 2 비활성 시: 로컬 엔진 결과만 반환 (기존과 동일)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AI_FEATURES, type AIFeature } from '@/lib/aiConfig';
import { checkAndIncrement, getLimitForFeature } from '@/lib/rateLimit';
import { makeCacheKey } from '@/lib/aiCache';
import { diagnoseWrongAnswer } from '@/lib/wrongAnswerEngine';
import { collectBriefingData, generateBriefing } from '@/lib/briefingEngine';
import { generateMockExam } from '@/lib/mockExamEngine';
import { generateWeeklyReport } from '@/lib/weeklyReportEngine';
import { generateDdayStrategy } from '@/lib/ddayStrategyEngine';
import { callClaudeJSON, logAIUsage } from '@/lib/claude';
import {
  BRIEFING_SYSTEM,
  buildBriefingMessage,
  WRONG_ANSWER_SYSTEM,
  buildWrongAnswerMessage,
  WEEKLY_REPORT_SYSTEM,
  buildWeeklyReportMessage,
  DDAY_STRATEGY_SYSTEM,
  buildDdayStrategyMessage,
  MOCK_EXAM_REVIEW_SYSTEM,
  buildMockExamReviewMessage,
} from '@/lib/aiPrompts';

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

// --- Claude API 활성화 여부 ---

function isClaudeEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// --- Claude API 보강 함수 (Tier 2) ---

async function enhanceWithClaude(
  feature: AIFeature,
  localResult: unknown,
  body: Record<string, unknown>,
  userId: string,
): Promise<{ enhanced: unknown; aiMeta?: { model: string; inputTokens: number; outputTokens: number; durationMs: number } }> {
  if (!isClaudeEnabled()) {
    return { enhanced: localResult };
  }

  try {
    switch (feature) {
      case 'briefing': {
        const lr = localResult as Record<string, unknown>;
        const result = await callClaudeJSON({
          feature,
          systemPrompt: BRIEFING_SYSTEM,
          userMessage: buildBriefingMessage({
            displayName: (lr.displayName as string) ?? '학습자',
            examTarget: (lr.examTarget as string) ?? '9급',
            streak: (lr.streak as number) ?? 0,
            yesterdaySolved: (lr.yesterdaySolved as number) ?? 0,
            yesterdayCorrectRate: (lr.yesterdayCorrectRate as number) ?? 0,
            weakTopics: (lr.weakTopics as string[]) ?? [],
            totalSolved: (lr.totalSolved as number) ?? 0,
            daysUntilExam: (lr.daysUntilExam as number | null) ?? null,
          }),
          maxTokens: 512,
        });
        return {
          enhanced: { ...lr, ai: result.data, aiGenerated: true },
          aiMeta: result.meta,
        };
      }

      case 'wrong_answer': {
        const lr = localResult as Record<string, unknown>;
        const result = await callClaudeJSON({
          feature,
          systemPrompt: WRONG_ANSWER_SYSTEM,
          userMessage: buildWrongAnswerMessage({
            questionText: (lr.questionText as string) ?? '',
            choices: (lr.choices as string[]) ?? [],
            correctAnswer: (lr.correctAnswer as number) ?? 0,
            selectedChoice: (body.selectedChoice as number) ?? 0,
            correctAnalysis: (lr.correctAnalysis as string) ?? '',
            selectedAnalysis: (lr.selectedAnalysis as string) ?? '',
            trapType: (lr.trapType as string | null) ?? null,
            lawRef: (lr.lawRef as string) ?? '',
            topic: (lr.topic as string) ?? '',
          }),
          maxTokens: 512,
        });
        return {
          enhanced: { ...lr, ai: result.data, aiGenerated: true },
          aiMeta: result.meta,
        };
      }

      case 'weekly_report': {
        const lr = localResult as Record<string, unknown>;
        const result = await callClaudeJSON({
          feature,
          systemPrompt: WEEKLY_REPORT_SYSTEM,
          userMessage: buildWeeklyReportMessage({
            examTarget: (lr.examTarget as string) ?? '9급',
            totalSolvedThisWeek: (lr.totalSolvedThisWeek as number) ?? 0,
            avgAccuracy: (lr.avgAccuracy as number) ?? 0,
            topicAccuracies: (lr.topicAccuracies as { topic: string; law: string; accuracy: number; solved: number }[]) ?? [],
            trapFrequencies: (lr.trapFrequencies as { name: string; count: number }[]) ?? [],
            streakDays: (lr.streakDays as number) ?? 0,
            comparedToLastWeek: (lr.comparedToLastWeek as { solvedDiff: number; accuracyDiff: number }) ?? { solvedDiff: 0, accuracyDiff: 0 },
          }),
          maxTokens: 1024,
        });
        return {
          enhanced: { ...lr, ai: result.data, aiGenerated: true },
          aiMeta: result.meta,
        };
      }

      case 'dday_strategy': {
        const lr = localResult as Record<string, unknown>;
        const result = await callClaudeJSON({
          feature,
          systemPrompt: DDAY_STRATEGY_SYSTEM,
          userMessage: buildDdayStrategyMessage({
            examTarget: (lr.examTarget as string) ?? '9급',
            daysUntilExam: (lr.daysUntilExam as number) ?? 0,
            totalSolved: (lr.totalSolved as number) ?? 0,
            totalQuestions: (lr.totalQuestions as number) ?? 0,
            overallAccuracy: (lr.overallAccuracy as number) ?? 0,
            weakTopics: (lr.weakTopics as { topic: string; law: string; accuracy: number }[]) ?? [],
            strongTopics: (lr.strongTopics as { topic: string; law: string; accuracy: number }[]) ?? [],
            currentStreak: (lr.currentStreak as number) ?? 0,
          }),
          maxTokens: 1024,
        });
        return {
          enhanced: { ...lr, ai: result.data, aiGenerated: true },
          aiMeta: result.meta,
        };
      }

      case 'mock_exam': {
        // 모의고사는 로컬 엔진 결과를 그대로 반환 (문항 생성은 로컬)
        // Claude는 결과 분석 시에만 사용 (mock_exam_review feature로 별도)
        return { enhanced: localResult };
      }

      default:
        return { enhanced: localResult };
    }
  } catch (err) {
    console.error(`[AI API] Claude 보강 실패 (${feature}):`, err);
    // Claude 실패 시 로컬 결과로 폴백
    return { enhanced: localResult };
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

    // 4. 공유캐시 확인 (캐시 히트 시 레이트리밋 소비 안 함)
    const skipCache = feature === 'mock_exam';
    const cacheKeyParts = Object.values(body)
      .filter((v): v is string => typeof v === 'string')
      .sort();
    const cacheKey = await makeCacheKey(feature, ...cacheKeyParts);

    if (!skipCache) {
      const cached = await getServerCache(cacheKey);
      if (cached) {
        return NextResponse.json({
          data: cached,
          cached: true,
          remaining: -1, // 캐시 히트이므로 잔여 횟수 미차감
        });
      }
    }

    // 5. 레이트리밋 확인 (캐시 미스 시에만)
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

    // 6. AI 응답 생성
    let aiResponse: unknown;

    if (feature === 'wrong_answer') {
      const { questionNo, selectedChoice } = body as { questionNo: number; selectedChoice: number };
      if (!questionNo || !selectedChoice) {
        return NextResponse.json(
          { error: 'questionNo와 selectedChoice가 필요합니다.', code: 'BAD_REQUEST' },
          { status: 400 }
        );
      }
      try {
        aiResponse = await diagnoseWrongAnswer({
          questionNo,
          selectedChoice,
          userId: auth.userId,
        });
      } catch (err) {
        console.error('[AI API] 오답 진단 오류:', err);
        return NextResponse.json(
          { error: '오답 진단 처리 중 오류가 발생했습니다.', code: 'DIAGNOSIS_ERROR' },
          { status: 500 }
        );
      }
    } else if (feature === 'briefing') {
      try {
        // 사전 조건 확인: 프로필 존재 여부
        const sb = getServiceSupabase();
        const { data: profile } = await sb
          .from('user_study_profiles')
          .select('onboarding_completed')
          .eq('user_id', auth.userId)
          .single();

        if (!profile || !profile.onboarding_completed) {
          return NextResponse.json(
            { error: '온보딩을 먼저 완료해주세요.', code: 'ONBOARDING_REQUIRED' },
            { status: 400 }
          );
        }

        // 사전 조건 확인: 최소 풀이 기록
        const { count: solveCount } = await sb
          .from('solve_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId);

        if (!solveCount || solveCount < 5) {
          return NextResponse.json(
            {
              error: `브리핑을 생성하려면 최소 5문항을 풀어야 해요. (현재 ${solveCount ?? 0}문항)`,
              code: 'INSUFFICIENT_DATA',
              detail: { current: solveCount ?? 0, required: 5 },
            },
            { status: 400 }
          );
        }

        const briefingData = await collectBriefingData(auth.userId);
        aiResponse = generateBriefing(briefingData);
      } catch (err) {
        console.error('[AI API] 브리핑 생성 오류:', err);
        return NextResponse.json(
          { error: '브리핑 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'BRIEFING_ERROR' },
          { status: 500 }
        );
      }
    } else if (feature === 'mock_exam') {
      try {
        // 사전 조건 확인: 프로필 존재 여부
        const sb = getServiceSupabase();
        const { data: profile } = await sb
          .from('user_study_profiles')
          .select('onboarding_completed')
          .eq('user_id', auth.userId)
          .single();

        if (!profile || !profile.onboarding_completed) {
          return NextResponse.json(
            { error: '모의고사를 생성하려면 먼저 프로필을 설정해주세요.', code: 'ONBOARDING_REQUIRED' },
            { status: 400 }
          );
        }

        // 사전 조건 확인: 최소 풀이 기록
        const { count: solveCount } = await sb
          .from('solve_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId);

        if (!solveCount || solveCount < 5) {
          return NextResponse.json(
            {
              error: `맞춤 모의고사를 생성하려면 최소 5문항을 풀어야 해요. (현재 ${solveCount ?? 0}문항)`,
              code: 'INSUFFICIENT_DATA',
              detail: { current: solveCount ?? 0, required: 5 },
            },
            { status: 400 }
          );
        }

        const examTarget = (body.examTarget as '9급' | '7급') ?? '9급';
        aiResponse = await generateMockExam({
          userId: auth.userId,
          examTarget,
          questionCount: 20,
        });
      } catch (err) {
        console.error('[AI API] 모의고사 생성 오류:', err);
        return NextResponse.json(
          { error: '모의고사 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'MOCK_EXAM_ERROR' },
          { status: 500 }
        );
      }
    } else if (feature === 'weekly_report') {
      try {
        // 사전 조건 확인
        const sb = getServiceSupabase();
        const { count: solveCount } = await sb
          .from('solve_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId);

        if (!solveCount || solveCount < 10) {
          return NextResponse.json(
            {
              error: `주간 보고서를 생성하려면 최소 10문항을 풀어야 해요. (현재 ${solveCount ?? 0}문항)`,
              code: 'INSUFFICIENT_DATA',
              detail: { current: solveCount ?? 0, required: 10 },
            },
            { status: 400 }
          );
        }

        const examTarget = (body.examTarget as '9급' | '7급') ?? '9급';
        aiResponse = await generateWeeklyReport({
          userId: auth.userId,
          examTarget,
        });
      } catch (err) {
        console.error('[AI API] 주간 보고서 생성 오류:', err);
        return NextResponse.json(
          { error: '주간 보고서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'WEEKLY_REPORT_ERROR' },
          { status: 500 }
        );
      }
    } else if (feature === 'dday_strategy') {
      try {
        const examTarget = (body.examTarget as '9급' | '7급') ?? '9급';
        aiResponse = await generateDdayStrategy({
          userId: auth.userId,
          examTarget,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'EXAM_DATE_NOT_SET') {
          return NextResponse.json(
            { error: '시험일을 먼저 설정해주세요.', code: 'EXAM_DATE_NOT_SET' },
            { status: 400 }
          );
        }
        console.error('[AI API] D-day 전략 생성 오류:', err);
        return NextResponse.json(
          { error: 'D-day 전략 생성 중 오류가 발생했습니다.', code: 'DDAY_STRATEGY_ERROR' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 AI 기능입니다.', code: 'UNSUPPORTED_FEATURE' },
        { status: 400 }
      );
    }

    // 7. Claude API 보강 (Tier 2) — ANTHROPIC_API_KEY 설정 시 활성
    const { enhanced, aiMeta } = await enhanceWithClaude(feature, aiResponse, body, auth.userId);
    const finalResponse = enhanced;

    // 8. AI 사용량 로깅 (Claude 보강 시에만)
    if (aiMeta) {
      logAIUsage({
        userId: auth.userId,
        feature,
        model: aiMeta.model,
        inputTokens: aiMeta.inputTokens,
        outputTokens: aiMeta.outputTokens,
        durationMs: aiMeta.durationMs,
        cached: false,
      }).catch(() => {}); // fire-and-forget
    }

    // 9. 캐시 저장 (mock_exam은 스킵)
    if (!skipCache) {
      await setServerCache(cacheKey, feature, finalResponse);
    }

    // 10. 응답 반환
    return NextResponse.json({
      data: finalResponse,
      cached: false,
      remaining,
      aiGenerated: !!aiMeta,
    });
  } catch (error) {
    console.error('[AI API] 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
