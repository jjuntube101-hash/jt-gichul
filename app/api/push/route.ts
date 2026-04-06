import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPushMessage, isNotificationHour, type MessageType, type MessageContext } from "@/lib/pushMessages";

// web-push는 서버에서만 사용
// npm install web-push 필요
let webpush: typeof import("web-push") | null = null;

async function getWebPush() {
  if (!webpush) {
    webpush = await import("web-push");
    webpush.setVapidDetails(
      "mailto:admin@jttax.co.kr",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
  }
  return webpush;
}

/**
 * POST /api/push
 * Body: { type: MessageType, userId?: string, context?: MessageContext }
 * Header: Authorization: Bearer <PUSH_API_KEY>
 *
 * Vercel Cron이나 관리자가 호출하여 푸시 발송
 */
export async function POST(req: NextRequest) {
  // API Key 검증
  const authHeader = req.headers.get("authorization");
  const apiKey = process.env.PUSH_API_KEY;
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 알림 시간 체크
  if (!isNotificationHour()) {
    return NextResponse.json({ error: "Outside notification hours (KST 07~22)" }, { status: 200 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { type, userId, context } = body as {
    type: MessageType;
    userId?: string;
    context?: MessageContext;
  };

  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 대상 구독 조회
  let query = supabase.from("push_subscriptions").select("*");
  if (userId) {
    query = query.eq("user_id", userId);
  }
  const { data: subs } = await query;

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscriptions found" });
  }

  const wp = await getWebPush();
  const message = buildPushMessage(type, context ?? {});

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        },
        JSON.stringify({
          title: message.title,
          body: message.body,
          tag: message.tag,
          data: message.data,
          icon: "/icons/icon-192x192.png",
        })
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      // 만료된 구독 정리
      if (err && typeof err === "object" && "statusCode" in err) {
        const statusCode = (err as { statusCode: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ sent, failed, total: subs.length });
}
