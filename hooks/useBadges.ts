"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { checkEarnableBadges, type BadgeCheckInput } from "@/lib/badges";

export function useBadges() {
  const { user } = useAuth();
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 기존 뱃지 로드
  useEffect(() => {
    if (!user) {
      setEarnedIds(new Set());
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from("user_badges")
          .select("badge_id")
          .eq("user_id", user.id);
        setEarnedIds(new Set((data ?? []).map((d) => d.badge_id)));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // 뱃지 체크 & 부여
  const checkAndAward = useCallback(
    async (input: BadgeCheckInput) => {
      if (!user) return [];
      const supabase = getSupabase();
      if (!supabase) return [];

      const newlyEarned = checkEarnableBadges(input, earnedIds);
      if (newlyEarned.length === 0) return [];

      // DB에 저장
      const rows = newlyEarned.map((badgeId) => ({
        user_id: user.id,
        badge_id: badgeId,
      }));

      await supabase.from("user_badges").upsert(rows, {
        onConflict: "user_id,badge_id",
      });

      // 상태 업데이트
      setEarnedIds((prev) => {
        const next = new Set(prev);
        for (const id of newlyEarned) next.add(id);
        return next;
      });

      setNewBadges(newlyEarned);
      return newlyEarned;
    },
    [user, earnedIds]
  );

  // 새 뱃지 알림 닫기
  const dismissNewBadges = useCallback(() => {
    setNewBadges([]);
  }, []);

  return { earnedIds, newBadges, loading, checkAndAward, dismissNewBadges };
}
