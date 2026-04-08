/**
 * API 공용 인증/인가 모듈
 *
 * - getServiceSupabase(): 싱글톤 service_role 클라이언트
 * - authenticateUser(): Bearer 토큰 → 사용자 인증
 * - checkPremium(): premium 상태 확인 (만료일 포함)
 */

import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

// --- 싱글톤 service_role 클라이언트 (C2 해결) ---

let _serviceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수 미설정");

  _serviceClient = createClient(url, key);
  return _serviceClient;
}

// --- 인증 ---

export async function authenticateUser(
  request: NextRequest
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = getServiceSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return { userId: user.id };
}

// --- Premium 확인 ---

export async function checkPremium(userId: string): Promise<boolean> {
  // 관리자는 항상 premium
  if (isAdmin(userId)) return true;

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("user_profiles")
    .select("is_premium, premium_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.is_premium) return false;
  if (
    data.premium_expires_at &&
    new Date(data.premium_expires_at) < new Date()
  )
    return false;
  return true;
}
