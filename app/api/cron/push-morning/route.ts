import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPushMessage } from "@/lib/pushMessages";

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
 * 아침 푸시 (KST 07시 = UTC 22시)
 * Vercel Cron: 0 22 * * *
 * 어제 틀린 문항이 있는 사용자에게 복습 알림
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const wp = await getWebPush();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: wrongRecords } = await supabase
    .from("solve_records")
    .select("user_id")
    .eq("is_correct", false)
    .gte("created_at", `${yesterdayStr}T00:00:00`)
    .lt("created_at", `${todayStr}T00:00:00`);

  const userIds = [...new Set((wrongRecords ?? []).map(r => r.user_id))];

  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0, message: "No users with wrong answers yesterday" });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscribed users" });
  }

  const message = buildPushMessage("morning_review", {});
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
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
      if (err && typeof err === "object" && "statusCode" in err) {
        const code = (err as { statusCode: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ sent, failed, total: subs.length });
}
