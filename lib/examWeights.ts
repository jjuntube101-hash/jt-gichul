/**
 * 과목별 시험 비중 설정
 * 합격 예측, 학습 시간 배분에 사용
 * 2027년 개편 반영: 한국사 폐지, 각 과목 25문항
 */

import type { SubjectType } from '@/types/question';

/** 시험 과목별 배점 비중 (합계 1.0) */
export const EXAM_WEIGHTS: Record<'9급' | '7급', Partial<Record<SubjectType, number>>> = {
  '9급': {
    korean: 0.25,
    english: 0.25,
    tax: 0.25,
    accounting: 0.25,
  },
  '7급': {
    // 2차 전문과목 4과목 (1차 PSAT은 별도)
    constitution: 0.25,
    economics: 0.25,
    tax: 0.25,
    accounting: 0.25,
  },
};

/** 학습 시간 배분 비율 (기본) */
export const STUDY_TIME_RATIO: Record<'9급' | '7급', Partial<Record<SubjectType, number>>> = {
  '9급': {
    korean: 0.20,
    english: 0.20,
    tax: 0.35,
    accounting: 0.25,
  },
  '7급': {
    constitution: 0.15,
    economics: 0.20,
    tax: 0.35,
    accounting: 0.30,
  },
};

/** D-90 이후 전문과목 집중 비율 */
export const STUDY_TIME_RATIO_FINAL: Record<'9급' | '7급', Partial<Record<SubjectType, number>>> = {
  '9급': {
    korean: 0.15,
    english: 0.15,
    tax: 0.40,
    accounting: 0.30,
  },
  '7급': {
    constitution: 0.12,
    economics: 0.18,
    tax: 0.40,
    accounting: 0.30,
  },
};

/** 시험일까지 남은 일수 기준으로 학습 시간 비율 반환 */
export function getStudyTimeRatio(
  examTarget: '9급' | '7급',
  daysUntilExam: number | null,
): Partial<Record<SubjectType, number>> {
  if (daysUntilExam !== null && daysUntilExam <= 90) {
    return STUDY_TIME_RATIO_FINAL[examTarget];
  }
  return STUDY_TIME_RATIO[examTarget];
}
