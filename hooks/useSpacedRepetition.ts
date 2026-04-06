"use client";

import { useEffect, useState, useCallback } from "react";
import {
  loadReviewSchedule,
  addToReview as addToReviewLib,
  getTodayReviewCards,
  getUpcomingCards,
  markReviewed as markReviewedLib,
  getReviewStats,
  type ReviewCard,
} from "@/lib/spacedRepetition";

interface ReviewStats {
  todayDue: number;
  totalCards: number;
  masteredCards: number;
}

const DEFAULT_STATS: ReviewStats = {
  todayDue: 0,
  totalCards: 0,
  masteredCards: 0,
};

export function useSpacedRepetition() {
  const [todayCards, setTodayCards] = useState<ReviewCard[]>([]);
  const [upcomingCards, setUpcomingCards] = useState<ReviewCard[]>([]);
  const [stats, setStats] = useState<ReviewStats>(DEFAULT_STATS);

  /** localStorage에서 최신 데이터를 다시 읽기 */
  const refresh = useCallback(() => {
    setTodayCards(getTodayReviewCards());
    setUpcomingCards(getUpcomingCards(7));
    setStats(getReviewStats());
  }, []);

  /** 틀린 문제를 복습 스케줄에 추가 */
  const addToReview = useCallback(
    (questionNo: number) => {
      addToReviewLib(questionNo);
      refresh();
    },
    [refresh]
  );

  /** 복습 결과 반영 (정답/오답) */
  const markReviewed = useCallback(
    (questionNo: number, isCorrect: boolean) => {
      markReviewedLib(questionNo, isCorrect);
      refresh();
    },
    [refresh]
  );

  // 마운트 시 자동 로드
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    todayCards,
    upcomingCards,
    stats,
    addToReview,
    markReviewed,
    refresh,
  };
}
