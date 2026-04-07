/**
 * 비로그인 풀이 기록 버퍼
 *
 * 비로그인 상태에서 풀이한 기록을 localStorage에 저장하고,
 * 로그인 시 Supabase solve_records / ox_records로 마이그레이션합니다.
 */

const ANON_SOLVE_KEY = "jt_anon_solves";
const ANON_OX_KEY = "jt_anon_ox";

export interface AnonSolveRecord {
  questionNo: number;
  isCorrect: boolean;
  selectedChoice: number;
  timeSpentMs: number;
  mode: "practice" | "ox" | "timer";
  createdAt: string; // ISO string
}

export interface AnonOXRecord {
  questionNo: number;
  oxIndex: number;
  isCorrect: boolean;
  createdAt: string;
}

/** 비로그인 풀이 기록 저장 */
export function bufferAnonSolve(record: Omit<AnonSolveRecord, "createdAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAnonSolves();
    existing.push({ ...record, createdAt: new Date().toISOString() });
    localStorage.setItem(ANON_SOLVE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage full or unavailable
  }
}

/** 비로그인 OX 기록 저장 */
export function bufferAnonOX(record: Omit<AnonOXRecord, "createdAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAnonOX();
    existing.push({ ...record, createdAt: new Date().toISOString() });
    localStorage.setItem(ANON_OX_KEY, JSON.stringify(existing));
  } catch {
    // localStorage full or unavailable
  }
}

/** 버퍼된 비로그인 풀이 기록 로드 */
export function loadAnonSolves(): AnonSolveRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANON_SOLVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 버퍼된 비로그인 OX 기록 로드 */
export function loadAnonOX(): AnonOXRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANON_OX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 마이그레이션 완료 후 버퍼 비우기 */
export function clearAnonBuffer(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_SOLVE_KEY);
    localStorage.removeItem(ANON_OX_KEY);
  } catch {
    // ignore
  }
}

/** 비로그인 버퍼에 기록이 있는지 확인 */
export function hasAnonRecords(): boolean {
  return loadAnonSolves().length > 0 || loadAnonOX().length > 0;
}
