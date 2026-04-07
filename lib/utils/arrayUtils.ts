/**
 * 배열 유틸리티
 * 여러 모듈에서 중복 사용되던 shuffle, pickRandom을 통합
 */

/** Fisher-Yates 셔플 (원본 변경 없음) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 랜덤으로 n개 선택 */
export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
