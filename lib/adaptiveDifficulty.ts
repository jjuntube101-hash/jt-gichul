/**
 * 적응형 난이도 시스템 (Flow State)
 * 최근 N문항 정답률을 추적하고 난이도를 자동 조절합니다.
 * - 정답률 >85%: 어려운 문항 비중 증가
 * - 정답률 <50%: 쉬운 문항 비중 증가
 * - 사용자에게 보이지 않음 — 딱 맞는 느낌
 */

export interface OXItemWithDifficulty {
  ox_text: string;
  answer: "O" | "X";
  law_ref: string;
  explanation?: string; // 선지 해설 (choices_analysis.analysis)
  questionNo: number;
  law: string;
  difficulty: number; // 1~5
  correctRate: number; // 0~100
}

const WINDOW_SIZE = 10;

/**
 * 적응형 셔플: 최근 정답률에 따라 난이도 편향된 순서 생성
 * - 전체를 3구간(easy/mid/hard)으로 분류
 * - 정답률에 따라 각 구간 비율 조절
 * - 구간 내에서는 랜덤 셔플
 */
export function adaptiveShuffle(
  items: OXItemWithDifficulty[],
  recentCorrect: boolean[] = []
): OXItemWithDifficulty[] {
  // 최근 정답률 계산
  const recent = recentCorrect.slice(-WINDOW_SIZE);
  const recentRate =
    recent.length > 0
      ? recent.filter(Boolean).length / recent.length
      : 0.5; // 데이터 없으면 중간

  // 난이도 구간 분류 (상호 배타적: hard → easy → mid 우선순위)
  const easy: OXItemWithDifficulty[] = [];
  const mid: OXItemWithDifficulty[] = [];
  const hard: OXItemWithDifficulty[] = [];

  for (const it of items) {
    if (it.difficulty >= 4 || it.correctRate < 40) {
      hard.push(it);
    } else if (it.difficulty <= 2 || it.correctRate >= 70) {
      easy.push(it);
    } else {
      mid.push(it);
    }
  }

  // 비율 결정 (총합 = 1)
  let easyRatio: number, midRatio: number, hardRatio: number;

  if (recentRate > 0.85) {
    // 잘하고 있음 → 어렵게
    easyRatio = 0.15;
    midRatio = 0.35;
    hardRatio = 0.5;
  } else if (recentRate < 0.5) {
    // 힘들어함 → 쉽게
    easyRatio = 0.5;
    midRatio = 0.35;
    hardRatio = 0.15;
  } else {
    // 적절함 → 균형
    easyRatio = 0.3;
    midRatio = 0.4;
    hardRatio = 0.3;
  }

  // 각 구간 셔플
  shuffle(easy);
  shuffle(mid);
  shuffle(hard);

  // 인터리빙: 비율에 따라 번갈아 뽑기
  const result: OXItemWithDifficulty[] = [];
  const pools = [
    { items: easy, ratio: easyRatio, idx: 0 },
    { items: mid, ratio: midRatio, idx: 0 },
    { items: hard, ratio: hardRatio, idx: 0 },
  ];

  const totalItems = items.length;
  let placed = 0;

  while (placed < totalItems) {
    for (const pool of pools) {
      // 이 배치에서 이 풀에서 뽑을 갯수
      const toTake = Math.max(1, Math.round(pool.ratio * 5)); // 5개 단위 배치
      for (let i = 0; i < toTake && placed < totalItems; i++) {
        if (pool.idx < pool.items.length) {
          result.push(pool.items[pool.idx]);
          pool.idx++;
          placed++;
        }
      }
    }

    // 모든 풀이 소진되면 남은 아이템 수집
    const allDrained = pools.every((p) => p.idx >= p.items.length);
    if (allDrained) break;
  }

  // 분류에서 누락된 아이템 추가 (mid 범위에 걸치지 않는 경우)
  const usedSet = new Set(result);
  for (const item of items) {
    if (!usedSet.has(item)) {
      result.push(item);
    }
  }

  return result;
}

/** Fisher-Yates 셔플 (in-place) */
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * 다음 문항 선택: 현재 위치 이후 아이템 중 난이도 적합한 것 선택
 * OX 드릴에서 실시간 적응에 사용 (향후 확장용)
 */
export function pickNextAdaptive(
  remaining: OXItemWithDifficulty[],
  recentCorrect: boolean[]
): OXItemWithDifficulty | null {
  if (remaining.length === 0) return null;

  const recent = recentCorrect.slice(-WINDOW_SIZE);
  const rate =
    recent.length > 0
      ? recent.filter(Boolean).length / recent.length
      : 0.5;

  // 적합한 난이도 범위 결정
  let targetDifficulty: number;
  if (rate > 0.85) targetDifficulty = 4;
  else if (rate > 0.7) targetDifficulty = 3;
  else if (rate > 0.5) targetDifficulty = 2;
  else targetDifficulty = 1;

  // 목표 난이도에 가장 가까운 문항 찾기 (약간의 랜덤성 추가)
  const scored = remaining.map((item) => ({
    item,
    distance: Math.abs(item.difficulty - targetDifficulty) + Math.random() * 0.5,
  }));
  scored.sort((a, b) => a.distance - b.distance);

  return scored[0].item;
}
