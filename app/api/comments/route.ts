/**
 * 문제별 댓글 API
 * GET  /api/comments?no=123           — 문제별 댓글 조회 (최대 200개)
 * GET  /api/comments?no=123&count=1   — 댓글 수만 조회 (경량)
 * POST /api/comments                  — 댓글 작성
 * PATCH /api/comments                 — 댓글 삭제/핀 (본인 또는 관리자)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { commentSchema, commentPatchSchema } from "@/lib/apiSchemas";
import { isAdmin } from "@/lib/admin";
import { authenticateUser, checkPremium, getServiceSupabase } from "@/lib/apiAuth";

// --- GET ---

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const no = parseInt(searchParams.get("no") ?? "0");
    const countOnly = searchParams.get("count") === "1";

    if (!no || no < 1) {
      return NextResponse.json({ error: "문제 번호가 필요합니다." }, { status: 400 });
    }

    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const premium = await checkPremium(auth.userId);
    if (!premium && !isAdmin(auth.userId)) {
      return NextResponse.json({ error: "수강생 전용 기능입니다." }, { status: 403 });
    }

    const supabase = getServiceSupabase();

    // 댓글 수만 반환
    if (countOnly) {
      const { count } = await supabase
        .from("question_comments")
        .select("id", { count: "exact", head: true })
        .eq("question_no", no)
        .eq("is_deleted", false);
      return NextResponse.json({ count: count ?? 0 });
    }

    // 전체 댓글 반환 (최대 200개)
    const { data: comments, error } = await supabase
      .from("question_comments")
      .select("id, question_no, user_id, parent_id, body, is_official, is_pinned, is_deleted, created_at, updated_at")
      .eq("question_no", no)
      .eq("is_deleted", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("[COMMENTS] GET Error:", error);
      return NextResponse.json({ error: "댓글을 불러올 수 없습니다." }, { status: 500 });
    }

    // 사용자 이름 매핑 (user_id → display_name)
    const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
    const nameMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      for (const p of profiles ?? []) {
        nameMap[p.user_id] = p.display_name || "수강생";
      }
    }

    const enriched = (comments ?? []).map((c) => {
      const { user_id, ...rest } = c;
      return {
        ...rest,
        authorName: nameMap[user_id] || "수강생",
        isAdmin: isAdmin(user_id),
        isOwner: user_id === auth.userId,
      };
    });

    return NextResponse.json({ comments: enriched });
  } catch (err) {
    console.error("[COMMENTS] GET Error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// --- POST ---

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const premium = await checkPremium(auth.userId);
    if (!premium && !isAdmin(auth.userId)) {
      return NextResponse.json({ error: "수강생 전용 기능입니다." }, { status: 403 });
    }

    const rawBody = await request.json();
    const { questionNo, body, parentId } = commentSchema.parse(rawBody);

    const supabase = getServiceSupabase();

    // 대댓글 깊이 제한 (1단계만) + 같은 문제의 댓글인지 확인
    if (parentId) {
      const { data: parent } = await supabase
        .from("question_comments")
        .select("parent_id, question_no")
        .eq("id", parentId)
        .maybeSingle();

      if (!parent) {
        return NextResponse.json(
          { error: "부모 댓글을 찾을 수 없습니다." },
          { status: 400 }
        );
      }

      if (parent.question_no !== questionNo) {
        return NextResponse.json(
          { error: "잘못된 요청입니다." },
          { status: 400 }
        );
      }

      if (parent.parent_id) {
        return NextResponse.json(
          { error: "대댓글은 1단계까지만 가능합니다." },
          { status: 400 }
        );
      }
    }

    const { data: comment, error } = await supabase
      .from("question_comments")
      .insert({
        question_no: questionNo,
        user_id: auth.userId,
        parent_id: parentId ?? null,
        body,
        is_official: isAdmin(auth.userId),
      })
      .select("id, question_no, parent_id, body, is_official, is_pinned, created_at, updated_at")
      .single();

    if (error) {
      console.error("[COMMENTS] POST Error:", error);
      return NextResponse.json({ error: "댓글 작성 실패" }, { status: 500 });
    }

    return NextResponse.json({
      comment: { ...comment, isOwner: true, isAdmin: isAdmin(auth.userId) },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[COMMENTS] POST Error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// --- PATCH ---

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const premium = await checkPremium(auth.userId);
    if (!premium && !isAdmin(auth.userId)) {
      return NextResponse.json({ error: "수강생 전용 기능입니다." }, { status: 403 });
    }

    const rawBody = await request.json();
    const { commentId, action } = commentPatchSchema.parse(rawBody);

    const supabase = getServiceSupabase();

    // 댓글 조회
    const { data: comment } = await supabase
      .from("question_comments")
      .select("user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }

    // 권한 확인: 삭제는 본인 또는 관리자, 핀은 관리자만
    const isOwner = comment.user_id === auth.userId;
    const admin = isAdmin(auth.userId);

    if (action === "delete" && !isOwner && !admin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if ((action === "pin" || action === "unpin") && !admin) {
      return NextResponse.json({ error: "관리자만 고정할 수 있습니다." }, { status: 403 });
    }

    const updateData =
      action === "delete"
        ? { is_deleted: true, updated_at: new Date().toISOString() }
        : { is_pinned: action === "pin", updated_at: new Date().toISOString() };

    await supabase
      .from("question_comments")
      .update(updateData)
      .eq("id", commentId);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }
    console.error("[COMMENTS] PATCH Error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
