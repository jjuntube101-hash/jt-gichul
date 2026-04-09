/**
 * 합격 예측 점수 엔진 (서버사이드)
 *
 * 기출 풀이 기록 + 자기 평가를 기반으로 전 과목 합격 예측 점수를 산출한다.
 * - 기출 데이터 있는 과목: 정답률 기반 예측
 * - 기출 데이터 없는 과목: 자기 평가 또는 기본값
 * - 신뢰도: 풀이량 기반 (low/medium/high)
 */

import { createClient } from '@supabase/supabase-js';
import type { SubjectType } from '@/types/question';
import { SUBJECT_CONFIG, getSubjectsForGrade } from '@/types/question';
import { EXAM_WEIGHTS } from './examWeights';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PredictedScore {
  totalScore: number;              // 전체 예측 점수 (0~100)
  passLine: number;                // 합격선
  gap: number;                     // 합격선 대비 차이
  confidence: 'low' | 'medium' | 'high';
  subjects: SubjectScore[];
  recommendation: string;
  generatedAt: string;
}

export interface SubjectScore {
  subject: SubjectType;
  label: string;
  score: number;                   // 0~100
  weight: number;                  // 시험 비중
  dataSource: 'gichul' | 'self_assess' | 'default';
  solved: number;
  total: number;
  accuracy: number;                // 원시 정답률 (0~100)
  priority: 'high' | 'medium' | 'low';
  improvementTip?: string;
}

export interface PredictScoreInput {
  userId: string;
  examTarget: '9급' | '7급';
  selfAssessedScores?: Partial<Record<SubjectType, number>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 미설정');
  return createClient(url, key);
}

function getConfidence(totalSolved: number): 'low' | 'medium' | 'high' {
  if (totalSolved >= 200) return 'high';
  if (totalSolved >= 50) return 'medium';
  return 'low';
}

function getPriority(score: number, weight: number): 'high' | 'medium' | 'low' {
  // 가중 점수 기여도가 낮을수록 개선 우선순위 높음
  const contribution = score * weight;
  if (contribution < 15) return 'high';
  if (contribution < 20) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// 메인 엔진
// ---------------------------------------------------------------------------

export async function generatePredictedScore(
  input: PredictScoreInput,
): Promise<PredictedScore> {
  const { userId, examTarget, selfAssessedScores = {} } = input;
  const supabase = getServiceSupabase();
  const subjects = getSubjectsForGrade(examTarget);
  const weights = EXAM_WEIGHTS[examTarget];

  // 전체 풀이 기록 조회
  const { data: records, error } = await supabase
    .from('solve_records')
    .select('question_no, is_correct')
    .eq('user_id', userId);

  if (error) throw new Error(`풀이 기록 조회 실패: ${error.message}`);
  const solveRecords = records ?? [];

  // 과목별 정답률 계산
  const subjectStats = new Map<SubjectType, { solved: number; correct: number }>();
  for (const r of solveRecords) {
    // 문항번호로 과목 판별
    let subject: SubjectType | null = null;
    for (const [s, config] of Object.entries(SUBJECT_CONFIG) as [SubjectType, typeof SUBJECT_CONFIG[SubjectType]][]) {
      const [min, max] = config.noRange;
      if (r.question_no >= min && r.question_no <= max) {
        subject = s;
        break;
      }
    }
    if (!subject) continue;

    const prev = subjectStats.get(subject) ?? { solved: 0, correct: 0 };
    prev.solved += 1;
    if (r.is_correct) prev.correct += 1;
    subjectStats.set(subject, prev);
  }

  // 과목별 점수 산출
  const subjectScores: SubjectScore[] = [];
  let totalSolved = 0;

  for (const subject of subjects) {
    const config = SUBJECT_CONFIG[subject];
    const weight = weights[subject] ?? 0;
    const stats = subjectStats.get(subject);

    let score: number;
    let dataSource: 'gichul' | 'self_assess' | 'default';
    let accuracy = 0;
    let solved = 0;
    let total = 0;

    if (stats && stats.solved >= 10) {
      // 기출 기반 (최소 10문항 이상)
      accuracy = Math.round((stats.correct / stats.solved) * 100);
      // 시험 난이도 보정: 기출은 실전보다 쉬운 편 → 0.85 보정
      score = Math.min(100, Math.round(accuracy * 0.85));
      dataSource = 'gichul';
      solved = stats.solved;
      total = stats.solved;
    } else if (selfAssessedScores[subject] !== undefined) {
      // 자기 평가
      score = Math.min(100, Math.max(0, selfAssessedScores[subject]!));
      dataSource = 'self_assess';
      solved = stats?.solved ?? 0;
    } else {
      // 기본값
      score = 50;
      dataSource = 'default';
    }

    totalSolved += solved;

    const priority = getPriority(score, weight);

    // 개선 팁 생성
    let improvementTip: string | undefined;
    if (priority === 'high') {
      improvementTip = `${config.label}에 집중하면 총점 +${Math.round(weight * 10)}점 이상 가능`;
    }

    subjectScores.push({
      subject,
      label: config.label,
      score,
      weight,
      dataSource,
      solved,
      total,
      accuracy,
      priority,
      improvementTip,
    });
  }

  // 전체 예측 점수
  const totalScore = Math.round(
    subjectScores.reduce((sum, s) => sum + s.score * s.weight, 0),
  );

  const passLine = 70; // 합격선
  const gap = totalScore - passLine;

  // 최우선 개선 과목 추천
  const highPriority = subjectScores
    .filter((s) => s.priority === 'high')
    .sort((a, b) => a.score - b.score);

  let recommendation: string;
  if (gap >= 0) {
    recommendation = `합격선 이상입니다! 약점 과목(${highPriority[0]?.label ?? '없음'})을 보강하면 안정권에 진입합니다.`;
  } else if (highPriority.length > 0) {
    const top = highPriority[0];
    recommendation = `${top.label}에 집중하면 총점 +${Math.round(top.weight * 15)}점 향상 가능합니다.`;
  } else {
    recommendation = '전 과목 골고루 학습하면 합격에 근접합니다.';
  }

  return {
    totalScore,
    passLine,
    gap,
    confidence: getConfidence(totalSolved),
    subjects: subjectScores,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
}
