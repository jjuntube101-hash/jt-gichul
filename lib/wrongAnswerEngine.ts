/**
 * 오답 분석 엔진 (서버사이드)
 * - AI 호출 없이 question JSON의 analysis 데이터 기반 진단
 * - solve_records에서 반복 패턴 감지
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Question, ChunkMeta, ChoiceAnalysis } from '@/types/question';

// --- 타입 정의 ---

export interface WrongAnswerInput {
  questionNo: number;
  selectedChoice: number;
  userId: string;
}

export interface WrongAnswerDiagnosis {
  trapType: string;
  trapDescription: string;
  correctAnswer: number;
  correctExplanation: string;
  wrongExplanation: string;
  lawRef: string;
  patternAlert: string | null;
  studyTip: string;
  generatedAt: string;
}

// --- 서버사이드 문항 로드 ---

function getQuestionServer(no: number): Question | null {
  const metaPath = path.join(process.cwd(), 'public/data/questions/meta.json');
  const meta: ChunkMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  const chunk = meta.chunks.find(c => no >= c.start_no && no <= c.end_no);
  if (!chunk) return null;

  const chunkPath = path.join(process.cwd(), `public/data/questions/${chunk.file}`);
  const questions: Question[] = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
  return questions.find(q => q.no === no) ?? null;
}

// --- Supabase 서비스 클라이언트 ---

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Supabase 환경변수 미설정');
  }
  return createClient(url, key);
}

// --- 반복 패턴 감지 ---

async function countTrapTypeThisMonth(
  userId: string,
  trapType: string
): Promise<number> {
  try {
    const supabase = getServiceSupabase();

    // 이번 달 1일 (KST)
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const monthStart = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-01`;

    // 이번 달 오답 기록에서 question_no 목록 조회
    const { data: wrongRecords, error } = await supabase
      .from('solve_records')
      .select('question_no')
      .eq('user_id', userId)
      .eq('is_correct', false)
      .gte('created_at', monthStart);

    if (error || !wrongRecords || wrongRecords.length === 0) return 0;

    // 각 오답 문항의 선택지 trap_type 확인
    let count = 0;
    const checkedNos = new Set<number>();

    for (const record of wrongRecords) {
      if (checkedNos.has(record.question_no)) continue;
      checkedNos.add(record.question_no);

      const q = getQuestionServer(record.question_no);
      if (!q || !q.analysis?.choices_analysis) continue;

      const hasTrap = q.analysis.choices_analysis.some(
        ca => ca.trap_type === trapType
      );
      if (hasTrap) count++;
    }

    return count;
  } catch {
    return 0;
  }
}

// --- 함정 유형별 학습 팁 ---

const TRAP_STUDY_TIPS: Record<string, string> = {
  '반대진술': "조문 원문의 '~할 수 있다/없다', '~하여야 한다/아니한다' 표현에 집중. 선지와 원문을 한 글자씩 대조.",
  '숫자변형': '세율, 금액, 기간 등 숫자는 반드시 조문 원문과 대조. 비슷한 숫자끼리 혼동하기 쉬움.',
  '범위확대': "적용 범위를 확대하거나 축소하는 선지에 주의. '모든', '항상', '반드시' 같은 절대 표현 체크.",
  '예외무시': "원칙과 예외를 구분. '다만', '단서', '제외' 등의 예외 규정을 놓치지 않도록 주의.",
  '요건누락': '적용 요건을 하나씩 체크리스트로 확인. 요건 중 하나라도 빠지면 틀린 선지.',
  '개념혼동': '유사 개념 간 차이점을 명확히 정리. 비교표로 정리하면 효과적.',
  '시점오류': '적용 시기, 신고 기한, 납부 기한 등 시점 관련 내용은 캘린더에 표시하며 학습.',
  '조건추가': '원문에 없는 조건이 추가되었는지 확인. 선지가 원문보다 좁거나 넓은 조건을 달고 있는지 체크.',
};

const DEFAULT_STUDY_TIP = '선지의 각 표현을 조문 원문과 한 글자씩 대조. 미세한 변형을 찾아내는 연습 필요.';

// --- 메인 진단 함수 ---

export async function diagnoseWrongAnswer(
  input: WrongAnswerInput
): Promise<WrongAnswerDiagnosis> {
  const { questionNo, selectedChoice, userId } = input;

  // 1. 문항 데이터 로드
  let question: Question | null;
  try {
    question = getQuestionServer(questionNo);
  } catch (err) {
    throw new Error(`문항 데이터 로드 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!question) {
    throw new Error(`문항 ${questionNo}을 찾을 수 없습니다.`);
  }

  const analysis = question.analysis;
  if (!analysis || !analysis.choices_analysis || analysis.choices_analysis.length === 0) {
    throw new Error(`문항 ${questionNo}에 분석 데이터가 없습니다.`);
  }
  const correctAnswerNum = Array.isArray(question.정답)
    ? question.정답[0]
    : question.정답;

  // 2. 선택한 오답 선지 분석
  const wrongChoice: ChoiceAnalysis | undefined = analysis.choices_analysis.find(
    ca => ca.choice_num === selectedChoice
  );

  // 3. 정답 선지 분석
  const correctChoice: ChoiceAnalysis | undefined = analysis.choices_analysis.find(
    ca => ca.choice_num === correctAnswerNum
  );

  // 4. 함정 유형 결정
  const trapType = wrongChoice?.trap_type
    ?? (analysis.trap_patterns.length > 0 ? analysis.trap_patterns[0] : '기타');

  // 5. 함정 설명 조립
  const trapDescription = wrongChoice?.distortion
    ?? wrongChoice?.analysis
    ?? '선지가 원문과 다르게 변형됨.';

  // 6. 반복 패턴 감지
  let patternAlert: string | null = null;
  if (trapType !== '기타') {
    const monthCount = await countTrapTypeThisMonth(userId, trapType);
    if (monthCount >= 2) {
      patternAlert = `이 함정유형(${trapType}) 이번 달 ${monthCount}번째.`;
    }
  }

  // 7. 학습 팁
  const studyTip = TRAP_STUDY_TIPS[trapType] ?? DEFAULT_STUDY_TIP;

  // 8. 근거 법령
  const lawRef = wrongChoice?.law_ref ?? correctChoice?.law_ref ?? question.근거법령 ?? '';

  return {
    trapType,
    trapDescription,
    correctAnswer: correctAnswerNum,
    correctExplanation: correctChoice?.analysis ?? '정답 선지 분석 정보 없음.',
    wrongExplanation: wrongChoice?.analysis ?? '오답 선지 분석 정보 없음.',
    lawRef,
    patternAlert,
    studyTip,
    generatedAt: new Date().toISOString(),
  };
}
