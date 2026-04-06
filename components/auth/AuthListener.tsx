"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { loadUserDataFromDB } from "@/lib/syncEngine";
import type { ReviewCard, ReviewSchedule } from "@/lib/spacedRepetition";

const STORAGE_KEY = "jt_review_schedule";

/**
 * DB의 spaced_repetition_cards -> localStorage jt_review_schedule 형식으로 변환
 */
function syncCardsToLocalStorage(
  dbCards: { questionNo: number; nextReviewDate: string; intervalDays: number; easeFactor: number; repetitionCount: number; lastReviewDate: string | null }[],
) {
  if (typeof window === "undefined" || dbCards.length === 0) return;

  const cards: ReviewCard[] = dbCards.map((c) => ({
    questionNo: c.questionNo,
    nextReviewDate: c.nextReviewDate,
    intervalDays: c.intervalDays,
    easeFactor: c.easeFactor,
    repetitionCount: c.repetitionCount,
    lastReviewDate: c.lastReviewDate ?? c.nextReviewDate,
  }));

  // 기존 localStorage 카드와 병합 (DB 카드 우선)
  let existing: ReviewCard[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReviewSchedule;
      if (Array.isArray(parsed.cards)) {
        existing = parsed.cards;
      }
    }
  } catch {
    // ignore
  }

  // DB 카드의 questionNo Set
  const dbNos = new Set(cards.map((c) => c.questionNo));

  // 로컬에만 있는 카드는 유지, DB에도 있는 카드는 DB 버전 우선
  const merged = [
    ...cards,
    ...existing.filter((c) => !dbNos.has(c.questionNo)),
  ];

  const schedule: ReviewSchedule = {
    cards: merged,
    lastUpdated: new Date().toISOString().slice(0, 10),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

/**
 * 전역 Auth 리스너 — Supabase 클라이언트를 초기화하여
 * URL hash의 토큰을 어떤 페이지에서든 감지.
 * 로그인 시 DB -> localStorage 크로스 디바이스 동기화 수행.
 */
export default function AuthListener() {
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // getSession()이 URL hash 토큰 자동 감지를 트리거
    supabase.auth.getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          // 로그인 시 DB에서 복습 카드 로드 -> localStorage 동기화
          loadUserDataFromDB(session.user.id).then((syncData) => {
            if (syncData && syncData.reviewCards.length > 0) {
              syncCardsToLocalStorage(syncData.reviewCards);
            }
          });
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
