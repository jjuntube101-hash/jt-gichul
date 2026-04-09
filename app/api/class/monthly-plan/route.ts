/**
 * 월간 학습 플랜 API
 * GET /api/class/monthly-plan — 이번 달 학습 범위 조감도 (Premium 전용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, checkPremium, getServiceSupabase } from '@/lib/apiAuth';
import { isAdmin } from '@/lib/admin';
import { generateMonthPlan } from '@/lib/dailyPlanEngine';
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
      .select('exam_target, exam_date, study_start_date, curriculum_settings')
      .eq('user_id', auth.userId)
      .maybeSingle();

    const examTarget = (profile?.exam_target as '9급' | '7급') ?? '9급';
    const examDate = profile?.exam_date ?? null;
    const startDate = profile?.study_start_date ?? new Date().toISOString().slice(0, 10);
    const currSettings = (profile?.curriculum_settings ?? {}) as Record<string, { presetId: string }>;

    const { getPresetById, getDefaultPresetId, presetToCurriculumData, getCurrentWeek } = await import('@/lib/curriculum');

    const taxPresetId = currSettings['tax']?.presetId ?? getDefaultPresetId('tax', examTarget);
    const taxPreset = getPresetById(taxPresetId);
    const totalWeeks = taxPreset?.totalWeeks ?? 13;
    const currentWeek = getCurrentWeek(startDate, totalWeeks, examDate);

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
          stage: data.stages.find(s => s.weeks.some(w => w.week === weekNum))?.name ?? '기본이론',
        };
      } catch {
        return null;
      }
    };

    const plan = generateMonthPlan(
      { userId: auth.userId, examTarget, examDate },
      getCurriculumWeek,
      currentWeek,
      totalWeeks,
    );

    return NextResponse.json({ plan });
  } catch (err) {
    console.error('[MONTHLY-PLAN] Error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
