/** 정답 비교 유틸리티 — 단일 정답(number)과 복수 정답(number[]) 모두 지원 */
export function isCorrectAnswer(selected: number, answer: number | number[]): boolean {
  if (Array.isArray(answer)) {
    return answer.includes(selected);
  }
  return selected === answer;
}

/** 정답 표시 문자열 */
export function formatAnswer(answer: number | number[]): string {
  if (Array.isArray(answer)) {
    return answer.join(",") + "번";
  }
  return `${answer}번`;
}
