/**
 * AI 모의고사 문항 배합 엔진 (서버사이드)
 *
 * 유저 풀이 기록 + 약점을 분석하여 맞춤 문항을 배합한다.
 * 배합 비율: 약점 40% / 미풀이 30% / 검증 20% / 도전 10%
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Question, ChunkMeta } from '@/types/question';

// --- 인터페이스 ---

export interface MockExamConfig {
  userId: string;
  examTarget: '9급' | '7급';
  questionCount: number; // 기본 20문항
}

export interface MockExamResult {
  title: string;           // "맞춤 모의고사 #3"
  questionNos: number[];   // 배합된 문항 번호들
  composition: {
    weak: number;          // 약점 문항 수
    unseen: number;        // 미풀이 문항 수
    verify: number;        // 검증 문항 수
    challenge: number;     // 도전 문항 수
  };
  focusAreas: string[];    // 주요 출제 영역
  estimatedTime: number;   // 예상 소요 시간 (분)
  generatedAt: string;
}

// --- 서버사이드 유틸 ---

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

/** Fisher-Yates 셔플 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 랜덤으로 n개 선택 */
function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

// --- 메인 엔진 ---

interface SolveRecord {
  question_no: number;
  is_correct: boolean;
}

export async function generateMockExam(
  config: MockExamConfig
): Promise<MockExamResult> {
  const { userId, examTarget, questionCount } = config;
  const supabase = getServiceSupabase();

  // 1. 유저 풀이 기록 전체 조회
  const { data: records, error } = await supabase
    .from('solve_records')
    .select('question_no, is_correct')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`풀이 기록 조회 실패: ${error.message}`);
  }

  const solveRecords: SolveRecord[] = records ?? [];

  // 2. 전체 문항 로드 + 직급 필터 (세법 문항만 — 회계는 no >= 2001)
  const allQuestions = loadAllQuestionsServer();
  const pool = allQuestions.filter((q) => q.no < 2001 && q.직급 === examTarget);

  // 3. 풀이 기록 분석
  const solvedMap = new Map<number, { total: number; correct: number }>();
  for (const r of solveRecords) {
    const prev = solvedMap.get(r.question_no) ?? { total: 0, correct: 0 };
    prev.total += 1;
    if (r.is_correct) prev.correct += 1;
    solvedMap.set(r.question_no, prev);
  }

  // 틀린 문항의 소분류 토픽 수집 (약점 토픽)
  const wrongTopics = new Map<string, number>(); // 소분류 → 틀린 횟수
  for (const [qNo, stats] of solvedMap) {
    const wrongCount = stats.total - stats.correct;
    if (wrongCount > 0) {
      const q = pool.find((p) => p.no === qNo);
      if (q) {
        const key = q.소분류;
        wrongTopics.set(key, (wrongTopics.get(key) ?? 0) + wrongCount);
      }
    }
  }

  // 4. 문항 분류
  const solvedNos = new Set(solvedMap.keys());

  // weak: 틀린 문항의 같은 소분류 토픽에서 선택 (본인이 틀린 문항 자체 + 같은 토픽 미풀이)
  const weakTopicSet = new Set(wrongTopics.keys());
  const weakPool = pool.filter(
    (q) => weakTopicSet.has(q.소분류) && !(solvedMap.get(q.no)?.correct === solvedMap.get(q.no)?.total && (solvedMap.get(q.no)?.total ?? 0) > 1)
  );

  // unseen: 한 번도 안 푼 문항
  const unseenPool = pool.filter((q) => !solvedNos.has(q.no));

  // verify: 1회만 풀고 맞춘 문항
  const verifyPool = pool.filter((q) => {
    const stats = solvedMap.get(q.no);
    return stats && stats.total === 1 && stats.correct === 1;
  });

  // challenge: difficulty >= 4
  const challengePool = pool.filter((q) => q.analysis.difficulty >= 4);

  // 5. 비율에 맞게 배분
  const weakCount = Math.round(questionCount * 0.4);
  const unseenCount = Math.round(questionCount * 0.3);
  const verifyCount = Math.round(questionCount * 0.2);
  const challengeCount = questionCount - weakCount - unseenCount - verifyCount;

  const selectedNos = new Set<number>();

  function pickFromPool(source: Question[], target: number): number[] {
    const available = source.filter((q) => !selectedNos.has(q.no));
    const picked = pickRandom(available, target);
    for (const q of picked) selectedNos.add(q.no);
    return picked.map((q) => q.no);
  }

  const weakPicked = pickFromPool(weakPool, weakCount);
  const unseenPicked = pickFromPool(unseenPool, unseenCount);
  const verifyPicked = pickFromPool(verifyPool, verifyCount);
  const challengePicked = pickFromPool(challengePool, challengeCount);

  // 6. 부족분 보충 (전체 풀에서)
  const totalPicked = weakPicked.length + unseenPicked.length + verifyPicked.length + challengePicked.length;
  let fillPicked: number[] = [];
  if (totalPicked < questionCount) {
    const deficit = questionCount - totalPicked;
    const remaining = pool.filter((q) => !selectedNos.has(q.no));
    fillPicked = pickFromPool(remaining, deficit);
  }

  const allNos = [...weakPicked, ...unseenPicked, ...verifyPicked, ...challengePicked, ...fillPicked];

  // 7. 모의고사 번호 조회 (이전 생성 횟수)
  const { count } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'mock_exam');

  const examNumber = (count ?? 0) + 1;

  // 8. 주요 출제 영역 추출
  const areaCount = new Map<string, number>();
  for (const no of allNos) {
    const q = pool.find((p) => p.no === no);
    if (q) {
      const area = q.대분류;
      areaCount.set(area, (areaCount.get(area) ?? 0) + 1);
    }
  }
  const focusAreas = [...areaCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([area]) => area);

  // 9. 예상 소요 시간 (문항당 1.5분)
  const estimatedTime = Math.round(allNos.length * 1.5);

  return {
    title: `맞춤 모의고사 #${examNumber}`,
    questionNos: shuffle(allNos), // 출제 순서 셔플
    composition: {
      weak: weakPicked.length,
      unseen: unseenPicked.length,
      verify: verifyPicked.length,
      challenge: challengePicked.length + fillPicked.length,
    },
    focusAreas,
    estimatedTime,
    generatedAt: new Date().toISOString(),
  };
}
