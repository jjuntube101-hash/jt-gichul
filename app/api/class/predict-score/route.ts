/**
 * 합격 예측 점수 API
 * GET  /api/class/predict-score — 합격 예측 조회 (Premium 전용)
 * POST /api/class/predict-score — 자기 평가 점수 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkPremium, getServiceSupabase } from '@/lib/apiAuth';
import { isAdmin } from '@/lib/admin';
import { generatePredictedScore } from '@/lib/predictScoreEngine';
import type { SubjectType } from '@/types/question';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const premium = await checkPremium(auth.userId);
    if (!premium && !isAdmin(auth.userId)) {
      return NextResponse.json({ error: 'Premium 전용 기능입니다.' }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const { data: profile } = await supabase
      .from('user_study_profiles')
      .select('exam_target, self_assessed_scores')
      .eq('user_id', auth.userId)
      .maybeSingle();

    const examTarget = (profile?.exam_target as '9급' | '7급') ?? '9급';
    const selfAssessed = (profile?.self_assessed_scores ?? {}) as Partial<Record<SubjectType, number>>;

    const prediction = await generatePredictedScore({
      userId: auth.userId,
      examTarget,
      selfAssessedScores: selfAssessed,
    });

    return NextResponse.json({ prediction });
  } catch (err) {
    console.error('[PREDICT-SCORE] Error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { scores } = body as { scores: Partial<Record<SubjectType, number>> };

    if (!scores || typeof scores !== 'object') {
      return NextResponse.json({ error: '점수 데이터가 필요합니다.' }, { status: 400 });
    }

    // 점수 범위 검증 (0~100)
    for (const [, score] of Object.entries(scores)) {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        return NextResponse.json({ error: '점수는 0~100 사이여야 합니다.' }, { status: 400 });
      }
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('user_study_profiles')
      .update({ self_assessed_scores: scores })
      .eq('user_id', auth.userId);

    if (error) {
      console.error('[PREDICT-SCORE] Update error:', error);
      return NextResponse.json({ error: '저장 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PREDICT-SCORE] POST Error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
