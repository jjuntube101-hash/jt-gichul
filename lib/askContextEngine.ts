/**
 * AI 세무 상담 — 이중 컨텍스트 엔진 (서버사이드)
 *
 * 1. law.go.kr API로 실시간 법령 조문 검색
 * 2. 기출 문항 DB에서 관련 문항 검색
 * → 두 결과를 Claude 컨텍스트로 주입하여 근거 기반 답변 생성
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { searchLawContext, type LawContext } from './lawApi';
import type { Question, ChunkMeta } from '@/types/question';

// --- 기출 문항 검색 ---

interface QuestionContext {
  no: number;
  law: string;       // 대분류
  topic: string;     // 소분류
  text: string;      // 문제 본문 (축약)
  keyPoint: string;  // 핵심 포인트
}

/** 서버사이드에서 전체 문항 로드 (비동기 + 캐시) */
let cachedQuestions: Question[] | null = null;
let loadingPromise: Promise<Question[]> | null = null;

async function loadAllQuestionsAsync(): Promise<Question[]> {
  if (cachedQuestions) return cachedQuestions;
  // 동시 호출 시 중복 로딩 방지
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const metaPath = path.join(process.cwd(), 'public/data/questions/meta.json');
    const metaRaw = await fs.readFile(metaPath, 'utf-8');
    const meta: ChunkMeta = JSON.parse(metaRaw);
    const chunkPromises = meta.chunks.map(async (chunk) => {
      const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
      const raw = await fs.readFile(chunkPath, 'utf-8');
      return JSON.parse(raw) as Question[];
    });
    const chunkResults = await Promise.all(chunkPromises);
    const all = chunkResults.flat();
    cachedQuestions = all;
    loadingPromise = null;
    return all;
  })();

  return loadingPromise;
}

/** 질문에서 관련 기출 문항 2~3개 검색 */
export async function findRelevantQuestions(question: string): Promise<QuestionContext[]> {
  const questions = await loadAllQuestionsAsync();
  const lowerQ = question.toLowerCase();

  // 키워드 추출
  const keywords = lowerQ
    .replace(/[?？\s]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 2);

  // 점수 기반 매칭
  const scored = questions
    .map((q) => {
      let score = 0;
      const qText = `${q.대분류} ${q.소분류} ${q.문제_내용}`.toLowerCase();

      for (const kw of keywords) {
        if (qText.includes(kw)) score += 2;
        if (q.대분류.includes(kw)) score += 3; // 법명 매칭 가산
        if (q.소분류.includes(kw)) score += 3; // 토픽 매칭 가산
      }

      return { q, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map(({ q }) => ({
    no: q.no,
    law: q.대분류,
    topic: q.소분류,
    text: q.문제_내용.slice(0, 150),
    keyPoint: q.analysis.choices_analysis?.[0]?.analysis?.slice(0, 100) || '',
  }));
}

// --- 통합 컨텍스트 빌더 ---

export interface AskContext {
  lawContexts: LawContext[];
  questionContexts: QuestionContext[];
}

/**
 * 질문에 대한 이중 컨텍스트 수집.
 * law.go.kr API 실패 시에도 기출 컨텍스트는 반환.
 */
export async function gatherContext(question: string): Promise<AskContext> {
  // 병렬 실행: 법령 API + 기출 검색
  const [lawContexts, questionContexts] = await Promise.all([
    searchLawContext(question).catch(() => [] as LawContext[]),
    findRelevantQuestions(question).catch(() => [] as QuestionContext[]),
  ]);

  return { lawContexts, questionContexts };
}

/** 컨텍스트를 프롬프트 텍스트로 포맷 */
export function formatContextForPrompt(ctx: AskContext): string {
  const parts: string[] = [];

  // 법령 조문
  if (ctx.lawContexts.length > 0) {
    parts.push('## 참조 법령 조문');
    for (const law of ctx.lawContexts) {
      parts.push(`\n### ${law.lawName}`);
      for (const article of law.articles) {
        parts.push(`**${article.articleNum}${article.title ? ` (${article.title})` : ''}**`);
        parts.push(article.content);
      }
    }
  }

  // 관련 기출
  if (ctx.questionContexts.length > 0) {
    parts.push('\n## 관련 기출 문항');
    for (const q of ctx.questionContexts) {
      parts.push(`- [${q.law} > ${q.topic}] ${q.text}`);
      if (q.keyPoint) parts.push(`  → ${q.keyPoint}`);
    }
  }

  return parts.join('\n');
}
