/**
 * 날짜 유틸리티 (KST 기반)
 * 여러 모듈에서 중복 사용되던 todayKST, addDaysKST를 통합
 */

/** 오늘 날짜 (KST) YYYY-MM-DD */
export function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 날짜에 일수를 더한 YYYY-MM-DD 반환 (KST 기준) */
export function addDaysKST(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
