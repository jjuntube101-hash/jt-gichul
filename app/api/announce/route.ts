/**
 * 강의 공지 API
 * GET  /api/announce        — 공지 목록 조회 (premium 사용자만)
 * POST /api/announce        — 공지 등록 (관리자만) + 푸시 발송
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { announceSchema } from "@/lib/apiSchemas";
import { isAdmin } from "@/lib/admin";
import { authenticateUser, checkPremium, getServiceSupabase } from "@/lib/apiAuth";

// --- GET ---

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const premium = await checkPremium(auth.userId);
    if (!premium && !isAdmin(auth.userId)) {
      return NextResponse.json({ error: "수강생 전용입니다." }, { status: 403 });
    }

    const supabase = getServiceSupabase();

    const { data: announcements, error } = await supabase
      .from("class_announcements")
      .select("id, title, body, link_url, link_label, is_pinned, created_at")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[ANNOUNCE] GET Error:", error);
      return NextResponse.json({ error: "공지를 불러올 수 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ announcements: announcements ?? [] });
  } catch (err) {
    console.error("[ANNOUNCE] GET Error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// --- POST (관리자 전용) ---

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (!isAdmin(auth.userId)) {
      return NextResponse.json({ error: "관리자만 공지를 등록할 수 있습니다." }, { status: 403 });
    }

    const rawBody = await request.json();
    const { title, body, linkUrl, linkLabel, isPinned } = announceSchema.parse(rawBody);

    const supabase = getServiceSupabase();

    const { data: announcement, error } = await supabase
      .from("class_announcements")
      .insert({
        title,
        body: body ?? null,
        link_url: linkUrl ?? null,
        link_label: linkLabel ?? null,
        is_pinned: isPinned,
        author_id: auth.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[ANNOUNCE] POST Error:", error);
      return NextResponse.json({ error: "공지 등록 실패" }, { status: 500 });
    }

    // TODO: premium 사용자에게 푸시 발송 (기존 push 인프라 활용)
    console.log(`[ANNOUNCE] 새 공지: "${title}" by admin ${auth.userId}`);

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[ANNOUNCE] POST Error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
