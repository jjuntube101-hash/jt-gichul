/**
 * 3단계 학습 플래너 엔진 (서버사이드)
 *
 * 월간 → 주간 → 일일 플랜을 생성한다.
 * - 월간: 이번 달에 커버할 주차/토픽 조감도
 * - 주간: 이번 주 과목별 학습 범위 + 진행률
 * - 일일: AI 배합 미션 (기출 있는 과목) + 학습 가이드 (기출 없는 과목)
 *
 * 학원 강의 진도(커리큘럼)와 동기화.
 */

import { createClient } from '@supabase/supabase-js';
import type { SubjectType } from '@/types/question';
import { SUBJECT_CONFIG, getSubjectsForGrade } from '@/types/question';
import { getStudyTimeRatio } from './examWeights';
import { generateDailyMission, type DailyMission } from './dailyMissionEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 월간 플랜 */
export interface MonthPlan {
  month: string;                          // "2026년 5월"
  examTarget: '9급' | '7급';
  daysUntilExam: number | null;
  subjects: MonthSubjectPlan[];
  lastMonthProgress?: number;             // 지난달 달성률
}

export interface MonthSubjectPlan {
  subject: SubjectType;
  label: string;
  stage: string;                          // "기본이론"
  weeksThisMonth: number[];               // 이번 달 해당 주차
  topicsOverview: string;                 // "소득세법(2주) → 법인세법 시작"
  targetQuestions: number;
  progress: number;                       // 0~100
}

/** 주간 플랜 */
export interface WeekPlan {
  weekNum: number;
  dateRange: string;                      // "5.5(월) ~ 5.11(일)"
  examTarget: '9급' | '7급';
  subjects: WeekSubjectPlan[];
  weeklyGoal: number;
  weeklyProgress: number;                 // 0~100
}

export interface WeekSubjectPlan {
  subject: SubjectType;
  label: string;
  title: string;                          // "소득세법 (1) — 금융소득·사업소득"
  topics: string[];
  focus: string;
  targetQuestions: number;
  solvedCount: number;
  accuracy: number;
  type: 'mission' | 'guide';
  lectureRef?: string;
}

/** 일일 플랜 */
export interface DailyPlan {
  date: string;
  examTarget: '9급' | '7급';
  daysUntilExam: number | null;
  totalStudyMinutes: number;
  subjects: DailySubjectPlan[];
  completionRate: number;                 // 0~100
  streak: number;
}

export interface DailySubjectPlan {
  subject: SubjectType;
  label: string;
  studyMinutes: number;
  type: 'mission' | 'guide';
  mission?: DailyMission;
  guide?: {
    topic: string;
    recommendation: string;
    selfCheckItems: string[];
  };
  completed: boolean;
}

/** 플래너 생성 입력 */
export interface PlannerInput {
  userId: string;
  examTarget: '9급' | '7급';
  examDate?: string | null;               // YYYY-MM-DD
  /** 총 학습 가능 시간 (분/일). 기본 240분(4시간) */
  dailyStudyMinutes?: number;
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

function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function getDaysUntilExam(examDate?: string | null): number | null {
  if (!examDate) return null;
  const exam = new Date(examDate + 'T00:00:00+09:00');
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const diff = exam.getTime() - kst.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getMonthLabel(): string {
  const kst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월`;
}

function getWeekDateRange(startDate: string, weekNum: number): string {
  const start = new Date(startDate);
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}.${d.getDate()}(${dayNames[d.getDay()]})`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

// ---------------------------------------------------------------------------
// 일일 플랜 생성 — 핵심
// ---------------------------------------------------------------------------

export async function generateDailyPlan(
  input: PlannerInput,
  getCurriculumWeek: (subject: SubjectType, weekNum: number) => {
    title: string;
    topics: string[];
    laws: string[];
    focus: string;
    targetQuestions: number;
    lectureRef?: string;
  } | null,
  getCurrentWeekNum: () => number,
): Promise<DailyPlan> {
  const { userId, examTarget, examDate, dailyStudyMinutes = 240 } = input;
  const daysUntilExam = getDaysUntilExam(examDate);
  const subjects = getSubjectsForGrade(examTarget);
  const timeRatio = getStudyTimeRatio(examTarget, daysUntilExam);
  const currentWeek = getCurrentWeekNum();
  const supabase = getServiceSupabase();

  // 연속 학습일 조회
  const today = getTodayKST();
  const { data: streakData } = await supabase
    .from('daily_study_logs')
    .select('log_date')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(60);

  let streak = 0;
  if (streakData && streakData.length > 0) {
    const dates = streakData.map((d: { log_date: string }) => d.log_date);
    // 오늘 또는 어제부터 연속 카운트
    const checkDate = new Date(today + 'T00:00:00');
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (dates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // 오늘 아직 안 했으면 어제부터 체크
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }
  }

  // 오늘의 solve_records로 완료 여부 체크
  const { data: todaySolves } = await supabase
    .from('solve_records')
    .select('question_no')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00+09:00`);

  const todaySolvedNos = new Set((todaySolves ?? []).map((s: { question_no: number }) => s.question_no));

  // 과목별 일일 플랜 생성
  const dailySubjects: DailySubjectPlan[] = [];

  for (const subject of subjects) {
    const config = SUBJECT_CONFIG[subject];
    const ratio = timeRatio[subject] ?? 0;
    const studyMinutes = Math.round(dailyStudyMinutes * ratio);

    if (studyMinutes === 0) continue;

    const weekData = getCurriculumWeek(subject, currentWeek);

    if (config.dataAvailable && weekData) {
      // 미션 모드: 기출 데이터 있음
      try {
        const mission = await generateDailyMission({
          userId,
          examTarget,
          subject,
          weekTopics: weekData.topics,
          weekLaws: weekData.laws,
          questionCount: Math.max(5, Math.round(studyMinutes / 1.5 * 0.6)),
        });

        // 완료 여부: 미션 문항 중 오늘 풀은 것
        const completedCount = mission.questionNos.filter((no) => todaySolvedNos.has(no)).length;
        const completed = completedCount >= mission.questionNos.length;

        dailySubjects.push({
          subject,
          label: config.label,
          studyMinutes,
          type: 'mission',
          mission,
          completed,
        });
      } catch {
        // 미션 생성 실패 시 가이드 모드로 폴백
        dailySubjects.push({
          subject,
          label: config.label,
          studyMinutes,
          type: 'guide',
          guide: {
            topic: weekData?.title ?? config.label,
            recommendation: `${weekData?.focus ?? config.label} 학습`,
            selfCheckItems: weekData?.topics.map((t) => `${t} 이해 완료`) ?? [],
          },
          completed: false,
        });
      }
    } else {
      // 가이드 모드: 기출 데이터 없음
      dailySubjects.push({
        subject,
        label: config.label,
        studyMinutes,
        type: 'guide',
        guide: {
          topic: weekData?.title ?? `${config.label} 학습`,
          recommendation: weekData?.focus ?? `${config.label} 기본서 학습`,
          selfCheckItems: weekData?.topics.map((t) => `${t} 이해 완료`) ?? [
            `${config.label} 오늘 분량 학습 완료`,
          ],
        },
        completed: false,
      });
    }
  }

  // 완료율 계산
  const totalItems = dailySubjects.length;
  const completedItems = dailySubjects.filter((s) => s.completed).length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    date: today,
    examTarget,
    daysUntilExam,
    totalStudyMinutes: dailyStudyMinutes,
    subjects: dailySubjects,
    completionRate,
    streak,
  };
}

// ---------------------------------------------------------------------------
// 주간 플랜 생성
// ---------------------------------------------------------------------------

export async function generateWeekPlan(
  input: PlannerInput,
  getCurriculumWeek: (subject: SubjectType, weekNum: number) => {
    title: string;
    topics: string[];
    laws: string[];
    focus: string;
    targetQuestions: number;
    lectureRef?: string;
  } | null,
  currentWeek: number,
  startDate: string,
): Promise<WeekPlan> {
  const { userId, examTarget } = input;
  const subjects = getSubjectsForGrade(examTarget);
  const supabase = getServiceSupabase();

  // 이번 주 월~일 범위
  const weekStart = new Date(startDate);
  weekStart.setDate(weekStart.getDate() + (currentWeek - 1) * 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // 이번 주 풀이 기록
  const { data: weekSolves } = await supabase
    .from('solve_records')
    .select('question_no, is_correct')
    .eq('user_id', userId)
    .gte('created_at', `${weekStartStr}T00:00:00+09:00`)
    .lte('created_at', `${weekEndStr}T23:59:59+09:00`);

  const solveRecords = weekSolves ?? [];

  const weekSubjects: WeekSubjectPlan[] = [];
  let totalGoal = 0;
  let totalSolved = 0;

  for (const subject of subjects) {
    const config = SUBJECT_CONFIG[subject];
    const weekData = getCurriculumWeek(subject, currentWeek);

    if (!weekData) continue;

    // 이 과목의 이번 주 풀이 수
    const [noMin, noMax] = config.noRange;
    const subjectSolves = solveRecords.filter(
      (r: { question_no: number; is_correct: boolean }) =>
        r.question_no >= noMin && r.question_no <= noMax,
    );
    const solvedCount = new Set(subjectSolves.map((r: { question_no: number }) => r.question_no)).size;
    const correctCount = subjectSolves.filter((r: { is_correct: boolean }) => r.is_correct).length;
    const accuracy = subjectSolves.length > 0
      ? Math.round((correctCount / subjectSolves.length) * 100)
      : 0;

    totalGoal += weekData.targetQuestions;
    totalSolved += solvedCount;

    weekSubjects.push({
      subject,
      label: config.label,
      title: weekData.title,
      topics: weekData.topics,
      focus: weekData.focus,
      targetQuestions: weekData.targetQuestions,
      solvedCount,
      accuracy,
      type: config.dataAvailable ? 'mission' : 'guide',
      lectureRef: weekData.lectureRef,
    });
  }

  return {
    weekNum: currentWeek,
    dateRange: getWeekDateRange(startDate, currentWeek),
    examTarget,
    subjects: weekSubjects,
    weeklyGoal: totalGoal,
    weeklyProgress: totalGoal > 0 ? Math.round((totalSolved / totalGoal) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// 월간 플랜 생성
// ---------------------------------------------------------------------------

export function generateMonthPlan(
  input: PlannerInput,
  getCurriculumWeek: (subject: SubjectType, weekNum: number) => {
    title: string;
    topics: string[];
    laws: string[];
    focus: string;
    targetQuestions: number;
    stage?: string;
  } | null,
  currentWeek: number,
  totalWeeks: number,
): MonthPlan {
  const { examTarget, examDate } = input;
  const daysUntilExam = getDaysUntilExam(examDate);
  const subjects = getSubjectsForGrade(examTarget);

  // 이번 달에 해당하는 주차 (현재 주 기준 ±2주, 최대 4주)
  const monthStart = Math.max(1, currentWeek - (currentWeek % 4 === 0 ? 3 : currentWeek % 4 - 1));
  const monthEnd = Math.min(totalWeeks, monthStart + 3);
  const monthWeeks = Array.from(
    { length: monthEnd - monthStart + 1 },
    (_, i) => monthStart + i,
  );

  const monthSubjects: MonthSubjectPlan[] = [];

  for (const subject of subjects) {
    const config = SUBJECT_CONFIG[subject];
    const weekDataList = monthWeeks
      .map((w) => ({ week: w, data: getCurriculumWeek(subject, w) }))
      .filter((w) => w.data !== null);

    if (weekDataList.length === 0) continue;

    // 토픽 개요 생성
    const titles = weekDataList.map((w) => w.data!.title);
    const topicsOverview = titles.length <= 2
      ? titles.join(' → ')
      : `${titles[0]} → ... → ${titles[titles.length - 1]}`;

    const targetQuestions = weekDataList.reduce(
      (sum, w) => sum + (w.data?.targetQuestions ?? 0),
      0,
    );

    monthSubjects.push({
      subject,
      label: config.label,
      stage: weekDataList[0].data?.stage ?? '기본이론',
      weeksThisMonth: monthWeeks,
      topicsOverview,
      targetQuestions,
      progress: 0, // 호출자가 solve_records에서 계산
    });
  }

  return {
    month: getMonthLabel(),
    examTarget,
    daysUntilExam,
    subjects: monthSubjects,
  };
}
