export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  condition: string; // 유저 표시용
}

/** 10종 뱃지 정의 */
export const BADGES: BadgeDef[] = [
  { id: "first_solve", name: "첫 발걸음", description: "첫 문항 풀기 완료", icon: "🎯", condition: "1문항 풀기" },
  { id: "solve_10", name: "워밍업", description: "10문항 풀기 달성", icon: "💪", condition: "10문항 풀기" },
  { id: "solve_50", name: "열공러", description: "50문항 풀기 달성", icon: "📚", condition: "50문항 풀기" },
  { id: "solve_100", name: "백문불여", description: "100문항 풀기 달성", icon: "🏆", condition: "100문항 풀기" },
  { id: "solve_500", name: "세법마스터", description: "500문항 풀기 달성", icon: "👑", condition: "500문항 풀기" },
  { id: "streak_3", name: "3일 연속", description: "3일 연속 학습", icon: "🔥", condition: "3일 스트릭" },
  { id: "streak_7", name: "일주일 연속", description: "7일 연속 학습", icon: "⚡", condition: "7일 스트릭" },
  { id: "streak_30", name: "한 달 연속", description: "30일 연속 학습", icon: "🌟", condition: "30일 스트릭" },
  { id: "ox_100", name: "OX 백전백승", description: "OX 100문항 풀기", icon: "⭕", condition: "OX 100문항" },
  { id: "accuracy_80", name: "정밀사격", description: "정답률 80% 이상 (50문항+)", icon: "🎯", condition: "정답률 80%+" },
];

/** 뱃지 ID로 정의 찾기 */
export function getBadgeDef(badgeId: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === badgeId);
}

export interface BadgeCheckInput {
  totalSolved: number;
  correctCount: number;
  oxTotal: number;
  currentStreak: number;
  maxStreak: number;
}

/** 달성 가능한 뱃지 목록 반환 */
export function checkEarnableBadges(
  input: BadgeCheckInput,
  alreadyEarned: Set<string>
): string[] {
  const earned: string[] = [];

  const checks: [string, boolean][] = [
    ["first_solve", input.totalSolved >= 1],
    ["solve_10", input.totalSolved >= 10],
    ["solve_50", input.totalSolved >= 50],
    ["solve_100", input.totalSolved >= 100],
    ["solve_500", input.totalSolved >= 500],
    ["streak_3", input.maxStreak >= 3],
    ["streak_7", input.maxStreak >= 7],
    ["streak_30", input.maxStreak >= 30],
    ["ox_100", input.oxTotal >= 100],
    [
      "accuracy_80",
      input.totalSolved >= 50 &&
        input.correctCount / input.totalSolved >= 0.8,
    ],
  ];

  for (const [id, met] of checks) {
    if (met && !alreadyEarned.has(id)) {
      earned.push(id);
    }
  }

  return earned;
}
