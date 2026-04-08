/**
 * 수강 코드 입력 API
 * POST /api/enroll
 *
 * 1인 1코드: 코드 유효성 검증 → is_premium 활성화 → enrollment_logs 기록
 * 원자적 업데이트로 race condition 방지
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrollSchema } from "@/lib/apiSchemas";
import { authenticateUser, getServiceSupabase } from "@/lib/apiAuth";

export async function POST(request: NextRequest) {
  try {
    // 1) 인증
    const auth = await authenticateUser(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const supabase = getServiceSupabase();

    // 2) 이미 premium인지 확인
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_premium, premium_expires_at")
      .eq("user_id", auth.userId)
      .single();

    if (profile?.is_premium) {
      const expiresAt = profile.premium_expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
      if (!isExpired) {
        return NextResponse.json(
          { error: "이미 수강생으로 등록되어 있습니다." },
          { status: 409 }
        );
      }
    }

    // 3) 바디 파싱
    const rawBody = await request.json();
    const { code } = enrollSchema.parse(rawBody);

    // 4) 코드 먼저 조회하여 만료 확인 (C1 해결: 만료 체크를 UPDATE 전에)
    const { data: codeCheck } = await supabase
      .from("enrollment_codes")
      .select("code, expires_at, is_active, used_count")
      .eq("code", code)
      .single();

    if (!codeCheck || !codeCheck.is_active) {
      return NextResponse.json(
        { error: "유효하지 않은 코드입니다." },
        { status: 400 }
      );
    }

    if (codeCheck.expires_at && new Date(codeCheck.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "만료된 코드입니다." },
        { status: 400 }
      );
    }

    if (codeCheck.used_count >= 1) {
      return NextResponse.json(
        { error: "이미 사용된 코드입니다." },
        { status: 400 }
      );
    }

    // 5) 원자적 사용 처리 (race condition 방지)
    const { data: codeData, error: codeError } = await supabase
      .from("enrollment_codes")
      .update({
        used_count: 1,
        used_by: auth.userId,
      })
      .eq("code", code)
      .eq("is_active", true)
      .lt("used_count", 1)
      .select("code, premium_days")
      .single();

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: "코드 사용에 실패했습니다. 다시 시도해주세요." },
        { status: 409 }
      );
    }

    // 6) premium 활성화
    const premiumDays = codeData.premium_days ?? 180;
    const premiumExpiresAt = new Date();
    premiumExpiresAt.setDate(premiumExpiresAt.getDate() + premiumDays);

    await supabase
      .from("user_profiles")
      .update({
        is_premium: true,
        premium_expires_at: premiumExpiresAt.toISOString(),
      })
      .eq("user_id", auth.userId);

    // 7) 등록 로그
    await supabase.from("enrollment_logs").insert({
      user_id: auth.userId,
      code,
      source: "enrollment_code",
    });

    console.log(
      `[ENROLL] user=${auth.userId} code=${code} premium_days=${premiumDays}`
    );

    return NextResponse.json({
      success: true,
      premiumExpiresAt: premiumExpiresAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "올바른 코드를 입력해주세요.", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[ENROLL] Error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
