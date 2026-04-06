/**
 * 주간 약점 분석 엔진 (서버사이드)
 *
 * 이번 주(월~일) 풀이 기록을 분석하여 약점 해부 보고서를 생성한다.
 * AI 호출 없이 데이터 기반 로직으로 팩트 중심 분석.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Question, ChunkMeta } from '@/types/question';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyReportInput {
  userId: string;
  examTarget: '9급' | '7급';
}

export interface TopicAnalysis {
  law: string;           // "소득세법"
  topic: string;         // "종합소득"
  totalSolved: number;
  correctCount: number;
  accuracy: number;      // 0~100
  mainTrapTypes: string[];
  weakChoices: string[];
}

export interface WeeklyReport {
  title: string;
  period: string;
  overallStats: {
    totalSolved: number;
    accuracy: number;
    improvement: number;  // 전주 대비 변화 (+/-%)
    studyTimeMinutes: number;
  };
  weakTopics: TopicAnalysis[];
  trapTypeBreakdown: {
    trapType: string;
    count: number;
    percentage: number;
  }[];
  recommendations: string[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 미설정');
  return createClient(url, key);
}

/** KST 기준 현재 시각 */
function nowKST(): Date {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

/** 이번 주 월요일 (YYYY-MM-DD) */
function getWeekStartKST(): string {
  const kst = nowKST();
  const day = kst.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1;
  kst.setUTCDate(kst.getUTCDate() - diff);
  return kst.toISOString().slice(0, 10);
}

/** 이번 주 일요일 (YYYY-MM-DD) */
function getWeekEndKST(): string {
  const kst = nowKST();
  const day = kst.getUTCDay();
  const diff = day === 0 ? 0 : 7 - day;
  kst.setUTCDate(kst.getUTCDate() + diff);
  return kst.toISOString().slice(0, 10);
}

/** 지난 주 월~일 */
function getLastWeekRange(): { start: string; end: string } {
  const kst = nowKST();
  const day = kst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  kst.setUTCDate(kst.getUTCDate() - diff - 7);
  const start = kst.toISOString().slice(0, 10);
  kst.setUTCDate(kst.getUTCDate() + 6);
  const end = kst.toISOString().slice(0, 10);
  return { start, end };
}

/** 날짜 포맷 (YYYY.MM.DD) */
function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, '.');
}

/** 서버사이드에서 전체 문항 로드 (파일시스템) */
let _questionsCache: Question[] | null = null;
function loadAllQuestionsServer(): Question[] {
  if (_questionsCache) return _questionsCache;
  const metaPath = path.join(process.cwd(), 'public/data/questions/meta.json');
  const meta: ChunkMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const all: Question[] = [];
  for (const chunk of meta.chunks) {
    const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
    const questions: Question[] = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
    all.push(...questions);
  }
  _questionsCache = all;
  return all;
}

/** 문항 맵 생성 (no -> Question) */
function buildQuestionMap(): Map<number, Question> {
  const questions = loadAllQuestionsServer();
  const map = new Map<number, Question>();
  for (const q of questions) {
    map.set(q.no, q);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------

interface SolveRecord {
  question_no: number;
  is_correct: boolean;
  created_at: string;
}

interface DailyLog {
  study_seconds: number;
}

export async function generateWeeklyReport(
  input: WeeklyReportInput
): Promise<WeeklyReport> {
  const sb = getServiceSupabase();
  const weekStart = getWeekStartKST();
  const weekEnd = getWeekEndKST();
  const lastWeek = getLastWeekRange();

  // 1. 이번 주 + 지난 주 풀이 기록 & 학습 로그 병렬 조회
  const [thisWeekRes, lastWeekRes, studyLogsRes] = await Promise.all([
    sb
      .from('solve_records')
      .select('question_no, is_correct, created_at')
      .eq('user_id', input.userId)
      .gte('created_at', `${weekStart}T00:00:00+09:00`)
      .lte('created_at', `${weekEnd}T23:59:59+09:00`),
    sb
      .from('solve_records')
      .select('question_no, is_correct, created_at')
      .eq('user_id', input.userId)
      .gte('created_at', `${lastWeek.start}T00:00:00+09:00`)
      .lte('created_at', `${lastWeek.end}T23:59:59+09:00`),
    sb
      .from('daily_study_logs')
      .select('study_seconds')
      .eq('user_id', input.userId)
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd),
  ]);

  const thisWeekRecords: SolveRecord[] = thisWeekRes.data ?? [];
  const lastWeekRecords: SolveRecord[] = lastWeekRes.data ?? [];
  const studyLogs: DailyLog[] = studyLogsRes.data ?? [];

  // 데이터 없으면 빈 보고서
  if (thisWeekRecords.length === 0) {
    return {
      title: `약점 해부 보고서`,
      period: `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`,
      overallStats: {
        totalSolved: 0,
        accuracy: 0,
        improvement: 0,
        studyTimeMinutes: 0,
      },
      weakTopics: [],
      trapTypeBreakdown: [],
      recommendations: ['이번 주 풀이 기록이 없습니다. 문항을 풀어야 분석이 가능합니다.'],
      generatedAt: new Date().toISOString(),
    };
  }

  // 2. 문항 맵 로드
  const questionMap = buildQuestionMap();

  // 3. 이번 주 전체 정답률
  const thisCorrect = thisWeekRecords.filter((r) => r.is_correct).length;
  const thisAccuracy = Math.round((thisCorrect / thisWeekRecords.length) * 100);

  // 지난 주 정답률
  const lastCorrect = lastWeekRecords.filter((r) => r.is_correct).length;
  const lastAccuracy =
    lastWeekRecords.length > 0
      ? Math.round((lastCorrect / lastWeekRecords.length) * 100)
      : 0;
  const improvement = lastWeekRecords.length > 0 ? thisAccuracy - lastAccuracy : 0;

  // 학습 시간 합산
  const totalStudySeconds = studyLogs.reduce((sum, log) => sum + (log.study_seconds ?? 0), 0);
  const studyTimeMinutes = Math.round(totalStudySeconds / 60);

  // 4. 토픽별 분석
  interface TopicBucket {
    law: string;
    topic: string;
    total: number;
    correct: number;
    trapCounts: Map<string, number>;
    wrongChoiceSummaries: string[];
  }

  const topicMap = new Map<string, TopicBucket>();
  const globalTrapCounts = new Map<string, number>();

  for (const record of thisWeekRecords) {
    const q = questionMap.get(record.question_no);
    if (!q) continue;

    const key = `${q.대분류}::${q.중분류}`;
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        law: q.대분류,
        topic: q.중분류,
        total: 0,
        correct: 0,
        trapCounts: new Map(),
        wrongChoiceSummaries: [],
      });
    }

    const bucket = topicMap.get(key)!;
    bucket.total++;
    if (record.is_correct) {
      bucket.correct++;
    } else {
      // 오답인 경우 함정유형 집계
      if (q.analysis?.choices_analysis) {
        for (const ca of q.analysis.choices_analysis) {
          if (ca.trap_type) {
            bucket.trapCounts.set(
              ca.trap_type,
              (bucket.trapCounts.get(ca.trap_type) ?? 0) + 1
            );
            globalTrapCounts.set(
              ca.trap_type,
              (globalTrapCounts.get(ca.trap_type) ?? 0) + 1
            );
          }
        }
      }
      // 오답 선지 패턴 요약
      if (q.analysis?.trap_patterns?.length) {
        bucket.wrongChoiceSummaries.push(...q.analysis.trap_patterns);
      }
    }
  }

  // 5. weakTopics: 정확도 낮은 순 상위 5개 (최소 2문항 이상 풀어야 포함)
  const allTopics: TopicAnalysis[] = [];
  for (const bucket of topicMap.values()) {
    if (bucket.total < 2) continue;
    const accuracy = Math.round((bucket.correct / bucket.total) * 100);
    const sortedTraps = [...bucket.trapCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);
    const uniqueChoices = [...new Set(bucket.wrongChoiceSummaries)].slice(0, 3);

    allTopics.push({
      law: bucket.law,
      topic: bucket.topic,
      totalSolved: bucket.total,
      correctCount: bucket.correct,
      accuracy,
      mainTrapTypes: sortedTraps,
      weakChoices: uniqueChoices,
    });
  }
  allTopics.sort((a, b) => a.accuracy - b.accuracy);
  const weakTopics = allTopics.slice(0, 5);

  // 6. 함정유형별 오답 분포
  const totalTrapErrors = [...globalTrapCounts.values()].reduce((s, v) => s + v, 0);
  const trapTypeBreakdown = [...globalTrapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([trapType, count]) => ({
      trapType,
      count,
      percentage: totalTrapErrors > 0 ? Math.round((count / totalTrapErrors) * 100) : 0,
    }));

  // 7. 권고사항 생성 (팩트 중심, 건조한 코치)
  const recommendations: string[] = [];

  for (const t of weakTopics.slice(0, 3)) {
    recommendations.push(
      `${t.law} ${t.topic}: ${t.totalSolved}문항 중 ${t.correctCount}문항 정답 (${t.accuracy}%). 조문 복습 필요.`
    );
  }

  if (trapTypeBreakdown.length > 0) {
    const topTrap = trapTypeBreakdown[0];
    recommendations.push(
      `${topTrap.trapType} 함정 ${topTrap.count}회 실수. 해당 유형 선지 집중 훈련 권장.`
    );
  }

  if (weakTopics.length > 0) {
    const topLaws = [...new Set(weakTopics.map((t) => t.law))].slice(0, 2);
    recommendations.push(
      `다음 주 학습 우선순위: ${topLaws.join(', ')} 집중 복습.`
    );
  }

  if (improvement < -5) {
    recommendations.push(
      `전주 대비 정답률 ${improvement}% 하락. 풀이 속도보다 정확도에 집중할 것.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('분석할 오답 데이터가 부족합니다. 더 많은 문항을 풀어주세요.');
  }

  // 주차 계산
  const weekStartDate = new Date(weekStart);
  const monthNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const month = monthNames[weekStartDate.getUTCMonth()];
  const weekOfMonth = Math.ceil(weekStartDate.getUTCDate() / 7);

  return {
    title: `약점 해부 보고서 -- ${month}월 ${weekOfMonth}주`,
    period: `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`,
    overallStats: {
      totalSolved: thisWeekRecords.length,
      accuracy: thisAccuracy,
      improvement,
      studyTimeMinutes,
    },
    weakTopics,
    trapTypeBreakdown,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}
