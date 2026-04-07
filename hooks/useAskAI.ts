"use client";

import { useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AskState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  remaining: number | null;
  isPremium: boolean;
}

const MAX_HISTORY = 10; // 최대 5왕복

export function useAskAI() {
  const [state, setState] = useState<AskState>({
    messages: [],
    isLoading: false,
    error: null,
    remaining: null,
    isPremium: false,
  });

  const sendQuestion = useCallback(async (question: string) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      messages: [
        ...prev.messages,
        { role: "user", content: question, timestamp: Date.now() },
      ],
    }));

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase 미설정");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("로그인이 필요합니다.");

      // 이전 대화를 API에 전달 (최대 10메시지)
      const prevMessages = state.messages.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question, messages: prevMessages }),
      });

      if (res.status === 429) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error || "오늘의 상담 횟수를 모두 사용했습니다."
        );
      }

      if (res.status === 401) {
        throw new Error("로그인이 필요합니다.");
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "상담 중 오류가 발생했습니다.");
      }

      const json = await res.json();
      const answer = json.data?.answer || "답변을 생성하지 못했습니다.";
      const remaining = json.remaining ?? null;
      const isPremium = json.data?.isPremium ?? false;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        remaining,
        isPremium,
        messages: [
          ...prev.messages,
          { role: "assistant", content: answer, timestamp: Date.now() },
        ],
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        // 실패한 user 메시지 제거
        messages: prev.messages.slice(0, -1),
      }));
    }
  }, [state.messages]);

  const clearChat = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      remaining: null,
      isPremium: false,
    });
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    remaining: state.remaining,
    isPremium: state.isPremium,
    sendQuestion,
    clearChat,
  };
}
