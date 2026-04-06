/**
 * exam_questions_v3.json의 정확한 TypeScript 인터페이스
 * 원본 데이터 구조를 1:1 매핑. 필드 추가/변형 금지.
 */

export interface ChoiceAnalysis {
  choice_num: number;
  verdict: 'O' | 'X';
  law_ref: string;
  analysis: string;
  trap_type: string | null;
  distortion: string | null;
}

export interface OXItem {
  ox_text: string;
  answer: 'O' | 'X';
  law_ref: string;
}

export interface StudyGuide {
  what_examiner_tests: string;
  how_to_study: string;
  common_mistakes: string;
  study_priority: '상' | '중' | '하';
  revision_tag: string;
}

export interface Analysis {
  question_type: string;
  question_subtype: string;
  difficulty: number;
  estimated_correct_rate: number;
  choices_analysis: ChoiceAnalysis[];
  intent: string;
  discrimination_point: string;
  trap_patterns: string[];
  keywords: string[];
  related_questions: number[];
  struct_note_section: string;
  ox_convertible: boolean;
  ox_items: OXItem[];
  study_guide: StudyGuide;
  analysis_basis: string;
}

export type SubjectType = 'tax' | 'accounting';

export interface Question {
  no: number;
  tax_type: '국세' | '지방세' | '회계';
  subject?: string;
  시험_구분: string;
  직급: string;
  과목명: string;
  시행년도: number;
  문제번호: number;
  문제_내용: string;
  보기: string;
  선택지: string[];
  정답: number | number[];
  대분류: string;
  중분류: string;
  소분류: string;
  근거법령: string;
  analysis: Analysis;
}

/** 문항 번호로 과목 판별 */
export function getSubjectByNo(no: number): SubjectType {
  return no >= 2001 ? 'accounting' : 'tax';
}

/** 문항의 tax_type으로 과목 판별 */
export function getSubjectByQuestion(q: Question): SubjectType {
  return q.tax_type === '회계' ? 'accounting' : 'tax';
}

/** 청크 메타 정보 (public/data/questions/meta.json) */
export interface ChunkMeta {
  _meta: {
    version: string;
    generated: string;
    total_questions: number;
    chunked: boolean;
    chunk_size: number;
    chunk_count: number;
    chunked_at: string;
    accounting?: {
      total_questions: number;
      no_range: [number, number];
      chunk_count: number;
      chunk_size: number;
      generated: string;
    };
  };
  chunks: {
    file: string;
    start_no: number;
    end_no: number;
    count: number;
    subject?: 'accounting';
  }[];
}

/** 함정 유형 8종 */
export type TrapType =
  | '반대진술'
  | '숫자변형'
  | '범위확대'
  | '예외무시'
  | '요건누락'
  | '개념혼동'
  | '시점오류'
  | '조건추가';

/** exam_index.json 소분류 항목 */
export interface TopicEntry {
  card_path: string;
  total: number;
  recent_5y: number;
  grade: string;
  grade_recent: string;
  by_exam: Record<string, number>;
}

/** exam_index.json 전체 구조 */
export interface ExamIndex {
  version: string;
  generated: string;
  total_questions: number;
  national_count?: number;
  local_count?: number;
  exam_types?: Record<string, number>;
  categories: {
    [taxType: string]: {
      [law: string]: {
        [topic: string]: TopicEntry;
      };
    };
  };
}
