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
 * 저녁 푸시 (KST 18시 = UTC 09시)
 * Vercel Cron: 0 9 * * *
 * 오늘 아직 안 푼 사용자에게 스트릭 위험 알림
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

  const today = new Date().toISOString().slice(0, 10);

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, current_streak, last_solve_date")
    .gt("current_streak", 0)
    .neq("last_solve_date", today);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, message: "No at-risk streaks" });
  }

  const userIds = profiles.map(p => p.user_id);

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscribed users" });
  }

  const profileMap = new Map(profiles.map(p => [p.user_id, p]));
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const profile = profileMap.get(sub.user_id);
    const message = buildPushMessage("streak_risk", {
      streakDays: profile?.current_streak ?? 1,
    });

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
