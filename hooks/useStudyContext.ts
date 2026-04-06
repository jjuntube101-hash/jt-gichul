"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { loadAllQuestions } from "@/lib/questions";
import type { Question } from "@/types/question";

interface ResumeOX {
  currentIndex: number;
  total: number;
  accuracy: number;
  taxScope: string;
}

interface ResumeTimer {
  questionsCount: number;
  answeredCount: number;
}

interface WrongItem {
  law: string;
  count: number;
}

interface WeakLaw {
  law: string;
  accuracy: number;
  total: number;
}

export interface StudyContext {
  resumeOX: ResumeOX | null;
  resumeTimer: ResumeTimer | null;
  yesterdayWrong: WrongItem[];
  weakestLaw: WeakLaw | null;
  loading: boolean;
}

const OX_SESSION_KEY = "jt_ox_session";
const TIMER_RESULT_KEY = "jt-timer-result";

export function useStudyContext(): StudyContext {
  const { user } = useAuth();
  const [ctx, setCtx] = useState<StudyContext>({
    resumeOX: null,
    resumeTimer: null,
    yesterdayWrong: [],
    weakestLaw: null,
    loading: true,
  });

  useEffect(() => {
    async function gather() {
      // 1. OX 세션 복원
      let resumeOX: ResumeOX | null = null;
      try {
        const saved = sessionStorage.getItem(OX_SESSION_KEY);
        if (saved) {
          const s = JSON.parse(saved);
          const total = s.shuffleOrder?.length ?? 0;
          const done = s.stats?.correct + s.stats?.wrong;
          if (total > 0 && s.currentIndex < total) {
            resumeOX = {
              currentIndex: s.currentIndex,
              total,
              accuracy: done > 0 ? Math.round((s.stats.correct / done) * 100) : 0,
              taxScope: s.taxScope || "all",
            };
          }
        }
      } catch { /* ignore */ }

      // 2. Timer 결과 복원
      let resumeTimer: ResumeTimer | null = null;
      try {
        const saved = sessionStorage.getItem(TIMER_RESULT_KEY);
        if (saved) {
          const s = JSON.parse(saved);
          if (s.questions?.length > 0) {
            resumeTimer = {
              questionsCount: s.questions.length,
              answeredCount: s.answers?.length ?? 0,
            };
          }
        }
      } catch { /* ignore */ }

      // 3. 어제 틀린 문항 + 약점 과목 (로그인 유저만)
      let yesterdayWrong: WrongItem[] = [];
      let weakestLaw: WeakLaw | null = null;

      if (user) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            // 어제 날짜
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().slice(0, 10);
            const todayStr = new Date().toISOString().slice(0, 10);

            const { data: wrongRecords } = await supabase
              .from("solve_records")
              .select("question_no")
              .eq("user_id", user.id)
              .eq("is_correct", false)
              .gte("created_at", yStr)
              .lt("created_at", todayStr);

            if (wrongRecords && wrongRecords.length > 0) {
              const allQ = await loadAllQuestions();
              const qMap = new Map<number, Question>();
              for (const q of allQ) qMap.set(q.no, q);

              // 중복 제거 후 과목별 그룹
              const wrongNos = [...new Set(wrongRecords.map(r => r.question_no))];
              const lawCount = new Map<string, number>();
              for (const no of wrongNos) {
                const q = qMap.get(no);
                if (q) {
                  lawCount.set(q.대분류, (lawCount.get(q.대분류) ?? 0) + 1);
                }
              }
              yesterdayWrong = Array.from(lawCount.entries())
                .map(([law, count]) => ({ law, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);
            }

            // 약점 과목 (전체 기록)
            const { data: allRecords } = await supabase
              .from("solve_records")
              .select("question_no, is_correct")
              .eq("user_id", user.id);

            if (allRecords && allRecords.length >= 5) {
              const allQ = await loadAllQuestions();
              const qMap = new Map<number, Question>();
              for (const q of allQ) qMap.set(q.no, q);

              const lawMap = new Map<string, { total: number; correct: number }>();
              for (const r of allRecords) {
                const q = qMap.get(r.question_no);
                if (!q) continue;
                const s = lawMap.get(q.대분류) ?? { total: 0, correct: 0 };
                s.total++;
                if (r.is_correct) s.correct++;
                lawMap.set(q.대분류, s);
              }

              // 5문항 이상 풀고 가장 낮은 정답률
              const candidates = Array.from(lawMap.entries())
                .filter(([, s]) => s.total >= 5)
                .map(([law, s]) => ({
                  law,
                  total: s.total,
                  accuracy: Math.round((s.correct / s.total) * 100),
                }))
                .sort((a, b) => a.accuracy - b.accuracy);

              if (candidates.length > 0 && candidates[0].accuracy < 80) {
                weakestLaw = candidates[0];
              }
            }
          } catch { /* ignore */ }
        }
      }

      setCtx({ resumeOX, resumeTimer, yesterdayWrong, weakestLaw, loading: false });
    }

    gather();
  }, [user]);

  return ctx;
}
