/**
 * 커리큘럼 설정 API
 * GET  /api/class/curriculum — 과목별 커리큘럼 설정 조회
 * POST /api/class/curriculum — 과목별 커리큘럼 선택 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, getServiceSupabase } from '@/lib/apiAuth';
import { getPresetsForSubject, getPresetById } from '@/lib/curriculum';
import { type SubjectType, getSubjectsForGrade } from '@/types/question';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurriculumSubjectSetting {
  presetId: string;
  customWeeks: import('@/lib/curriculum').CurriculumWeek[] | null;
}

type CurriculumSettings = Record<string, CurriculumSubjectSetting>;

// ---------------------------------------------------------------------------
// GET /api/class/curriculum
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // 1. 인증
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    // 2. user_study_profiles에서 exam_target + curriculum_settings 조회
    const supabase = getServiceSupabase();
    const { data: profile, error } = await supabase
      .from('user_study_profiles')
      .select('exam_target, curriculum_settings')
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (error) {
      console.error('[curriculum GET] profile query error:', error);
      return NextResponse.json(
        { error: '프로필 조회 중 오류가 발생했습니다.', code: 'DB_ERROR' },
        { status: 500 },
      );
    }

    // 3. exam_target 기반으로 해당 등급의 과목별 프리셋 목록 수집
    const examTarget = (profile?.exam_target ?? '9급') as '9급' | '7급';
    const subjects = getSubjectsForGrade(examTarget);

    const presets = subjects.flatMap((subject) =>
      getPresetsForSubject(subject, examTarget),
    );

    // 4. 저장된 커리큘럼 설정 반환 (없으면 null)
    const userSettings: CurriculumSettings | null =
      (profile?.curriculum_settings as CurriculumSettings) ?? null;

    return NextResponse.json({ presets, userSettings });
  } catch (err) {
    console.error('[curriculum GET] unexpected error:', err);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/class/curriculum
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. 인증
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    // 2. 요청 바디 파싱
    let body: { subject: SubjectType; presetId: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: '요청 본문이 올바르지 않습니다.', code: 'INVALID_BODY' },
        { status: 400 },
      );
    }

    const { subject, presetId } = body;

    if (!subject || !presetId) {
      return NextResponse.json(
        { error: 'subject와 presetId는 필수입니다.', code: 'MISSING_FIELDS' },
        { status: 400 },
      );
    }

    // 3. presetId 유효성 확인
    const preset = getPresetById(presetId);
    if (!preset) {
      return NextResponse.json(
        { error: '유효하지 않은 presetId입니다.', code: 'INVALID_PRESET' },
        { status: 400 },
      );
    }

    if (preset.subject !== subject) {
      return NextResponse.json(
        { error: 'subject와 preset이 일치하지 않습니다.', code: 'PRESET_SUBJECT_MISMATCH' },
        { status: 400 },
      );
    }

    // 4. 기존 curriculum_settings 읽기 → 해당 subject 키 업데이트 → upsert
    const supabase = getServiceSupabase();
    const { data: existing, error: readError } = await supabase
      .from('user_study_profiles')
      .select('curriculum_settings')
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (readError) {
      console.error('[curriculum POST] read error:', readError);
      return NextResponse.json(
        { error: '설정 조회 중 오류가 발생했습니다.', code: 'DB_ERROR' },
        { status: 500 },
      );
    }

    const prevSettings: CurriculumSettings =
      (existing?.curriculum_settings as CurriculumSettings) ?? {};

    const newSettings: CurriculumSettings = {
      ...prevSettings,
      [subject]: {
        presetId,
        customWeeks: null, // 커스텀 주차는 추후 구현
      },
    };

    const { error: upsertError } = await supabase
      .from('user_study_profiles')
      .upsert(
        { user_id: auth.userId, curriculum_settings: newSettings },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      console.error('[curriculum POST] upsert error:', upsertError);
      return NextResponse.json(
        { error: '설정 저장 중 오류가 발생했습니다.', code: 'DB_ERROR' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[curriculum POST] unexpected error:', err);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
