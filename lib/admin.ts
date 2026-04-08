/**
 * 관리자 권한 확인 유틸리티
 *
 * 환경변수 ADMIN_USER_IDS에 쉼표 구분으로 관리자 Supabase user_id를 설정:
 * ADMIN_USER_IDS=uuid1,uuid2
 */

const ADMIN_IDS: Set<string> = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);

/** 주어진 userId가 관리자인지 확인 */
export function isAdmin(userId: string): boolean {
  return ADMIN_IDS.has(userId);
}
