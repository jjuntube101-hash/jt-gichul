/**
 * 문항 데이터 로딩 유틸리티
 * - 청크 기반 lazy loading
 * - IndexedDB 캐시 (localStorage 5MB 제한 우회)
 * - 멀티 과목 지원 (세법 + 회계)
 */

import type { Question, ChunkMeta, ExamIndex, SubjectType } from '@/types/question';
import { cacheGet, cacheSet, cleanupLocalStorage } from './cache';

const BASE = '/data/questions';
const INDEX_PATH = '/data/exam_index.json';
const INDEX_ACCOUNTING_PATH = '/data/exam_index_accounting.json';

let metaCache: ChunkMeta | null = null;
let indexCache: ExamIndex | null = null;
let indexAccountingCache: ExamIndex | null = null;

// 과목별 전체 문항 캐시
let allTaxQuestionsCache: Question[] | null = null;
let allTaxQuestionsPromise: Promise<Question[]> | null = null;
let allAccountingQuestionsCache: Question[] | null = null;
let allAccountingQuestionsPromise: Promise<Question[]> | null = null;
let allQuestionsCache: Question[] | null = null;
let allQuestionsPromise: Promise<Question[]> | null = null;

/** 청크 메타 로드 */
export async function loadMeta(): Promise<ChunkMeta> {
  if (metaCache) return metaCache;
  const res = await fetch(`${BASE}/meta.json`);
  metaCache = await res.json();
  return metaCache!;
}

/** exam_index.json 로드 (세법) */
export async function loadExamIndex(): Promise<ExamIndex> {
  if (indexCache) return indexCache;
  const res = await fetch(INDEX_PATH);
  indexCache = await res.json();
  return indexCache!;
}

/** exam_index_accounting.json 로드 (회계) */
export async function loadExamIndexAccounting(): Promise<ExamIndex> {
  if (indexAccountingCache) return indexAccountingCache;
  const res = await fetch(INDEX_ACCOUNTING_PATH);
  indexAccountingCache = await res.json();
  return indexAccountingCache!;
}

/** 과목별 exam_index 로드 */
export async function loadExamIndexBySubject(subject: SubjectType): Promise<ExamIndex> {
  return subject === 'accounting' ? loadExamIndexAccounting() : loadExamIndex();
}

/** 특정 청크 로드 (IndexedDB 캐시) */
async function loadChunk(chunkFile: string): Promise<Question[]> {
  const cacheKey = `chunk_${chunkFile}`;

  // IndexedDB 캐시 확인
  const cached = await cacheGet<Question[]>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE}/${chunkFile}`);
  const data: Question[] = await res.json();

  // IndexedDB 캐시 저장 (비동기, 실패해도 무시)
  cacheSet(cacheKey, data);

  return data;
}

// 앱 시작 시 기존 localStorage 청크 캐시 정리 (1회)
if (typeof window !== "undefined") {
  cleanupLocalStorage();
}

/** 문항 번호로 해당 청크 찾기 */
export async function loadQuestionByNo(no: number): Promise<Question | null> {
  const meta = await loadMeta();
  const chunk = meta.chunks.find(c => no >= c.start_no && no <= c.end_no);
  if (!chunk) return null;

  const questions = await loadChunk(chunk.file);
  return questions.find(q => q.no === no) ?? null;
}

/** 대분류(법명)로 문항 필터 — 여러 청크에서 수집 */
export async function loadQuestionsByLaw(law: string, subject?: SubjectType): Promise<Question[]> {
  const meta = await loadMeta();
  const all: Question[] = [];
  const targetChunks = subject
    ? meta.chunks.filter(c => subject === 'accounting' ? c.subject === 'accounting' : c.subject !== 'accounting')
    : meta.chunks;

  for (const chunk of targetChunks) {
    const questions = await loadChunk(chunk.file);
    const filtered = questions.filter(q => q.대분류 === law);
    all.push(...filtered);
  }

  return all;
}

/** 대분류 + 중분류로 문항 필터 */
export async function loadQuestionsByTopic(law: string, topic: string, subject?: SubjectType): Promise<Question[]> {
  const meta = await loadMeta();
  const all: Question[] = [];
  const targetChunks = subject
    ? meta.chunks.filter(c => subject === 'accounting' ? c.subject === 'accounting' : c.subject !== 'accounting')
    : meta.chunks;

  for (const chunk of targetChunks) {
    const questions = await loadChunk(chunk.file);
    const filtered = questions.filter(q => q.대분류 === law && q.중분류 === topic);
    all.push(...filtered);
  }

  return all;
}

/** 전체 문항 로드 (과목 무관, 메모리 캐시) */
export async function loadAllQuestions(): Promise<Question[]> {
  if (allQuestionsCache) return allQuestionsCache;
  if (allQuestionsPromise) return allQuestionsPromise;

  allQuestionsPromise = (async () => {
    const meta = await loadMeta();
    const all: Question[] = [];
    for (const chunk of meta.chunks) {
      const questions = await loadChunk(chunk.file);
      all.push(...questions);
    }
    allQuestionsCache = all;
    return all;
  })();

  return allQuestionsPromise;
}

/** 세법 문항만 로드 */
export async function loadAllTaxQuestions(): Promise<Question[]> {
  if (allTaxQuestionsCache) return allTaxQuestionsCache;
  if (allTaxQuestionsPromise) return allTaxQuestionsPromise;

  allTaxQuestionsPromise = (async () => {
    const meta = await loadMeta();
    const all: Question[] = [];
    for (const chunk of meta.chunks) {
      if (chunk.subject === 'accounting') continue;
      const questions = await loadChunk(chunk.file);
      all.push(...questions);
    }
    allTaxQuestionsCache = all;
    return all;
  })();

  return allTaxQuestionsPromise;
}

/** 회계 문항만 로드 */
export async function loadAllAccountingQuestions(): Promise<Question[]> {
  if (allAccountingQuestionsCache) return allAccountingQuestionsCache;
  if (allAccountingQuestionsPromise) return allAccountingQuestionsPromise;

  allAccountingQuestionsPromise = (async () => {
    const meta = await loadMeta();
    const all: Question[] = [];
    for (const chunk of meta.chunks) {
      if (chunk.subject !== 'accounting') continue;
      const questions = await loadChunk(chunk.file);
      all.push(...questions);
    }
    allAccountingQuestionsCache = all;
    return all;
  })();

  return allAccountingQuestionsPromise;
}

/** 과목별 전체 문항 로드 */
export async function loadQuestionsBySubject(subject: SubjectType): Promise<Question[]> {
  return subject === 'accounting' ? loadAllAccountingQuestions() : loadAllTaxQuestions();
}

/** 랜덤 N문항 추출 */
export async function loadRandomQuestions(count: number, subject?: SubjectType): Promise<Question[]> {
  const source = subject ? await loadQuestionsBySubject(subject) : await loadAllQuestions();
  const all = [...source];

  // Fisher-Yates 셔플 후 앞에서 count개
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.slice(0, count);
}
