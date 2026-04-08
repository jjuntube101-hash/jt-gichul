/**
 * 학습 데이터 리셋 API
 * POST /api/reset
 *
 * scope: "solve" → solve_records + ox_records만 삭제
 * scope: "all"   → 위 + user_badges + spaced_repetition_cards + daily_study_logs + ai_usage 삭제
 *                   + user_profiles 스트릭 필드 리셋
 *
 * - 인증 필수 (Bearer token)
 * - 1일 1회 제한 (간이 레이트 리밋)
 * - service_role 키로 삭제 (RLS DELETE 정책 없으므로)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetSchema } from "@/lib/apiSchemas";
import { authenticateUser, getServiceSupabase } from "@/lib/apiAuth";

// --- 간이 레이트 리밋 (메모리 기반, 서버리스 환경에서는 인스턴스별) ---

const resetLog = new Map<string, number>(); // userId → lastResetTimestamp

function checkResetRateLimit(userId: string): boolean {
  const last = resetLog.get(userId);
  if (!last) return true;
  const oneDay = 24 * 60 * 60 * 1000;
  return Date.now() - last > oneDay;
}

// --- POST Handler ---

export async function POST(request: NextRequest) {
  try {
    // 1) 인증
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 2) 레이트 리밋
    if (!checkResetRateLimit(auth.userId)) {
      return NextResponse.json(
        { error: "초기화는 하루에 1번만 가능합니다." },
        { status: 429 }
      );
    }

    // 3) 바디 파싱 + 검증
    const rawBody = await request.json();
    const { scope } = resetSchema.parse(rawBody);

    const supabase = getServiceSupabase();
    const deleted: Record<string, number> = {};

    // 4) solve_records 삭제
    const { data: solveData } = await supabase
      .from("solve_records")
      .delete()
      .eq("user_id", auth.userId)
      .select("id");
    deleted.solve_records = solveData?.length ?? 0;

    // 5) ox_records 삭제
    const { data: oxData } = await supabase
      .from("ox_records")
      .delete()
      .eq("user_id", auth.userId)
      .select("id");
    deleted.ox_records = oxData?.length ?? 0;

    // 6) scope=all → 추가 테이블 삭제 + 프로필 리셋
    if (scope === "all") {
      // user_badges
      const { data: badgeData } = await supabase
        .from("user_badges")
        .delete()
        .eq("user_id", auth.userId)
        .select("id");
      deleted.user_badges = badgeData?.length ?? 0;

      // spaced_repetition_cards
      const { data: srcData } = await supabase
        .from("spaced_repetition_cards")
        .delete()
        .eq("user_id", auth.userId)
        .select("id");
      deleted.spaced_repetition_cards = srcData?.length ?? 0;

      // daily_study_logs
      const { data: dslData } = await supabase
        .from("daily_study_logs")
        .delete()
        .eq("user_id", auth.userId)
        .select("id");
      deleted.daily_study_logs = dslData?.length ?? 0;

      // ai_usage
      const { data: aiData } = await supabase
        .from("ai_usage")
        .delete()
        .eq("user_id", auth.userId)
        .select("id");
      deleted.ai_usage = aiData?.length ?? 0;

      // user_profiles 스트릭 필드 리셋
      await supabase
        .from("user_profiles")
        .update({
          current_streak: 0,
          longest_streak: 0,
          last_study_date: null,
          total_solved: 0,
        })
        .eq("user_id", auth.userId);
      deleted.profile_reset = 1;
    }

    // 7) 레이트 리밋 기록
    resetLog.set(auth.userId, Date.now());

    console.log(
      `[RESET] user=${auth.userId} scope=${scope} deleted=${JSON.stringify(deleted)}`
    );

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청입니다.", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[RESET] Error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
