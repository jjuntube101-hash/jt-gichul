/**
 * 일일 학습 플랜 API
 * GET /api/class/daily-plan — 오늘의 학습 플랜 (Premium 전용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkPremium, getServiceSupabase } from '@/lib/apiAuth';
import { isAdmin } from '@/lib/admin';
import { generateDailyPlan } from '@/lib/dailyPlanEngine';
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

    // 사용자 프로필에서 시험 목표, 시험일, 커리큘럼 설정 조회
    const supabase = getServiceSupabase();
    const { data: profile } = await supabase
      .from('user_study_profiles')
      .select('exam_target, exam_date, study_start_date, curriculum_settings')
      .eq('user_id', auth.userId)
      .maybeSingle();

    const examTarget = (profile?.exam_target as '9급' | '7급') ?? '9급';
    const examDate = profile?.exam_date ?? null;
    const startDate = profile?.study_start_date ?? new Date().toISOString().slice(0, 10);
    const currSettings = (profile?.curriculum_settings ?? {}) as Record<string, { presetId: string }>;

    const { getPresetById, getDefaultPresetId, presetToCurriculumData, getCurrentWeek } = await import('@/lib/curriculum');

    // 사용자 커리큘럼 or 기본 프리셋에서 주차 정보 조회
    const getCurriculumWeek = (subject: SubjectType, weekNum: number) => {
      try {
        const presetId = currSettings[subject]?.presetId ?? getDefaultPresetId(subject, examTarget);
        const preset = getPresetById(presetId);
        if (!preset) return null;
        const data = presetToCurriculumData(preset);
        const allWeeks = data.stages.flatMap(s => s.weeks);
        const week = allWeeks.find((w) => w.week === weekNum);
        if (!week) return null;
        return {
          title: week.title,
          topics: week.topics,
          laws: week.laws,
          focus: week.focus,
          targetQuestions: week.targetQuestions,
        };
      } catch {
        return null;
      }
    };

    // totalWeeks는 세법 기준 (가장 긴 과목)
    const taxPresetId = currSettings['tax']?.presetId ?? getDefaultPresetId('tax', examTarget);
    const taxPreset = getPresetById(taxPresetId);
    const totalWeeks = taxPreset?.totalWeeks ?? 13;
    const currentWeek = getCurrentWeek(startDate, totalWeeks, examDate);

    const plan = await generateDailyPlan(
      { userId: auth.userId, examTarget, examDate },
      getCurriculumWeek,
      () => currentWeek,
    );

    return NextResponse.json({ plan });
  } catch (err) {
    console.error('[DAILY-PLAN] Error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
