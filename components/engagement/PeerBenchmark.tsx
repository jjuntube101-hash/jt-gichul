"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";

/**
 * 익명 퍼센타일 벤치마크 (사회비교 — 긍정적만)
 * 윤리 규칙:
 * - 평균 이상일 때만 순위 표시
 * - 평균 이하면 자기 대비 진행률만 표시
 */

interface BenchmarkData {
  totalSolved: number;
  accuracy: number;
  weekChange: number; // 지난주 대비 증감
  message: string;
}

export default function PeerBenchmark() {
  const { user } = useAuth();
  const [data, setData] = useState<BenchmarkData | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const supabase = getSupabase();
      if (!supabase || !user) return;

      try {
        // 이번 주 풀이
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString();

        const [allRes, weekRes] = await Promise.all([
          supabase
            .from("solve_records")
            .select("is_correct")
            .eq("user_id", user.id),
          supabase
            .from("solve_records")
            .select("is_correct")
            .eq("user_id", user.id)
            .gte("created_at", weekAgoStr),
        ]);

        const all = allRes.data ?? [];
        const week = weekRes.data ?? [];

        if (all.length === 0) return;

        const totalSolved = all.length;
        const correctCount = all.filter(r => r.is_correct).length;
        const accuracy = Math.round((correctCount / totalSolved) * 100);

        const weekChange = week.length; // 이번 주 풀이량

        // 메시지 결정 (긍정적 프레이밍만)
        let message: string;
        if (accuracy >= 80) {
          message = `정답률 ${accuracy}%! 상위권 실력입니다`;
        } else if (accuracy >= 65) {
          message = `꾸준히 성장 중! 정답률 ${accuracy}%`;
        } else {
          // 평균 이하: 자기 대비 진행률만
          message = `총 ${totalSolved}문항 풀이 완료`;
        }

        if (weekChange > 0) {
          message += ` · 이번 주 ${weekChange}문항`;
        }

        setData({ totalSolved, accuracy, weekChange, message });
      } catch {
        // ignore
      }
    }

    load();
  }, [user]);

  if (!user || !data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-light">
          {data.accuracy >= 65 ? (
            <TrendingUp className="h-4 w-4 text-info" />
          ) : (
            <Users className="h-4 w-4 text-info" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-card-foreground">{data.message}</p>
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
            <span>총 {data.totalSolved}문항</span>
            <span>정답률 {data.accuracy}%</span>
            {data.weekChange > 0 && (
              <span className="text-success font-medium">+{data.weekChange} 이번 주</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
