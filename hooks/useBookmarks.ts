"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// 북마크 관리 훅 (localStorage 기반)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "jt-gichul-bookmarks";

export interface BookmarkEntry {
  questionNo: number;
  createdAt: string; // ISO string
  memo?: string;
}

function loadBookmarks(): BookmarkEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BookmarkEntry[];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: BookmarkEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

/**
 * 북마크(즐겨찾기) 관리 훅
 *
 * - localStorage 기반 (오프라인 지원, 로그인 불필요)
 * - 토글, 확인, 전체 목록, 개수 제공
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);

  // 초기 로드
  useEffect(() => {
    setBookmarks(loadBookmarks());
  }, []);

  /** 북마크 토글 (있으면 제거, 없으면 추가) */
  const toggleBookmark = useCallback((questionNo: number) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.questionNo === questionNo);
      let next: BookmarkEntry[];
      if (exists) {
        next = prev.filter((b) => b.questionNo !== questionNo);
      } else {
        next = [
          { questionNo, createdAt: new Date().toISOString() },
          ...prev,
        ];
      }
      saveBookmarks(next);
      return next;
    });
  }, []);

  /** 특정 문항이 북마크되어 있는지 확인 */
  const isBookmarked = useCallback(
    (questionNo: number) => bookmarks.some((b) => b.questionNo === questionNo),
    [bookmarks]
  );

  /** 북마크된 문항 번호 Set */
  const bookmarkedNos = new Set(bookmarks.map((b) => b.questionNo));

  /** 특정 문항의 메모 가져오기 */
  const getMemo = useCallback(
    (questionNo: number) => bookmarks.find((b) => b.questionNo === questionNo)?.memo ?? "",
    [bookmarks]
  );

  /** 특정 문항 메모 저장 (빈 문자열이면 메모 삭제) */
  const setMemo = useCallback((questionNo: number, memo: string) => {
    setBookmarks((prev) => {
      const trimmed = memo.trim();
      const idx = prev.findIndex((b) => b.questionNo === questionNo);

      let next: BookmarkEntry[];
      if (idx >= 0) {
        // 이미 북마크됨 → 메모만 업데이트
        next = [...prev];
        next[idx] = { ...next[idx], memo: trimmed || undefined };
      } else if (trimmed) {
        // 북마크 안 됐지만 메모 있으면 → 자동 북마크 + 메모
        next = [
          { questionNo, createdAt: new Date().toISOString(), memo: trimmed },
          ...prev,
        ];
      } else {
        return prev; // 변경 없음
      }
      saveBookmarks(next);
      return next;
    });
  }, []);

  return {
    bookmarks,
    bookmarkedNos,
    toggleBookmark,
    isBookmarked,
    getMemo,
    setMemo,
    count: bookmarks.length,
  };
}
