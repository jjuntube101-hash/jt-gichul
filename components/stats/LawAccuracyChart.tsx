"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { loadAllQuestions } from "@/lib/questions";
import type { Question } from "@/types/question";
import { AlertTriangle, TrendingDown } from "lucide-react";

interface LawStat {
  law: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface TopicStat {
  law: string;
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
}

export default function LawAccuracyChart() {
  const { user } = useAuth();
  const [lawStats, setLawStats] = useState<LawStat[]>([]);
  const [weakTopics, setWeakTopics] = useState<TopicStat[]>([]);
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
        // 풀이 기록 가져오기
        const { data: records } = await supabase
          .from("solve_records")
          .select("question_no, is_correct")
          .eq("user_id", user.id);

        if (!records || records.length === 0) {
          setLoading(false);
          return;
        }

        // 문항 데이터 로드
        const allQ = await loadAllQuestions();
        const qMap = new Map<number, Question>();
        for (const q of allQ) qMap.set(q.no, q);

        // 과목별 집계
        const lawMap = new Map<string, { total: number; correct: number }>();
        const topicMap = new Map<string, { law: string; topic: string; total: number; correct: number }>();

        for (const r of records) {
          const q = qMap.get(r.question_no);
          if (!q) continue;

          // 과목별
          const law = q.대분류;
          const ls = lawMap.get(law) ?? { total: 0, correct: 0 };
          ls.total++;
          if (r.is_correct) ls.correct++;
          lawMap.set(law, ls);

          // 단원별
          const topicKey = `${law}|${q.중분류}`;
          const ts = topicMap.get(topicKey) ?? { law, topic: q.중분류, total: 0, correct: 0 };
          ts.total++;
          if (r.is_correct) ts.correct++;
          topicMap.set(topicKey, ts);
        }

        // 과목별 정답률 계산 + 정렬
        const stats = Array.from(lawMap.entries())
          .map(([law, s]) => ({
            law,
            total: s.total,
            correct: s.correct,
            accuracy: Math.round((s.correct / s.total) * 100),
          }))
          .sort((a, b) => b.total - a.total);

        setLawStats(stats);

        // 취약 단원 (3문항 이상 풀고 정답률 60% 미만)
        const weak = Array.from(topicMap.values())
          .filter((t) => t.total >= 3)
          .map((t) => ({
            ...t,
            accuracy: Math.round((t.correct / t.total) * 100),
          }))
          .filter((t) => t.accuracy < 60)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 5);

        setWeakTopics(weak);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 flex-1 rounded bg-muted" />
            <div className="h-3 w-8 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (lawStats.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        문제를 풀면 과목별 정답률이 표시됩니다.
      </p>
    );
  }

  const maxTotal = Math.max(...lawStats.map((s) => s.total));

  return (
    <div className="space-y-5">
      {/* 과목별 정답률 */}
      <div className="space-y-2.5">
        {lawStats.map((stat, idx) => (
          <motion.div
            key={stat.law}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-card-foreground truncate max-w-[120px]">
                {stat.law}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{stat.total}문</span>
                <span
                  className={`font-bold ${
                    stat.accuracy >= 70
                      ? "text-success"
                      : stat.accuracy >= 50
                      ? "text-warning"
                      : "text-danger"
                  }`}
                >
                  {stat.accuracy}%
                </span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  stat.accuracy >= 70
                    ? "bg-success"
                    : stat.accuracy >= 50
                    ? "bg-warning"
                    : "bg-danger"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${stat.accuracy}%` }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 취약 단원 */}
      {weakTopics.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-danger mb-2">
            <TrendingDown className="h-3.5 w-3.5" />
            취약 단원 (정답률 60% 미만)
          </h3>
          <div className="space-y-1.5">
            {weakTopics.map((t) => (
              <div
                key={`${t.law}|${t.topic}`}
                className="flex items-center gap-2 rounded-lg bg-danger-light px-3 py-2"
              >
                <AlertTriangle className="h-3 w-3 text-danger shrink-0" />
                <span className="text-xs text-card-foreground flex-1 truncate">
                  {t.law} &gt; {t.topic}
                </span>
                <span className="text-xs font-bold text-danger">{t.accuracy}%</span>
                <span className="text-[10px] text-danger/60">{t.total}문</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
