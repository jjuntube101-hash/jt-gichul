/**
 * 일일 미션 배합 엔진 (서버사이드)
 *
 * 커리큘럼 이번 주차 + 약점 + 간격반복 + 도전 문항을 배합하여
 * 오늘 풀어야 할 기출 문항 리스트를 생성한다.
 *
 * 배합 비율: 약점 40% + 이번 주 범위 30% + 복습(간격반복) 20% + 도전 10%
 *
 * 세법/회계 등 기출 데이터가 있는 과목만 미션 생성.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Question, ChunkMeta, SubjectType } from '@/types/question';
import { SUBJECT_CONFIG } from '@/types/question';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyMissionConfig {
  userId: string;
  examTarget: '9급' | '7급';
  subject: SubjectType;
  /** 이번 주 커리큘럼 토픽 (소분류 기준) */
  weekTopics: string[];
  /** 이번 주 커리큘럼 법률 (대분류 기준) */
  weekLaws: string[];
  /** 목표 문항 수 (기본 15) */
  questionCount?: number;
}

export interface DailyMission {
  date: string;
  subject: SubjectType;
  label: string;
  questionNos: number[];
  breakdown: {
    weak: number;
    thisWeek: number;
    review: number;
    challenge: number;
  };
  estimatedMinutes: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers (mockExamEngine에서 재활용)
// ---------------------------------------------------------------------------

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 미설정');
  return createClient(url, key);
}

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 메인 엔진
// ---------------------------------------------------------------------------

interface SolveRecord {
  question_no: number;
  is_correct: boolean;
  created_at: string;
}

export async function generateDailyMission(
  config: DailyMissionConfig,
): Promise<DailyMission> {
  const {
    userId,
    examTarget,
    subject,
    weekTopics,
    weekLaws,
    questionCount = 15,
  } = config;

  const subjectConfig = SUBJECT_CONFIG[subject];
  if (!subjectConfig.dataAvailable) {
    throw new Error(`${subjectConfig.label}은(는) 기출 데이터가 없어 미션을 생성할 수 없습니다.`);
  }

  const supabase = getServiceSupabase();

  // 1. 유저 풀이 기록 조회
  const { data: records, error } = await supabase
    .from('solve_records')
    .select('question_no, is_correct, created_at')
    .eq('user_id', userId);

  if (error) throw new Error(`풀이 기록 조회 실패: ${error.message}`);
  const solveRecords: SolveRecord[] = records ?? [];

  // 2. 전체 문항 로드 + 과목/직급 필터
  const allQuestions = loadAllQuestionsServer();
  const [noMin, noMax] = subjectConfig.noRange;
  const pool = allQuestions.filter(
    (q) =>
      q.no >= noMin &&
      q.no <= noMax &&
      (q.직급 === examTarget || q.직급 === '공통'),
  );

  // 3. 풀이 기록 분석
  const solvedMap = new Map<number, { total: number; correct: number; lastDate: string }>();
  for (const r of solveRecords) {
    const prev = solvedMap.get(r.question_no) ?? { total: 0, correct: 0, lastDate: '' };
    prev.total += 1;
    if (r.is_correct) prev.correct += 1;
    if (r.created_at > prev.lastDate) prev.lastDate = r.created_at;
    solvedMap.set(r.question_no, prev);
  }

  const poolMap = new Map<number, Question>();
  for (const q of pool) poolMap.set(q.no, q);

  // 약점 토픽 수집
  const wrongTopics = new Map<string, number>();
  for (const [qNo, stats] of solvedMap) {
    const wrongCount = stats.total - stats.correct;
    if (wrongCount > 0) {
      const q = poolMap.get(qNo);
      if (q) {
        wrongTopics.set(q.소분류, (wrongTopics.get(q.소분류) ?? 0) + wrongCount);
      }
    }
  }

  const hasHistory = solvedMap.size >= 5;
  const solvedNos = new Set(solvedMap.keys());

  // 4. 풀 분류

  // 약점: 틀린 문항의 같은 소분류 토픽에서 선택
  const weakTopicSet = new Set(wrongTopics.keys());
  const weakPool = hasHistory
    ? pool.filter(
        (q) =>
          weakTopicSet.has(q.소분류) &&
          !(
            solvedMap.get(q.no)?.correct === solvedMap.get(q.no)?.total &&
            (solvedMap.get(q.no)?.total ?? 0) > 1
          ),
      )
    : [];

  // 이번 주 범위: 커리큘럼 토픽과 법률에 매칭되는 문항
  const topicSet = new Set(weekTopics);
  const lawSet = new Set(weekLaws);
  const thisWeekPool = pool.filter((q) => {
    if (weekLaws.length > 0 && weekTopics.length > 0) {
      return lawSet.has(q.대분류) && topicSet.has(q.소분류);
    }
    if (weekLaws.length > 0) return lawSet.has(q.대분류);
    if (weekTopics.length > 0) return topicSet.has(q.소분류);
    return false;
  });

  // 복습(간격반복): 간격반복 카드에서 today due인 문항
  const today = getTodayKST();
  const { data: srCards } = await supabase
    .from('spaced_repetition_cards')
    .select('question_no')
    .eq('user_id', userId)
    .lte('next_review_date', today)
    .limit(50);

  const reviewNos = new Set((srCards ?? []).map((c: { question_no: number }) => c.question_no));
  const reviewPool = pool.filter((q) => reviewNos.has(q.no));

  // 도전: 난이도 4 이상
  const challengePool = pool.filter((q) => q.analysis.difficulty >= 4);

  // 5. 배합 비율
  let weakCount: number, thisWeekCount: number, reviewCount: number, challengeCount: number;

  if (!hasHistory) {
    // 풀이 기록 부족: 이번 주 60% + 미풀이 30% + 도전 10%
    weakCount = 0;
    thisWeekCount = Math.round(questionCount * 0.6);
    reviewCount = 0;
    challengeCount = Math.round(questionCount * 0.1);
  } else {
    weakCount = Math.round(questionCount * 0.4);
    thisWeekCount = Math.round(questionCount * 0.3);
    reviewCount = Math.round(questionCount * 0.2);
    challengeCount = questionCount - weakCount - thisWeekCount - reviewCount;
  }

  // 6. 문항 선택 (중복 방지)
  const selectedNos = new Set<number>();

  // 오늘 이미 풀은 문항 제외
  const { data: todaySolves } = await supabase
    .from('solve_records')
    .select('question_no')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00+09:00`);

  for (const s of todaySolves ?? []) {
    selectedNos.add(s.question_no);
  }

  function pickFromPool(source: Question[], target: number): number[] {
    const available = source.filter((q) => !selectedNos.has(q.no));
    const picked = pickRandom(available, target);
    for (const q of picked) selectedNos.add(q.no);
    return picked.map((q) => q.no);
  }

  const weakPicked = pickFromPool(weakPool, weakCount);
  const thisWeekPicked = pickFromPool(thisWeekPool, thisWeekCount);
  const reviewPicked = pickFromPool(reviewPool, reviewCount);
  const challengePicked = pickFromPool(challengePool, challengeCount);

  // 부족분 보충
  const totalPicked =
    weakPicked.length + thisWeekPicked.length + reviewPicked.length + challengePicked.length;
  let fillPicked: number[] = [];
  if (totalPicked < questionCount) {
    const deficit = questionCount - totalPicked;
    const remaining = pool.filter((q) => !selectedNos.has(q.no));
    fillPicked = pickFromPool(remaining, deficit);
  }

  const allNos = shuffle([
    ...weakPicked,
    ...thisWeekPicked,
    ...reviewPicked,
    ...challengePicked,
    ...fillPicked,
  ]);

  return {
    date: today,
    subject,
    label: `${subjectConfig.label} 일일 미션`,
    questionNos: allNos,
    breakdown: {
      weak: weakPicked.length,
      thisWeek: thisWeekPicked.length,
      review: reviewPicked.length,
      challenge: challengePicked.length + fillPicked.length,
    },
    estimatedMinutes: Math.round(allNos.length * 1.5),
    generatedAt: new Date().toISOString(),
  };
}
