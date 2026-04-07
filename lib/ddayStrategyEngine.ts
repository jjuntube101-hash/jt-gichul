/**
 * D-day 전략 엔진 (서버사이드)
 *
 * 시험일까지 남은 기간을 분석하여 현재 페이스 기반 전략을 제시한다.
 * 코칭 톤: 팩트 중심, 건조한 코치. 감정 케어 없음.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Question, ChunkMeta, ExamIndex } from '@/types/question';

// --- 인터페이스 ---

export interface DdayStrategyInput {
  userId: string;
  examTarget: '9급' | '7급';
}

export interface DdayStrategy {
  title: string;                    // "D-45 전략"
  dDay: number;                     // 남은 일수
  examName: string;                 // "9급 국가직"
  examDate: string;                 // "2026-05-22"

  currentPace: {
    totalSolved: number;            // 누적 풀이 수
    totalQuestions: number;          // 전체 문항 수
    completionRate: number;         // 완료율 %
    weeklyAverage: number;          // 최근 4주 평균 주간 풀이 수
    dailyAverage: number;           // 일 평균
  };

  projection: {
    questionsNeeded: number;        // 남은 문항 수
    dailyTarget: number;            // 일 목표 (남은 문항/남은 일수)
    projectedCompletion: number;    // 현 페이스로 소화 가능한 문항 수
    gapAnalysis: string;            // 갭 분석 문장
  };

  lawProgress: {
    law: string;                    // "국세기본법"
    total: number;
    solved: number;
    accuracy: number;
    status: 'complete' | 'in_progress' | 'not_started';
    priority: number;               // 1=최우선
  }[];

  weeklyPlan: string[];             // 이번 주 할 일 (3~5개)

  generatedAt: string;
}

// --- 서버사이드 유틸 ---

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 미설정');
  return createClient(url, key);
}

/** 서버사이드에서 전체 문항 로드 (파일시스템) */
function loadAllQuestionsServer(): Question[] {
  const metaPath = path.join(process.cwd(), 'public/data/questions/meta.json');
  const meta: ChunkMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const all: Question[] = [];
  for (const chunk of meta.chunks) {
    const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
    const questions: Question[] = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
    all.push(...questions);
  }
  return all;
}

/** exam_index.json 로드 */
function loadExamIndexServer(): ExamIndex {
  const indexPath = path.join(process.cwd(), 'public/data/exam_index.json');
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

/** KST 기준 오늘 날짜 */
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** D-day 계산 (양수 = 시험일까지 남은 일수) */
function calcDday(examDate: string): number {
  const today = new Date(todayKST());
  const exam = new Date(examDate);
  const diff = exam.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** n주 전 월요일 날짜 */
function weeksAgoMondayKST(n: number): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  kst.setUTCDate(kst.getUTCDate() - diff - (n * 7));
  return kst.toISOString().slice(0, 10);
}

// --- 메인 엔진 ---

interface SolveRecord {
  question_no: number;
  is_correct: boolean;
  created_at: string;
}

export async function generateDdayStrategy(
  input: DdayStrategyInput
): Promise<DdayStrategy> {
  const { userId, examTarget } = input;
  const supabase = getServiceSupabase();

  // 1. 프로필 조회
  const { data: profile } = await supabase
    .from('user_study_profiles')
    .select('exam_date, exam_name, exam_target')
    .eq('user_id', userId)
    .single();

  if (!profile?.exam_date) {
    throw new Error('EXAM_DATE_NOT_SET');
  }

  const dDay = calcDday(profile.exam_date);
  const examName = profile.exam_name ?? `${examTarget} 공무원`;

  // 2. 전체 풀이 기록 조회
  const { data: records, error: recordsError } = await supabase
    .from('solve_records')
    .select('question_no, is_correct, created_at')
    .eq('user_id', userId);

  if (recordsError) {
    throw new Error(`풀이 기록 조회 실패: ${recordsError.message}`);
  }

  const solveRecords: SolveRecord[] = records ?? [];

  // 3. 전체 문항 로드 + 직급 필터
  const allQuestions = loadAllQuestionsServer();
  const targetQuestions = allQuestions.filter((q) => q.직급 === examTarget);
  const totalQuestions = targetQuestions.length;

  // 4. 고유 풀이 문항 수 (해당 직급만)
  const targetNos = new Set(targetQuestions.map((q) => q.no));
  const solvedNos = new Set(
    solveRecords
      .filter((r) => targetNos.has(r.question_no))
      .map((r) => r.question_no)
  );
  const totalSolved = solvedNos.size;

  // 5. 최근 4주 주간 평균 계산
  const fourWeeksAgo = weeksAgoMondayKST(4);
  const recentRecords = solveRecords.filter(
    (r) => r.created_at >= fourWeeksAgo && targetNos.has(r.question_no)
  );
  // 고유 문항 기준으로 주간 풀이 수 계산
  const recentSolvedNos = new Set(recentRecords.map((r) => r.question_no));
  const weeklyAverage = recentSolvedNos.size > 0
    ? Math.round(recentSolvedNos.size / 4)
    : 0;
  const dailyAverage = weeklyAverage > 0 ? Math.round(weeklyAverage / 7) : 0;

  // 6. 완료율
  const completionRate = totalQuestions > 0
    ? Math.round((totalSolved / totalQuestions) * 1000) / 10
    : 0;

  // 7. 전망 계산
  const questionsNeeded = totalQuestions - totalSolved;
  const dailyTarget = dDay > 0
    ? Math.ceil(questionsNeeded / dDay)
    : questionsNeeded;
  const projectedCompletion = dDay > 0
    ? dailyAverage * dDay
    : 0;

  let gapAnalysis: string;
  if (projectedCompletion >= questionsNeeded) {
    const completionDay = dailyAverage > 0
      ? Math.ceil(questionsNeeded / dailyAverage)
      : dDay;
    gapAnalysis = `현 페이스 유지 시 D-${dDay - completionDay} 완료 예상`;
  } else {
    const coverRate = questionsNeeded > 0
      ? Math.round((projectedCompletion / questionsNeeded) * 100)
      : 0;
    gapAnalysis = `현 페이스로는 남은 문항의 ${coverRate}%만 소화 가능`;
  }

  // 8. 법률별 진행률 + 정답률
  const examIndex = loadExamIndexServer();
  const lawMap = new Map<string, { total: number; solved: number; correct: number }>();

  // exam_index에서 법률별 총 문항 수 집계
  for (const [, laws] of Object.entries(examIndex.categories)) {
    for (const [lawName, topics] of Object.entries(laws)) {
      let lawTotal = 0;
      for (const [, topicData] of Object.entries(topics)) {
        const byExam = topicData.by_exam?.[examTarget] ?? 0;
        lawTotal += byExam;
      }
      if (lawTotal > 0) {
        lawMap.set(lawName, { total: lawTotal, solved: 0, correct: 0 });
      }
    }
  }

  // 풀이 기록에서 법률별 풀이 수 + 정답 수 집계
  const questionLawMap = new Map<number, string>();
  for (const q of targetQuestions) {
    questionLawMap.set(q.no, q.대분류);
  }

  // 문항별 최종 정답 여부 (마지막 풀이 기준)
  const latestResult = new Map<number, boolean>();
  const sorted = [...solveRecords]
    .filter((r) => targetNos.has(r.question_no))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const r of sorted) {
    latestResult.set(r.question_no, r.is_correct);
  }

  for (const [qNo, isCorrect] of latestResult) {
    const law = questionLawMap.get(qNo);
    if (!law) continue;
    const entry = lawMap.get(law);
    if (!entry) continue;
    entry.solved += 1;
    if (isCorrect) entry.correct += 1;
  }

  // 우선순위: 정답률 낮은 순 + 미풀이 비율 높은 순
  const lawProgress = Array.from(lawMap.entries())
    .map(([law, data]) => {
      const accuracy = data.solved > 0
        ? Math.round((data.correct / data.solved) * 100)
        : 0;
      const solvedRate = data.total > 0 ? data.solved / data.total : 0;

      let status: 'complete' | 'in_progress' | 'not_started';
      if (solvedRate >= 0.9) status = 'complete';
      else if (data.solved > 0) status = 'in_progress';
      else status = 'not_started';

      // 우선순위 점수: 정답률 낮을수록 + 미풀이 많을수록 높은 우선순위
      const priorityScore = (100 - accuracy) * 0.4 + (1 - solvedRate) * 100 * 0.6;

      return {
        law,
        total: data.total,
        solved: data.solved,
        accuracy,
        status,
        _priorityScore: priorityScore,
        priority: 0, // 아래에서 설정
      };
    })
    .sort((a, b) => b._priorityScore - a._priorityScore)
    .map(({ _priorityScore, ...rest }, idx) => ({
      ...rest,
      priority: idx + 1,
    }));

  // 9. 이번 주 플랜 생성
  const weeklyPlan: string[] = [];
  const topPriority = lawProgress
    .filter((l) => l.status !== 'complete')
    .slice(0, 5);

  for (const lp of topPriority) {
    if (weeklyPlan.length >= 5) break;
    const remaining = lp.total - lp.solved;

    if (lp.status === 'in_progress' && remaining <= 20) {
      weeklyPlan.push(`${lp.law} 마무리 (${remaining}문항)`);
    } else if (lp.status === 'not_started') {
      const target = Math.min(remaining, 15);
      weeklyPlan.push(`${lp.law} 시작 (${target}문항)`);
    } else {
      const target = Math.min(remaining, 20);
      weeklyPlan.push(`${lp.law} (${target}문항${lp.accuracy < 60 ? ', 정답률 보강' : ''})`);
    }
  }

  if (weeklyPlan.length === 0) {
    weeklyPlan.push('전 과목 2회독 진행');
  }

  return {
    title: `D-${dDay} 전략`,
    dDay,
    examName,
    examDate: profile.exam_date,

    currentPace: {
      totalSolved,
      totalQuestions,
      completionRate,
      weeklyAverage,
      dailyAverage,
    },

    projection: {
      questionsNeeded,
      dailyTarget,
      projectedCompletion,
      gapAnalysis,
    },

    lawProgress,
    weeklyPlan,
    generatedAt: new Date().toISOString(),
  };
}
