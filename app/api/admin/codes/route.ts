/**
 * 관리자 코드 관리 API
 * POST /api/admin/codes   — 코드 일괄 생성 (배치 중복 체크)
 * GET  /api/admin/codes   — 코드 목록 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminCodesSchema } from "@/lib/apiSchemas";
import { isAdmin } from "@/lib/admin";
import { authenticateUser, getServiceSupabase } from "@/lib/apiAuth";

/** JT-XXXX 형식 코드 생성 (4자리 영숫자 대문자) */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제거: I,O,0,1
  let code = "JT-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- POST: 코드 일괄 생성 (C3 해결: 배치 중복 체크) ---

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth || !isAdmin(auth.userId)) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const rawBody = await request.json();
    const { count, batchName, premiumDays, expiresAt } = adminCodesSchema.parse(rawBody);

    const supabase = getServiceSupabase();

    // 후보 코드를 넉넉히 생성 (2배)
    const candidateSet = new Set<string>();
    while (candidateSet.size < count * 2 && candidateSet.size < count + 500) {
      candidateSet.add(generateCode());
    }
    const candidates = [...candidateSet];

    // 한 번에 기존 코드와 대조 (N+1 제거)
    const { data: existing } = await supabase
      .from("enrollment_codes")
      .select("code")
      .in("code", candidates);

    const existingSet = new Set((existing ?? []).map((e) => e.code));
    const codes = candidates.filter((c) => !existingSet.has(c)).slice(0, count);

    if (codes.length < count) {
      return NextResponse.json(
        { error: `${codes.length}개만 생성됨 (코드 충돌). 다시 시도해주세요.` },
        { status: 500 }
      );
    }

    // 일괄 삽입
    const rows = codes.map((code) => ({
      code,
      batch_name: batchName || null,
      premium_days: premiumDays,
      expires_at: expiresAt ?? null,
      max_uses: 1,
      used_count: 0,
      is_active: true,
    }));

    const { error } = await supabase.from("enrollment_codes").insert(rows);

    if (error) {
      console.error("[ADMIN/CODES] Insert Error:", error);
      return NextResponse.json({ error: "코드 생성 실패" }, { status: 500 });
    }

    console.log(
      `[ADMIN/CODES] ${count}개 생성 batch="${batchName}" days=${premiumDays}`
    );

    return NextResponse.json({ codes, count: codes.length }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "잘못된 요청", details: err.issues }, { status: 400 });
    }
    console.error("[ADMIN/CODES] Error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// --- GET: 코드 목록 조회 ---

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth || !isAdmin(auth.userId)) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get("batch");

    let query = supabase
      .from("enrollment_codes")
      .select("code, batch_name, premium_days, expires_at, max_uses, used_count, used_by, is_active, created_at")
      .order("created_at", { ascending: false });

    if (batch) {
      query = query.eq("batch_name", batch);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      console.error("[ADMIN/CODES] GET Error:", error);
      return NextResponse.json({ error: "조회 실패" }, { status: 500 });
    }

    const total = data?.length ?? 0;
    const used = data?.filter((c) => c.used_count > 0).length ?? 0;

    return NextResponse.json({
      codes: data ?? [],
      summary: { total, used, available: total - used },
    });
  } catch (err) {
    console.error("[ADMIN/CODES] Error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
