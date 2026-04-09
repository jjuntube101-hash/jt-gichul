"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, ExternalLink, Pin, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import MonthlyPlanCard from "@/components/class/MonthlyPlanCard";
import WeeklyPlanCard from "@/components/class/WeeklyPlanCard";
import DailyPlanCard from "@/components/class/DailyPlanCard";
import PredictedScoreCard from "@/components/class/PredictedScoreCard";
import type { MonthPlan, WeekPlan, DailyPlan } from "@/lib/dailyPlanEngine";
import type { PredictedScore } from "@/lib/predictScoreEngine";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  is_pinned: boolean;
  created_at: string;
}

export default function ClassHomePage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [monthPlan, setMonthPlan] = useState<MonthPlan | null>(null);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [prediction, setPrediction] = useState<PredictedScore | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async () => {
    const supabase = getSupabase();
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    return session?.access_token ?? null;
  }, []);

  useEffect(() => {
    async function loadAll() {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // 병렬 호출
      const [annRes, monthRes, weekRes, dailyRes, predRes] = await Promise.allSettled([
        fetch("/api/announce", { headers }),
        fetch("/api/class/monthly-plan", { headers }),
        fetch("/api/class/weekly-plan", { headers }),
        fetch("/api/class/daily-plan", { headers }),
        fetch("/api/class/predict-score", { headers }),
      ]);

      // 공지
      if (annRes.status === "fulfilled" && annRes.value.ok) {
        const data = await annRes.value.json();
        setAnnouncements(data.announcements ?? []);
      }

      // 월간 플랜
      if (monthRes.status === "fulfilled" && monthRes.value.ok) {
        const data = await monthRes.value.json();
        setMonthPlan(data.plan);
      }

      // 주간 플랜
      if (weekRes.status === "fulfilled" && weekRes.value.ok) {
        const data = await weekRes.value.json();
        setWeekPlan(data.plan);
      }

      // 일일 플랜
      if (dailyRes.status === "fulfilled" && dailyRes.value.ok) {
        const data = await dailyRes.value.json();
        setDailyPlan(data.plan);
      }

      // 합격 예측
      if (predRes.status === "fulfilled" && predRes.value.ok) {
        const data = await predRes.value.json();
        setPrediction(data.prediction);
      }

      setLoading(false);
    }

    loadAll();
  }, [user, getToken]);

  const adminUser = user?.id ? isAdmin(user.id) : false;

  return (
    <div className="space-y-4">
      {/* 월간 플랜 */}
      <MonthlyPlanCard plan={monthPlan} loading={loading} />

      {/* 주간 플랜 */}
      <WeeklyPlanCard plan={weekPlan} loading={loading} />

      {/* 일일 미션 */}
      <DailyPlanCard plan={dailyPlan} loading={loading} />

      {/* 합격 예측 */}
      <PredictedScoreCard prediction={prediction} loading={loading} />

      {/* 공지사항 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">공지사항</span>
          </div>
          {adminUser && (
            <a
              href="/class/announce/new"
              className="flex items-center gap-1 text-xs text-primary font-medium"
            >
              <Plus className="h-3 w-3" />
              공지 작성
            </a>
          )}
        </div>

        {announcements.length === 0 && !loading ? (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">아직 공지사항이 없습니다.</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <article
              key={ann.id}
              className={`rounded-xl border bg-card p-4 transition-colors ${
                ann.is_pinned ? "border-primary/30 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-start gap-2">
                {ann.is_pinned && (
                  <Pin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{ann.title}</h3>
                  {ann.body && (
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {ann.body}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <time className="text-[10px] text-muted-foreground">
                      {new Date(ann.created_at).toLocaleDateString("ko-KR")}
                    </time>
                    {ann.link_url && (
                      <a
                        href={ann.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {ann.link_label || "자료 다운로드"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
