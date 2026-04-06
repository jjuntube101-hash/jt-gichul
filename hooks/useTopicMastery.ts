"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getSupabase } from "@/lib/supabase";
import { loadAllQuestions } from "@/lib/questions";
import type { Question } from "@/types/question";

export interface TopicMastery {
  law: string;
  topic: string;
  total: number;
  correct: number;
  accuracy: number; // 0~100
  level: "none" | "red" | "yellow" | "green" | "gold";
}

export interface LawMastery {
  law: string;
  topics: TopicMastery[];
  totalSolved: number;
  totalAvailable: number;
  avgAccuracy: number;
}

function getLevel(accuracy: number, total: number): TopicMastery["level"] {
  if (total === 0) return "none";
  if (accuracy < 50) return "red";
  if (accuracy < 70) return "yellow";
  if (accuracy < 90) return "green";
  return "gold";
}

export function useTopicMastery() {
  const { user } = useAuth();
  const [data, setData] = useState<LawMastery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      const supabase = getSupabase();
      if (!supabase || !user) {
        setLoading(false);
        return;
      }

      try {
        const { data: records } = await supabase
          .from("solve_records")
          .select("question_no, is_correct")
          .eq("user_id", user.id);

        const allQ = await loadAllQuestions();

        // 전체 토픽 구조 구축
        const topicAvailable = new Map<string, number>();
        for (const q of allQ) {
          const key = `${q.대분류}|${q.중분류}`;
          topicAvailable.set(key, (topicAvailable.get(key) ?? 0) + 1);
        }

        // 풀이 기록 집계
        const qMap = new Map<number, Question>();
        for (const q of allQ) qMap.set(q.no, q);

        const topicStats = new Map<string, { total: number; correct: number }>();
        if (records) {
          for (const r of records) {
            const q = qMap.get(r.question_no);
            if (!q) continue;
            const key = `${q.대분류}|${q.중분류}`;
            const s = topicStats.get(key) ?? { total: 0, correct: 0 };
            s.total++;
            if (r.is_correct) s.correct++;
            topicStats.set(key, s);
          }
        }

        // LawMastery 구축
        const lawMap = new Map<string, TopicMastery[]>();
        for (const [key, available] of topicAvailable) {
          const [law, topic] = key.split("|");
          const s = topicStats.get(key) ?? { total: 0, correct: 0 };
          const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;

          if (!lawMap.has(law)) lawMap.set(law, []);
          lawMap.get(law)!.push({
            law,
            topic,
            total: s.total,
            correct: s.correct,
            accuracy,
            level: getLevel(accuracy, s.total),
          });
        }

        const result: LawMastery[] = Array.from(lawMap.entries()).map(([law, topics]) => {
          const totalSolved = topics.reduce((sum, t) => sum + t.total, 0);
          const totalCorrect = topics.reduce((sum, t) => sum + t.correct, 0);
          const totalAvailable = topics.reduce(
            (sum, t) => sum + (topicAvailable.get(`${law}|${t.topic}`) ?? 0),
            0
          );
          return {
            law,
            topics,
            totalSolved,
            totalAvailable,
            avgAccuracy: totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0,
          };
        });

        setData(result);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  return { data, loading };
}
