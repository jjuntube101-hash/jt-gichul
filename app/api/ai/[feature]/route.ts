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
import { isAdmin } from '@/lib/admin';
import { z } from 'zod';
import { AI_FEATURES, type AIFeature, getFeatureModel, isFreeMonthlyLimited } from '@/lib/aiConfig';
import { featureSchemas } from '@/lib/apiSchemas';
import { checkAndIncrement, getLimitForFeature } from '@/lib/rateLimit';
import { makeCacheKey } from '@/lib/aiCache';
import { diagnoseWrongAnswer } from '@/lib/wrongAnswerEngine';
import { collectBriefingData, generateBriefing } from '@/lib/briefingEngine';
import { generateMockExam } from '@/lib/mockExamEngine';
import { generateWeeklyReport } from '@/lib/weeklyReportEngine';
import { generateDdayStrategy } from '@/lib/ddayStrategyEngine';
import { callClaude, callClaudeJSON, logAIUsage } from '@/lib/claude';
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
  ASK_SYSTEM,
  buildAskMessages,
} from '@/lib/aiPrompts';
import { gatherContext, formatContextForPrompt } from '@/lib/askContextEngine';

// --- 서버사이드 Supabase ---

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Supabase 환경변수 미설정');
  }
  return createClient(url, key);
}

// --- 보안 상수 ---

/** 월간 Claude API 비용 상한 (달러). 초과 시 전체 AI 기능 차단 */
const MONTHLY_COST_CAP_USD = 10;

/** 신규 가입 후 AI 기능 사용까지 대기 시간 (ms) — 계정 팜 방지 */
const NEW_ACCOUNT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24시간

/** 토큰당 예상 비용 (USD). Haiku input/output, Sonnet input/output */
const TOKEN_COST = {
  'claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
  'claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
} as Record<string, { input: number; output: number }>;

// --- 접근 실패 로깅 ---

function logSecurityEvent(event: string, details: Record<string, unknown>) {
  console.warn(`[AI-SECURITY] ${event}`, JSON.stringify(details));
}

// --- 인증 확인 ---

async function authenticateUser(
  request: NextRequest
): Promise<{ userId: string; createdAt: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = getServiceSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return { userId: user.id, createdAt: user.created_at };
}

// --- 월간 비용 상한 체크 ---

async function checkMonthlyCostCap(): Promise<{ allowed: boolean; estimatedCost: number }> {
  try {
    const supabase = getServiceSupabase();
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const monthStart = kst.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

    // ai_usage 테이블에서 이번 달 전체 토큰 합산
    const { data } = await supabase
      .from('ai_usage')
      .select('count')
      .gte('use_date', monthStart);

    // 간단 추정: 각 호출당 평균 ~500 input + ~300 output tokens (Haiku 기준)
    const totalCalls = data?.reduce((sum, row) => sum + (row.count ?? 0), 0) ?? 0;
    const estimatedCost = totalCalls * (500 * 0.8 / 1_000_000 + 300 * 4 / 1_000_000);

    return { allowed: estimatedCost < MONTHLY_COST_CAP_USD, estimatedCost };
  } catch {
    // 비용 체크 실패 시 허용 (서비스 중단 방지)
    return { allowed: true, estimatedCost: 0 };
  }
}

// --- 신규 가입자 쿨다운 체크 ---

function checkNewAccountCooldown(createdAt: string): boolean {
  const accountAge = Date.now() - new Date(createdAt).getTime();
  return accountAge >= NEW_ACCOUNT_COOLDOWN_MS;
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
  isPremium: boolean = false,
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
          modelOverride: getFeatureModel(feature, isPremium),
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
          modelOverride: getFeatureModel(feature, isPremium),
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
          modelOverride: getFeatureModel(feature, isPremium),
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
          modelOverride: getFeatureModel(feature, isPremium),
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
      logSecurityEvent('AUTH_FAILED', { feature, ip: request.headers.get('x-forwarded-for') ?? 'unknown' });
      return NextResponse.json(
        { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2a. 신규 가입자 쿨다운 체크 (계정 팜 방지) — 관리자 바이패스
    if (!isAdmin(auth.userId) && !checkNewAccountCooldown(auth.createdAt)) {
      logSecurityEvent('NEW_ACCOUNT_BLOCKED', { userId: auth.userId, feature });
      return NextResponse.json(
        { error: '가입 후 24시간이 지나야 AI 기능을 사용할 수 있습니다.', code: 'ACCOUNT_TOO_NEW' },
        { status: 403 }
      );
    }

    // 2b. 월간 비용 상한 체크
    if (isClaudeEnabled()) {
      const { allowed: costAllowed, estimatedCost } = await checkMonthlyCostCap();
      if (!costAllowed) {
        logSecurityEvent('MONTHLY_CAP_REACHED', { estimatedCost, cap: MONTHLY_COST_CAP_USD });
        return NextResponse.json(
          { error: '이번 달 AI 사용량이 상한에 도달했습니다. 기본 분석은 계속 이용 가능합니다.', code: 'MONTHLY_CAP' },
          { status: 429 }
        );
      }
    }

    // 2c. Premium 여부 확인 — 관리자는 자동 Premium
    let isPremium = isAdmin(auth.userId);
    if (!isPremium) {
      try {
        const sb = getServiceSupabase();
        const { data: userProfile } = await sb
          .from('user_profiles')
          .select('is_premium, premium_expires_at')
          .eq('user_id', auth.userId)
          .single();
        isPremium = !!(userProfile?.is_premium &&
          (!userProfile.premium_expires_at || new Date(userProfile.premium_expires_at) > new Date()));
      } catch {
        // 프로필 조회 실패 시 무료 사용자로 처리
      }
    }

    // 3. 요청 바디 파싱 + Zod 검증
    let body: Record<string, unknown> = {};
    try {
      const rawBody = await request.json();
      const schema = featureSchemas[feature];
      if (schema) {
        body = schema.parse(rawBody) as Record<string, unknown>;
      } else {
        body = rawBody;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const messages = err.issues.map((e) => e.message).join(', ');
        return NextResponse.json(
          { error: `입력값이 올바르지 않습니다: ${messages}`, code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      // body가 없어도 진행 가능한 기능이 있음 (briefing 등)
    }

    // 4. 공유캐시 확인 (캐시 히트 시 레이트리밋 소비 안 함)
    const skipCache = feature === 'mock_exam' || feature === 'ask';
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

    // 5. 레이트리밋 확인 (캐시 미스 시에만) — 관리자 바이패스
    const adminBypass = isAdmin(auth.userId);
    const limit = getLimitForFeature(feature, isPremium);
    const { allowed, remaining } = adminBypass
      ? { allowed: true, remaining: 999 }
      : await checkAndIncrement(auth.userId, feature, limit, isPremium);

    if (!allowed) {
      logSecurityEvent('RATE_LIMITED', { userId: auth.userId, feature, isPremium });

      // 무료 사용자에게 Premium 업그레이드 안내
      if (!isPremium) {
        const premiumLimit = getLimitForFeature(feature, true);
        if (premiumLimit > limit) {
          return NextResponse.json(
            {
              error: 'PREMIUM_UPGRADE',
              message: 'Premium 업그레이드 시 더 많이 사용할 수 있습니다.',
              code: 'PREMIUM_UPGRADE',
              currentLimit: limit,
              premiumLimit,
              remaining: 0,
            },
            { status: 429 }
          );
        }
      }

      const periodLabel = isFreeMonthlyLimited(feature) && !isPremium
        ? '월간'
        : (feature === 'weekly_report' || feature === 'dday_strategy') && isPremium
          ? '주간'
          : '일일';
      return NextResponse.json(
        {
          error: `${AI_FEATURES[feature].label} ${periodLabel} 사용 한도를 초과했습니다.`,
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
          .maybeSingle();

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
          .maybeSingle();

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
        const examSubject = (body.subject as 'tax' | 'accounting') ?? 'tax';
        const examTaxScope = (body.taxScope as 'all' | 'national' | 'local') ?? 'all';
        aiResponse = await generateMockExam({
          userId: auth.userId,
          examTarget,
          subject: examSubject,
          taxScope: examTaxScope,
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
    } else if (feature === 'ask') {
      // --- AI 세무 상담 ---
      try {
        if (!isClaudeEnabled()) {
          return NextResponse.json(
            { error: 'AI 상담 기능이 준비 중입니다.', code: 'AI_UNAVAILABLE' },
            { status: 503 }
          );
        }

        const question = body.question as string;
        // Zod 스키마에서 이미 2~500자 검증 완료

        // 공통 premium 체크 결과 활용 (2c에서 이미 확인)
        const effectiveModel = getFeatureModel('ask', isPremium);
        const effectiveMaxTokens = isPremium ? 2048 : 1024;

        // 이중 컨텍스트 수집 (법령 + 기출)
        const context = await gatherContext(question);
        const contextText = formatContextForPrompt(context);

        // 멀티턴 메시지 빌드
        const prevMessages = (body.messages as { role: 'user' | 'assistant'; content: string }[]) ?? [];
        const messages = buildAskMessages(question, contextText, prevMessages);

        // Claude API 호출 (텍스트 응답)
        const result = await callClaude({
          feature,
          systemPrompt: ASK_SYSTEM,
          userMessage: '', // messages 필드 사용
          messages,
          modelOverride: effectiveModel,
          maxTokens: effectiveMaxTokens,
          temperature: 0.4,
        });

        // 사용량 로깅
        logAIUsage({
          userId: auth.userId,
          feature,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          durationMs: result.durationMs,
          cached: false,
        }).catch(() => {});

        return NextResponse.json({
          data: {
            answer: result.content,
            isPremium: !!isPremium,
            model: effectiveModel,
          },
          cached: false,
          remaining,
          aiGenerated: true,
        });
      } catch (err) {
        console.error('[AI API] 세무 상담 오류:', err);
        return NextResponse.json(
          { error: 'AI 상담 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'ASK_ERROR' },
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
    const { enhanced, aiMeta } = await enhanceWithClaude(feature, aiResponse, body, auth.userId, isPremium);
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
